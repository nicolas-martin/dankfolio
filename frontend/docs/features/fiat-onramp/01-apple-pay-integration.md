# Apple Pay Integration Guide

## Overview

This guide covers the implementation of Apple Pay for fiat-to-crypto purchases in Dankfolio using React Native, Expo, and TypeScript. Our approach uses Stripe as the initial payment processor while maintaining a generic architecture to support additional providers in the future.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Technical Stack](#technical-stack)
3. [Apple Developer Setup](#apple-developer-setup)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Integration](#backend-integration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

## Prerequisites

- Expo development build (Apple Pay is not supported in Expo Go)
- Apple Developer account with Apple Pay enabled
- Stripe account with Apple Pay configured
- iOS device or simulator running iOS 11.0+
- Valid SSL certificate for your backend

## Technical Stack

### Frontend
- **React Native** with **Expo** (SDK 53+)
- **TypeScript** for type safety
- **@stripe/stripe-react-native** for Apple Pay integration
- **Zustand** for state management

### Backend
- **Go** with gRPC
- **Stripe Go SDK** for payment processing
- **PostgreSQL** for transaction storage
- **Redis** for session management

## Apple Developer Setup

### 1. Create Merchant Identifier

1. Log in to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to Certificates, Identifiers & Profiles
3. Select Identifiers → Add (+) → Merchant IDs
4. Enter a merchant identifier (e.g., `merchant.com.dankfolio.app`)
5. Add description and click Continue

### 2. Configure Apple Pay Capability

1. In your app's identifier settings
2. Enable "Apple Pay Payment Processing"
3. Select your merchant identifier
4. Save changes

### 3. Create Payment Processing Certificate

```bash
# Generate CSR using Stripe Dashboard
# 1. Go to Stripe Dashboard → Settings → Apple Pay
# 2. Click "Add new domain"
# 3. Download the CSR file
# 4. Upload to Apple Developer Portal
# 5. Download certificate and upload back to Stripe
```

## Frontend Implementation

### 1. Install Dependencies

```bash
cd frontend
yarn add @stripe/stripe-react-native
```

### 2. Configure Expo Plugin

Update `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@stripe/stripe-react-native",
        {
          "merchantIdentifier": "merchant.com.dankfolio.app",
          "enableApplePay": true
        }
      ]
    ]
  }
}
```

### 3. Create Payment Types

Create `frontend/src/types/payment.ts`:

```typescript
export interface PaymentProvider {
  id: string;
  name: string;
  type: 'stripe' | 'moonpay' | 'ramp' | 'transak';
  enabled: boolean;
}

export interface PaymentRequest {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  cryptoCurrency: string;
  cryptoAmount: number;
  walletAddress: string;
  provider: PaymentProvider;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  provider: string;
}

export interface ApplePayConfig {
  merchantIdentifier: string;
  merchantName: string;
  countryCode: string;
  currencyCode: string;
  supportedNetworks: string[];
}
```

### 4. Create Apple Pay Service

Create `frontend/src/services/applePayService.ts`:

```typescript
import { StripeProvider, useApplePay, useStripe } from '@stripe/stripe-react-native';
import { PaymentRequest, PaymentIntent, ApplePayConfig } from '@/types/payment';
import { grpcClient } from '@/services/grpcApi';
import { logger } from '@/utils/logger';

const APPLE_PAY_CONFIG: ApplePayConfig = {
  merchantIdentifier: 'merchant.com.dankfolio.app',
  merchantName: 'Dankfolio',
  countryCode: 'US',
  currencyCode: 'USD',
  supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
};

export class ApplePayService {
  static async isSupported(): Promise<boolean> {
    try {
      const { isApplePaySupported } = useApplePay();
      return isApplePaySupported;
    } catch (error) {
      logger.error('Error checking Apple Pay support', { error });
      return false;
    }
  }

  static async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent> {
    try {
      const response = await grpcClient.paymentService.createPaymentIntent({
        amount: request.amount,
        currency: request.currency,
        cryptoCurrency: request.cryptoCurrency,
        cryptoAmount: request.cryptoAmount,
        walletAddress: request.walletAddress,
        provider: 'stripe',
        paymentMethod: 'apple_pay',
      });

      return {
        id: response.paymentIntentId,
        clientSecret: response.clientSecret,
        amount: response.amount,
        currency: response.currency,
        status: 'pending',
        provider: 'stripe',
      };
    } catch (error) {
      logger.error('Failed to create payment intent', { error });
      throw error;
    }
  }

  static async confirmPayment(
    clientSecret: string,
    amount: number,
    onSuccess: (transactionId: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const { presentApplePay, confirmApplePayPayment } = useApplePay();
    
    try {
      // Present Apple Pay sheet
      const { error: presentError } = await presentApplePay({
        cartItems: [
          {
            label: 'Crypto Purchase',
            amount: amount.toString(),
            paymentType: 'immediate',
          },
        ],
        country: APPLE_PAY_CONFIG.countryCode,
        currency: APPLE_PAY_CONFIG.currencyCode,
        requiredShippingAddressFields: [],
        requiredBillingContactFields: ['emailAddress'],
      });

      if (presentError) {
        throw new Error(presentError.message);
      }

      // Confirm payment with Stripe
      const { error: confirmError } = await confirmApplePayPayment(clientSecret);

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Notify backend of successful payment
      const response = await grpcClient.paymentService.confirmPayment({
        paymentIntentId: clientSecret,
        status: 'succeeded',
      });

      onSuccess(response.transactionId);
    } catch (error) {
      logger.error('Apple Pay payment failed', { error });
      onError(error as Error);
    }
  }
}
```

### 5. Create Apple Pay Button Component

Create `frontend/src/components/Payment/ApplePayButton/index.tsx`:

```typescript
import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { ApplePayButton as NativeApplePayButton } from '@stripe/stripe-react-native';
import { useStyles } from './styles';
import { ApplePayService } from '@/services/applePayService';
import { PaymentRequest } from '@/types/payment';
import { usePortfolioStore } from '@/store/portfolio';
import { logger } from '@/utils/logger';

interface ApplePayButtonProps {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  cryptoCurrency: string;
  cryptoAmount: number;
  onSuccess: (transactionId: string) => void;
  onError: (error: Error) => void;
}

export const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  amount,
  currency,
  cryptoCurrency,
  cryptoAmount,
  onSuccess,
  onError,
}) => {
  const styles = useStyles();
  const { wallet } = usePortfolioStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplePaySupported, setIsApplePaySupported] = useState(false);

  React.useEffect(() => {
    checkApplePaySupport();
  }, []);

  const checkApplePaySupport = async () => {
    const supported = await ApplePayService.isSupported();
    setIsApplePaySupported(supported);
  };

  const handleApplePayPress = async () => {
    if (!wallet?.address) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    logger.breadcrumb({ 
      category: 'payment', 
      message: 'Apple Pay initiated',
      data: { amount, currency, cryptoCurrency }
    });

    try {
      // Create payment intent
      const paymentIntent = await ApplePayService.createPaymentIntent({
        amount,
        currency,
        cryptoCurrency,
        cryptoAmount,
        walletAddress: wallet.address,
        provider: { id: 'stripe', name: 'Stripe', type: 'stripe', enabled: true },
      });

      // Process payment
      await ApplePayService.confirmPayment(
        paymentIntent.clientSecret,
        amount,
        (transactionId) => {
          logger.info('Apple Pay payment succeeded', { transactionId });
          onSuccess(transactionId);
        },
        (error) => {
          logger.error('Apple Pay payment failed', { error });
          onError(error);
        }
      );
    } catch (error) {
      logger.error('Failed to initiate Apple Pay', { error });
      onError(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isApplePaySupported) {
    return null;
  }

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NativeApplePayButton
        onPress={handleApplePayPress}
        type="buy"
        buttonStyle="black"
        borderRadius={8}
        style={styles.applePayButton}
      />
    </View>
  );
};
```

### 6. Create Purchase Screen

Create `frontend/src/screens/Purchase/index.tsx`:

```typescript
import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Text, Card, TextInput, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ApplePayButton } from '@/components/Payment/ApplePayButton';
import { useStyles } from './styles';
import { calculateCryptoAmount, validatePurchaseAmount } from './scripts';
import { useCoinsStore } from '@/store/coins';
import { logger } from '@/utils/logger';

const CURRENCIES = [
  { value: 'USD', label: '$USD' },
  { value: 'EUR', label: '€EUR' },
  { value: 'GBP', label: '£GBP' },
];

const Purchase = () => {
  const navigation = useNavigation();
  const styles = useStyles();
  const { selectedCoin } = useCoinsStore();
  const [amount, setAmount] = useState('100');
  const [currency, setCurrency] = useState('USD');
  const [cryptoAmount, setCryptoAmount] = useState(0);

  React.useEffect(() => {
    if (selectedCoin && amount) {
      const crypto = calculateCryptoAmount(
        parseFloat(amount),
        selectedCoin.priceUsd,
        currency
      );
      setCryptoAmount(crypto);
    }
  }, [amount, currency, selectedCoin]);

  const handleAmountChange = (value: string) => {
    if (validatePurchaseAmount(value)) {
      setAmount(value);
    }
  };

  const handlePaymentSuccess = (transactionId: string) => {
    logger.info('Payment successful', { transactionId });
    Alert.alert(
      'Success!',
      `Successfully purchased ${cryptoAmount.toFixed(6)} ${selectedCoin?.symbol}`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handlePaymentError = (error: Error) => {
    Alert.alert('Payment Failed', error.message);
  };

  if (!selectedCoin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Title title={`Buy ${selectedCoin.symbol}`} />
          <Card.Content>
            <View style={styles.section}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                mode="outlined"
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                left={<TextInput.Affix text={currency} />}
                style={styles.input}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Currency</Text>
              <SegmentedButtons
                value={currency}
                onValueChange={setCurrency}
                buttons={CURRENCIES}
                style={styles.segmentedButtons}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>You will receive</Text>
              <Text style={styles.cryptoAmount}>
                {cryptoAmount.toFixed(6)} {selectedCoin.symbol}
              </Text>
              <Text style={styles.rate}>
                1 {selectedCoin.symbol} = ${selectedCoin.priceUsd.toFixed(2)}
              </Text>
            </View>

            <View style={styles.paymentSection}>
              <ApplePayButton
                amount={parseFloat(amount)}
                currency={currency as 'USD' | 'EUR' | 'GBP'}
                cryptoCurrency={selectedCoin.mintAddress}
                cryptoAmount={cryptoAmount}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Purchase;
```

## Backend Integration

See [Backend Architecture Documentation](./02-backend-architecture.md) for detailed backend implementation.

## Testing

### 1. Simulator Testing

Apple Pay testing works in the iOS Simulator with test cards:

```typescript
// Test cards for Apple Pay in Simulator
const TEST_CARDS = {
  visa: '4242 4242 4242 4242',
  mastercard: '5555 5555 5555 4444',
  amex: '3782 822463 10005',
};
```

### 2. Device Testing

1. Enable Apple Pay on test device
2. Add test cards to Wallet app
3. Use Stripe test mode
4. Monitor logs for payment flow

### 3. Integration Tests

Create `frontend/src/services/__tests__/applePayService.test.ts`:

```typescript
import { ApplePayService } from '../applePayService';
import { grpcClient } from '@/services/grpcApi';

jest.mock('@/services/grpcApi');
jest.mock('@stripe/stripe-react-native');

describe('ApplePayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const mockResponse = {
        paymentIntentId: 'pi_123',
        clientSecret: 'pi_123_secret',
        amount: 100,
        currency: 'USD',
      };

      (grpcClient.paymentService.createPaymentIntent as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ApplePayService.createPaymentIntent({
        amount: 100,
        currency: 'USD',
        cryptoCurrency: 'SOL',
        cryptoAmount: 0.5,
        walletAddress: 'wallet123',
        provider: { id: 'stripe', name: 'Stripe', type: 'stripe', enabled: true },
      });

      expect(result).toEqual({
        id: 'pi_123',
        clientSecret: 'pi_123_secret',
        amount: 100,
        currency: 'USD',
        status: 'pending',
        provider: 'stripe',
      });
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **"Apple Pay is not available"**
   - Ensure device/simulator has Apple Pay configured
   - Check merchant identifier configuration
   - Verify development build (not Expo Go)

2. **"Payment failed with unknown error"**
   - Check Stripe API keys
   - Verify backend is running
   - Check network connectivity

3. **"Invalid merchant identifier"**
   - Ensure merchant ID matches Apple Developer portal
   - Rebuild the app after config changes

### Debug Logging

Enable verbose logging:

```typescript
// In development
if (__DEV__) {
  logger.setLevel('debug');
}

// Log all Apple Pay events
logger.breadcrumb({
  category: 'apple-pay',
  message: 'Payment flow started',
  level: 'info',
});
```

## Security Considerations

1. **Never store sensitive payment data**
   - Use Stripe tokens only
   - Don't log payment details
   - Clear sensitive data from memory

2. **Validate all inputs**
   - Amount ranges
   - Currency codes
   - Wallet addresses

3. **Use HTTPS everywhere**
   - Backend API
   - Webhook endpoints
   - Asset loading

4. **Implement rate limiting**
   - Prevent abuse
   - Limit payment attempts
   - Monitor suspicious activity

## Next Steps

1. [Backend Architecture](./02-backend-architecture.md) - Implement generic payment provider system
2. [Payment Flow](./03-payment-flow.md) - Understand end-to-end payment processing
3. [Provider Integration](./04-provider-integration.md) - Add additional payment providers

## Resources

- [Apple Pay Programming Guide](https://developer.apple.com/apple-pay/)
- [Stripe Apple Pay Documentation](https://stripe.com/docs/apple-pay)
- [Expo Stripe SDK](https://docs.expo.dev/versions/latest/sdk/stripe/)
- [React Native Payments Spec](https://www.w3.org/TR/payment-request/)