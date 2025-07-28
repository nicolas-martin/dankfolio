# Payment Provider Integration Guide

## Overview

This guide explains how to add new payment providers to Dankfolio's fiat on-ramp system. The architecture is designed to make adding providers straightforward while maintaining consistency and security.

## Provider Interface

All payment providers must implement the `Provider` interface defined in `backend/internal/service/payment/provider.go`:

```go
type Provider interface {
    // Initialize the provider with configuration
    Initialize(config ProviderConfig) error
    
    // Create a payment intent
    CreatePaymentIntent(ctx context.Context, req *PaymentRequest) (*PaymentIntent, error)
    
    // Confirm a payment
    ConfirmPayment(ctx context.Context, paymentIntentID string) (*PaymentResult, error)
    
    // Cancel a payment
    CancelPayment(ctx context.Context, paymentIntentID string) error
    
    // Get payment status
    GetPaymentStatus(ctx context.Context, paymentIntentID string) (*PaymentStatus, error)
    
    // Handle webhooks
    HandleWebhook(ctx context.Context, payload []byte, signature string) (*WebhookEvent, error)
    
    // Get provider capabilities
    GetCapabilities() *ProviderCapabilities
}
```

## Step-by-Step Integration

### 1. Create Provider Package

Create a new package for your provider:

```bash
mkdir -p backend/internal/service/payment/providers/moonpay
```

### 2. Implement Provider Interface

Create `backend/internal/service/payment/providers/moonpay/provider.go`:

```go
package moonpay

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
    
    "github.com/dankfolio/backend/internal/service/payment"
    "github.com/dankfolio/backend/pkg/httpclient"
)

type MoonPayProvider struct {
    apiKey       string
    secretKey    string
    baseURL      string
    httpClient   *httpclient.Client
    capabilities *payment.ProviderCapabilities
}

func NewMoonPayProvider() payment.Provider {
    return &MoonPayProvider{
        baseURL: "https://api.moonpay.com/v3",
        httpClient: httpclient.NewClient(httpclient.Config{
            Timeout:     30 * time.Second,
            MaxRetries:  3,
            RetryDelay:  time.Second,
        }),
        capabilities: &payment.ProviderCapabilities{
            SupportedCurrencies: []string{"USD", "EUR", "GBP", "CAD", "AUD"},
            SupportedMethods:    []string{"card", "bank_transfer", "apple_pay", "google_pay"},
            MinAmount: map[string]float64{
                "USD": 20.0,
                "EUR": 20.0,
                "GBP": 20.0,
            },
            MaxAmount: map[string]float64{
                "USD": 15000.0,
                "EUR": 15000.0,
                "GBP": 15000.0,
            },
            RequiresKYC:     true,
            SupportsRefunds: true,
            WebhookSupport:  true,
            TestModeAvailable: true,
        },
    }
}

func (p *MoonPayProvider) Initialize(config payment.ProviderConfig) error {
    p.apiKey = config.Get("api_key")
    p.secretKey = config.Get("secret_key")
    
    if config.Get("environment") == "test" {
        p.baseURL = "https://api.sandbox.moonpay.com/v3"
    }
    
    if p.apiKey == "" || p.secretKey == "" {
        return fmt.Errorf("missing required configuration: api_key and secret_key")
    }
    
    // Test API connection
    if err := p.testConnection(); err != nil {
        return fmt.Errorf("failed to connect to MoonPay API: %w", err)
    }
    
    return nil
}

func (p *MoonPayProvider) CreatePaymentIntent(
    ctx context.Context, 
    req *payment.PaymentRequest,
) (*payment.PaymentIntent, error) {
    // Build MoonPay transaction request
    moonpayReq := &MoonPayTransactionRequest{
        BaseCurrencyCode:   req.Currency,
        BaseCurrencyAmount: req.Amount,
        Currency:           p.mapCryptoCurrency(req.CryptoCurrency),
        WalletAddress:      req.WalletAddress,
        ReturnURL:          fmt.Sprintf("dankfolio://payment/return?payment_id=%s", req.PaymentID),
        PaymentMethod:      p.mapPaymentMethod(req.PaymentMethod),
        CustomerEmail:      req.UserEmail,
        ExternalID:         req.PaymentID,
        Metadata: map[string]string{
            "user_id":        req.UserID,
            "crypto_amount":  fmt.Sprintf("%.8f", req.CryptoAmount),
        },
    }
    
    // Make API request
    resp, err := p.httpClient.PostJSON(
        ctx,
        p.baseURL+"/transactions",
        moonpayReq,
        p.getHeaders(),
    )
    
    if err != nil {
        return nil, fmt.Errorf("moonpay API error: %w", err)
    }
    
    var moonpayResp MoonPayTransactionResponse
    if err := json.Unmarshal(resp, &moonpayResp); err != nil {
        return nil, fmt.Errorf("failed to parse response: %w", err)
    }
    
    return &payment.PaymentIntent{
        ID:           moonpayResp.ID,
        ProviderID:   "moonpay",
        ClientSecret: moonpayResp.WidgetURL, // MoonPay uses widget URL
        Amount:       req.Amount,
        Currency:     req.Currency,
        Status:       p.mapStatus(moonpayResp.Status),
        ExpiresAt:    time.Now().Add(30 * time.Minute),
        Metadata: map[string]string{
            "moonpay_transaction_id": moonpayResp.ID,
            "widget_url":            moonpayResp.WidgetURL,
        },
    }, nil
}

func (p *MoonPayProvider) GetPaymentStatus(
    ctx context.Context, 
    paymentIntentID string,
) (*payment.PaymentStatus, error) {
    resp, err := p.httpClient.Get(
        ctx,
        fmt.Sprintf("%s/transactions/%s", p.baseURL, paymentIntentID),
        p.getHeaders(),
    )
    
    if err != nil {
        return nil, fmt.Errorf("failed to get transaction status: %w", err)
    }
    
    var moonpayTx MoonPayTransaction
    if err := json.Unmarshal(resp, &moonpayTx); err != nil {
        return nil, fmt.Errorf("failed to parse response: %w", err)
    }
    
    return &payment.PaymentStatus{
        Status:          p.mapStatus(moonpayTx.Status),
        ProviderStatus:  moonpayTx.Status,
        Amount:          moonpayTx.BaseCurrencyAmount,
        Currency:        moonpayTx.BaseCurrencyCode,
        CryptoAmount:    moonpayTx.QuoteCurrencyAmount,
        CryptoCurrency:  moonpayTx.Currency,
        TransactionHash: moonpayTx.CryptoTransactionID,
        UpdatedAt:       moonpayTx.UpdatedAt,
    }, nil
}

func (p *MoonPayProvider) HandleWebhook(
    ctx context.Context, 
    payload []byte, 
    signature string,
) (*payment.WebhookEvent, error) {
    // Verify webhook signature
    if !p.verifyWebhookSignature(payload, signature) {
        return nil, payment.ErrInvalidWebhookSignature
    }
    
    var webhook MoonPayWebhook
    if err := json.Unmarshal(payload, &webhook); err != nil {
        return nil, fmt.Errorf("failed to parse webhook: %w", err)
    }
    
    // Map to generic webhook event
    event := &payment.WebhookEvent{
        ID:        webhook.ID,
        Type:      p.mapWebhookType(webhook.Type),
        Timestamp: webhook.CreatedAt,
        Data: map[string]interface{}{
            "transaction_id":     webhook.Data.TransactionID,
            "status":            webhook.Data.Status,
            "amount":            webhook.Data.BaseCurrencyAmount,
            "currency":          webhook.Data.BaseCurrencyCode,
            "crypto_amount":     webhook.Data.QuoteCurrencyAmount,
            "crypto_currency":   webhook.Data.Currency,
            "transaction_hash":  webhook.Data.CryptoTransactionID,
        },
    }
    
    return event, nil
}

// Helper methods

func (p *MoonPayProvider) mapCryptoCurrency(currency string) string {
    // Map internal currency codes to MoonPay codes
    currencyMap := map[string]string{
        "SOL":    "sol",
        "USDC":   "usdc_sol", // USDC on Solana
        "BONK":   "bonk",
        "WIF":    "wif",
    }
    
    if mapped, ok := currencyMap[currency]; ok {
        return mapped
    }
    return strings.ToLower(currency)
}

func (p *MoonPayProvider) mapPaymentMethod(method string) string {
    methodMap := map[string]string{
        "apple_pay":     "apple_pay",
        "google_pay":    "google_pay",
        "card":          "credit_debit_card",
        "bank_transfer": "bank_transfer",
    }
    
    if mapped, ok := methodMap[method]; ok {
        return mapped
    }
    return method
}

func (p *MoonPayProvider) mapStatus(moonpayStatus string) payment.PaymentStatus {
    switch moonpayStatus {
    case "pending":
        return payment.PaymentStatusPending
    case "waitingPayment":
        return payment.PaymentStatusProcessing
    case "completed":
        return payment.PaymentStatusSucceeded
    case "failed", "rejected":
        return payment.PaymentStatusFailed
    default:
        return payment.PaymentStatusUnknown
    }
}

func (p *MoonPayProvider) verifyWebhookSignature(payload []byte, signature string) bool {
    expectedSig := hmac.New(sha256.New, []byte(p.secretKey))
    expectedSig.Write(payload)
    expected := hex.EncodeToString(expectedSig.Sum(nil))
    
    return hmac.Equal([]byte(signature), []byte(expected))
}

func (p *MoonPayProvider) getHeaders() map[string]string {
    return map[string]string{
        "Authorization": fmt.Sprintf("Api-Key %s", p.apiKey),
        "Content-Type":  "application/json",
    }
}
```

### 3. Create Provider Types

Create `backend/internal/service/payment/providers/moonpay/types.go`:

```go
package moonpay

import "time"

// MoonPayTransactionRequest represents a transaction creation request
type MoonPayTransactionRequest struct {
    BaseCurrencyCode   string            `json:"baseCurrencyCode"`
    BaseCurrencyAmount float64           `json:"baseCurrencyAmount"`
    Currency           string            `json:"currency"`
    WalletAddress      string            `json:"walletAddress"`
    PaymentMethod      string            `json:"paymentMethod,omitempty"`
    ReturnURL          string            `json:"returnUrl"`
    CustomerEmail      string            `json:"email,omitempty"`
    ExternalID         string            `json:"externalId"`
    Metadata           map[string]string `json:"metadata,omitempty"`
}

// MoonPayTransactionResponse represents the API response
type MoonPayTransactionResponse struct {
    ID                  string    `json:"id"`
    Status              string    `json:"status"`
    WidgetURL           string    `json:"widgetUrl"`
    BaseCurrencyCode    string    `json:"baseCurrencyCode"`
    BaseCurrencyAmount  float64   `json:"baseCurrencyAmount"`
    Currency            string    `json:"currency"`
    QuoteCurrencyAmount float64   `json:"quoteCurrencyAmount"`
    FeeAmount           float64   `json:"feeAmount"`
    ExchangeRate        float64   `json:"exchangeRate"`
    CreatedAt           time.Time `json:"createdAt"`
    UpdatedAt           time.Time `json:"updatedAt"`
}

// MoonPayWebhook represents incoming webhook data
type MoonPayWebhook struct {
    ID        string                 `json:"id"`
    Type      string                 `json:"type"`
    CreatedAt time.Time              `json:"createdAt"`
    Data      MoonPayWebhookData     `json:"data"`
}

type MoonPayWebhookData struct {
    TransactionID       string    `json:"id"`
    Status              string    `json:"status"`
    BaseCurrencyCode    string    `json:"baseCurrencyCode"`
    BaseCurrencyAmount  float64   `json:"baseCurrencyAmount"`
    Currency            string    `json:"currency"`
    QuoteCurrencyAmount float64   `json:"quoteCurrencyAmount"`
    CryptoTransactionID string    `json:"cryptoTransactionId"`
    WalletAddress       string    `json:"walletAddress"`
}
```

### 4. Add Provider Tests

Create `backend/internal/service/payment/providers/moonpay/provider_test.go`:

```go
package moonpay

import (
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "github.com/dankfolio/backend/internal/service/payment"
)

func TestMoonPayProvider_CreatePaymentIntent(t *testing.T) {
    // Create test server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        assert.Equal(t, "/v3/transactions", r.URL.Path)
        assert.Equal(t, "POST", r.Method)
        
        // Verify auth header
        auth := r.Header.Get("Authorization")
        assert.Equal(t, "Api-Key test_api_key", auth)
        
        // Parse request
        var req MoonPayTransactionRequest
        err := json.NewDecoder(r.Body).Decode(&req)
        require.NoError(t, err)
        
        // Verify request
        assert.Equal(t, "USD", req.BaseCurrencyCode)
        assert.Equal(t, 100.0, req.BaseCurrencyAmount)
        assert.Equal(t, "sol", req.Currency)
        
        // Send response
        resp := MoonPayTransactionResponse{
            ID:                  "tx_test_123",
            Status:              "pending",
            WidgetURL:           "https://buy.moonpay.com/tx_test_123",
            BaseCurrencyCode:    req.BaseCurrencyCode,
            BaseCurrencyAmount:  req.BaseCurrencyAmount,
            Currency:            req.Currency,
            QuoteCurrencyAmount: 2.5,
            ExchangeRate:        40.0,
        }
        
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(resp)
    }))
    defer server.Close()
    
    // Create provider
    provider := NewMoonPayProvider().(*MoonPayProvider)
    provider.baseURL = server.URL + "/v3"
    
    // Initialize
    err := provider.Initialize(payment.ProviderConfig{
        "api_key":    "test_api_key",
        "secret_key": "test_secret_key",
    })
    require.NoError(t, err)
    
    // Create payment intent
    intent, err := provider.CreatePaymentIntent(context.Background(), &payment.PaymentRequest{
        Amount:         100.0,
        Currency:       "USD",
        CryptoCurrency: "SOL",
        CryptoAmount:   2.5,
        WalletAddress:  "7xKXtg2CW87...",
        UserID:         "user123",
        PaymentMethod:  "card",
        PaymentID:      "payment123",
    })
    
    require.NoError(t, err)
    assert.Equal(t, "tx_test_123", intent.ID)
    assert.Equal(t, "https://buy.moonpay.com/tx_test_123", intent.ClientSecret)
    assert.Equal(t, payment.PaymentStatusPending, intent.Status)
}

func TestMoonPayProvider_HandleWebhook(t *testing.T) {
    provider := NewMoonPayProvider().(*MoonPayProvider)
    provider.secretKey = "test_secret"
    
    webhook := MoonPayWebhook{
        ID:   "webhook_123",
        Type: "transaction_updated",
        Data: MoonPayWebhookData{
            TransactionID:       "tx_123",
            Status:              "completed",
            BaseCurrencyAmount:  100.0,
            BaseCurrencyCode:    "USD",
            QuoteCurrencyAmount: 2.5,
            Currency:            "sol",
            CryptoTransactionID: "5abc123...",
        },
    }
    
    payload, _ := json.Marshal(webhook)
    signature := p.calculateSignature(payload)
    
    event, err := provider.HandleWebhook(context.Background(), payload, signature)
    
    require.NoError(t, err)
    assert.Equal(t, payment.WebhookEventPaymentSucceeded, event.Type)
    assert.Equal(t, "tx_123", event.Data["transaction_id"])
    assert.Equal(t, "completed", event.Data["status"])
}
```

### 5. Register Provider

Add the provider to the factory in `backend/internal/service/payment/factory.go`:

```go
package payment

import (
    "fmt"
    
    "github.com/dankfolio/backend/internal/service/payment/providers/stripe"
    "github.com/dankfolio/backend/internal/service/payment/providers/moonpay"
    "github.com/dankfolio/backend/internal/service/payment/providers/ramp"
    "github.com/dankfolio/backend/internal/service/payment/providers/transak"
)

// ProviderFactory creates payment provider instances
type ProviderFactory struct {
    providers map[string]func() Provider
}

// NewProviderFactory creates a new provider factory
func NewProviderFactory() *ProviderFactory {
    return &ProviderFactory{
        providers: map[string]func() Provider{
            "stripe":  stripe.NewStripeProvider,
            "moonpay": moonpay.NewMoonPayProvider,
            "ramp":    ramp.NewRampProvider,
            "transak": transak.NewTransakProvider,
        },
    }
}

// CreateProvider creates a provider instance by name
func (f *ProviderFactory) CreateProvider(name string) (Provider, error) {
    constructor, ok := f.providers[name]
    if !ok {
        return nil, fmt.Errorf("unknown provider: %s", name)
    }
    
    return constructor(), nil
}

// GetAvailableProviders returns list of available providers
func (f *ProviderFactory) GetAvailableProviders() []string {
    providers := make([]string, 0, len(f.providers))
    for name := range f.providers {
        providers = append(providers, name)
    }
    return providers
}
```

### 6. Update Configuration

Add provider configuration to `backend/config/payment.yaml`:

```yaml
payment:
  providers:
    moonpay:
      enabled: true
      api_key: ${MOONPAY_API_KEY}
      secret_key: ${MOONPAY_SECRET_KEY}
      environment: ${MOONPAY_ENV} # "test" or "production"
      webhook_path: /webhooks/moonpay
      capabilities:
        - card
        - bank_transfer
        - apple_pay
        - google_pay
      supported_cryptos:
        - SOL
        - USDC
        - BONK
        - WIF
        - POPCAT
      limits:
        min:
          USD: 20.00
          EUR: 20.00
          GBP: 20.00
        max:
          USD: 15000.00
          EUR: 15000.00
          GBP: 15000.00
        daily:
          USD: 50000.00
          EUR: 50000.00
          GBP: 50000.00
```

### 7. Add Webhook Route

Update `backend/internal/api/routes.go`:

```go
func (s *Server) setupWebhookRoutes() {
    // Payment provider webhooks
    s.router.HandleFunc("/webhooks/stripe", s.paymentHandler.HandleStripeWebhook).Methods("POST")
    s.router.HandleFunc("/webhooks/moonpay", s.paymentHandler.HandleMoonPayWebhook).Methods("POST")
    s.router.HandleFunc("/webhooks/ramp", s.paymentHandler.HandleRampWebhook).Methods("POST")
    s.router.HandleFunc("/webhooks/transak", s.paymentHandler.HandleTransakWebhook).Methods("POST")
}
```

### 8. Frontend Integration

Update the frontend to support the new provider:

```typescript
// frontend/src/types/payment.ts
export type PaymentProviderType = 'stripe' | 'moonpay' | 'ramp' | 'transak';

export interface PaymentProvider {
    id: PaymentProviderType;
    name: string;
    logo: string;
    enabled: boolean;
    supportedMethods: PaymentMethod[];
    supportedCurrencies: string[];
    minAmount: Record<string, number>;
    maxAmount: Record<string, number>;
    estimatedTime: string;
    fees: {
        percentage: number;
        fixed: Record<string, number>;
    };
}

// frontend/src/services/payment/providers/moonpay.ts
export class MoonPayProvider implements PaymentProviderAdapter {
    async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent> {
        const response = await api.createPaymentIntent({
            ...request,
            provider: 'moonpay',
        });

        return {
            ...response,
            // MoonPay uses widget URL instead of client secret
            widgetUrl: response.clientSecret,
        };
    }

    async openPaymentWidget(paymentIntent: PaymentIntent): Promise<void> {
        // Open MoonPay widget in WebView or external browser
        if (Platform.OS === 'ios') {
            await WebBrowser.openBrowserAsync(paymentIntent.widgetUrl, {
                dismissButtonStyle: 'close',
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
            });
        } else {
            await Linking.openURL(paymentIntent.widgetUrl);
        }
    }

    async handleReturn(url: string): Promise<PaymentResult> {
        // Parse return URL parameters
        const params = new URLSearchParams(url.split('?')[1]);
        const transactionId = params.get('transactionId');
        const status = params.get('transactionStatus');

        if (status === 'completed') {
            return {
                success: true,
                transactionId,
            };
        } else {
            return {
                success: false,
                error: params.get('failureReason') || 'Payment failed',
            };
        }
    }
}
```

## Provider Requirements

### API Requirements

1. **Idempotency**: Support idempotent requests using idempotency keys
2. **Webhooks**: Provide webhook notifications for payment status updates
3. **Status Polling**: Allow querying payment status by ID
4. **Refunds**: Support partial and full refunds (if applicable)
5. **Test Mode**: Provide sandbox/test environment

### Security Requirements

1. **Authentication**: Secure API authentication (API keys, OAuth, etc.)
2. **Webhook Signatures**: Sign webhooks for verification
3. **TLS**: All API communication must use TLS 1.2+
4. **PCI Compliance**: Handle card data according to PCI standards

### Data Requirements

1. **Transaction Metadata**: Support custom metadata fields
2. **Customer Information**: Handle KYC data appropriately
3. **Currency Support**: Clear documentation of supported currencies
4. **Rate Limits**: Document rate limits and provide headers

## Testing New Providers

### 1. Unit Tests

Test all provider methods in isolation:

```go
func TestProvider_AllMethods(t *testing.T) {
    testCases := []struct {
        name string
        test func(t *testing.T, provider Provider)
    }{
        {"Initialize", testInitialize},
        {"CreatePaymentIntent", testCreatePaymentIntent},
        {"GetPaymentStatus", testGetPaymentStatus},
        {"CancelPayment", testCancelPayment},
        {"HandleWebhook", testHandleWebhook},
        {"GetCapabilities", testGetCapabilities},
    }

    provider := NewYourProvider()
    
    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            tc.test(t, provider)
        })
    }
}
```

### 2. Integration Tests

Test against the provider's sandbox environment:

```go
func TestProviderIntegration(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test")
    }

    provider := NewYourProvider()
    err := provider.Initialize(payment.ProviderConfig{
        "api_key": os.Getenv("YOUR_PROVIDER_TEST_API_KEY"),
        "environment": "test",
    })
    require.NoError(t, err)

    // Test full payment flow
    ctx := context.Background()
    
    // Create payment
    intent, err := provider.CreatePaymentIntent(ctx, &payment.PaymentRequest{
        Amount:         50.00,
        Currency:       "USD",
        CryptoCurrency: "SOL",
        WalletAddress:  "test_wallet",
    })
    require.NoError(t, err)
    
    // Simulate payment completion (provider-specific)
    // ...
    
    // Verify status
    status, err := provider.GetPaymentStatus(ctx, intent.ID)
    require.NoError(t, err)
    assert.Equal(t, payment.PaymentStatusSucceeded, status.Status)
}
```

### 3. Load Testing

Test provider performance and rate limits:

```go
func BenchmarkProvider_CreatePaymentIntent(b *testing.B) {
    provider := setupTestProvider(b)
    ctx := context.Background()
    
    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            _, err := provider.CreatePaymentIntent(ctx, &payment.PaymentRequest{
                Amount:   100.00,
                Currency: "USD",
            })
            if err != nil {
                b.Fatalf("Failed to create payment: %v", err)
            }
        }
    })
}
```

## Monitoring Integration

### 1. Add Provider Metrics

```go
// backend/internal/service/payment/metrics.go
func (s *PaymentService) recordProviderMetrics(provider string, method string, duration time.Duration, err error) {
    labels := prometheus.Labels{
        "provider": provider,
        "method":   method,
    }
    
    providerRequestDuration.With(labels).Observe(duration.Seconds())
    providerRequestTotal.With(labels).Inc()
    
    if err != nil {
        labels["error_type"] = categorizeError(err)
        providerErrorTotal.With(labels).Inc()
    }
}
```

### 2. Add Provider Dashboard

Create Grafana dashboard for the new provider:

```json
{
  "dashboard": {
    "title": "MoonPay Provider Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(payment_provider_requests_total{provider=\"moonpay\"}[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(payment_provider_errors_total{provider=\"moonpay\"}[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, payment_provider_request_duration_seconds{provider=\"moonpay\"})"
          }
        ]
      }
    ]
  }
}
```

## Provider Onboarding Checklist

- [ ] Provider account created and verified
- [ ] API credentials obtained
- [ ] Webhook endpoint configured in provider dashboard
- [ ] Provider implementation completed
- [ ] Unit tests written and passing
- [ ] Integration tests verified in sandbox
- [ ] Documentation updated
- [ ] Configuration added to all environments
- [ ] Monitoring dashboards created
- [ ] Error handling tested
- [ ] Rate limits documented and tested
- [ ] Security review completed
- [ ] Load testing performed
- [ ] Provider added to frontend
- [ ] End-to-end testing completed
- [ ] Production credentials configured
- [ ] Launch plan created

## Common Integration Patterns

### 1. Redirect Flow (MoonPay, Ramp)

```go
func (p *RedirectProvider) CreatePaymentIntent(ctx context.Context, req *PaymentRequest) (*PaymentIntent, error) {
    // Create session with provider
    session, err := p.createSession(req)
    if err != nil {
        return nil, err
    }
    
    return &PaymentIntent{
        ID:           session.ID,
        ClientSecret: session.RedirectURL, // Use redirect URL as "secret"
        Metadata: map[string]string{
            "redirect_url": session.RedirectURL,
            "return_url":   session.ReturnURL,
        },
    }, nil
}
```

### 2. Widget Flow (Transak)

```go
func (p *WidgetProvider) GetWidgetConfig(paymentIntent *PaymentIntent) map[string]interface{} {
    return map[string]interface{}{
        "apiKey":            p.apiKey,
        "environment":       p.environment,
        "cryptoCurrencyCode": paymentIntent.CryptoCurrency,
        "fiatCurrency":      paymentIntent.Currency,
        "fiatAmount":        paymentIntent.Amount,
        "walletAddress":     paymentIntent.WalletAddress,
        "partnerOrderId":    paymentIntent.ID,
        "disableWalletAddressForm": true,
    }
}
```

### 3. API Flow (Stripe)

```go
func (p *APIProvider) ConfirmPayment(ctx context.Context, paymentIntentID string) (*PaymentResult, error) {
    // Direct API confirmation
    result, err := p.client.PaymentIntents.Confirm(
        paymentIntentID,
        &stripe.PaymentIntentConfirmParams{
            PaymentMethod: stripe.String(paymentMethodID),
        },
    )
    
    if err != nil {
        return nil, p.handleAPIError(err)
    }
    
    return &PaymentResult{
        Status: p.mapStatus(result.Status),
        TransactionID: result.ID,
    }, nil
}
```

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification Fails**
   - Check webhook secret configuration
   - Verify signature algorithm matches provider docs
   - Ensure raw body is used for signature calculation

2. **Currency Mapping Issues**
   - Verify currency codes match provider's format
   - Check decimal precision requirements
   - Ensure amount calculations are correct

3. **Timeout Errors**
   - Increase HTTP client timeout
   - Implement retry logic with backoff
   - Check provider's status page

4. **Rate Limiting**
   - Implement rate limit handling
   - Use provider's rate limit headers
   - Add circuit breaker pattern

## Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [MoonPay API Reference](https://docs.moonpay.com)
- [Ramp Integration Guide](https://docs.ramp.network)
- [Transak Developer Docs](https://docs.transak.com)

## Conclusion

Adding a new payment provider to Dankfolio requires implementing the Provider interface, handling provider-specific requirements, and ensuring proper testing and monitoring. The modular architecture makes it straightforward to add new providers while maintaining consistency across the platform.