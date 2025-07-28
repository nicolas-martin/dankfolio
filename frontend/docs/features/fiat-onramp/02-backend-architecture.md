# Backend Architecture for Fiat On-Ramp

## Overview

This document describes the backend architecture for handling fiat-to-crypto purchases. The design emphasizes modularity, security, and the ability to support multiple payment providers through a generic interface.

## Architecture Principles

1. **Provider Agnostic**: Core logic independent of specific payment providers
2. **Scalable**: Microservices architecture with horizontal scaling capability
3. **Secure**: End-to-end encryption, PCI compliance, audit logging
4. **Resilient**: Circuit breakers, retries, and graceful degradation
5. **Observable**: Comprehensive monitoring and tracing

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │   Web App       │     │   Admin Panel   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                          ┌──────▼──────┐
                          │  API Gateway │
                          │   (gRPC)    │
                          └──────┬──────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
  ┌─────▼─────┐          ┌──────▼──────┐         ┌──────▼──────┐
  │  Payment  │          │  Crypto     │         │   User      │
  │  Service  │          │  Service    │         │  Service    │
  └─────┬─────┘          └──────┬──────┘         └──────┬──────┘
        │                        │                        │
        ├────────────────────────┼────────────────────────┤
        │                        │                        │
  ┌─────▼─────┐          ┌──────▼──────┐         ┌──────▼──────┐
  │ Provider  │          │  Blockchain │         │   KYC       │
  │ Adapter   │          │  Connector  │         │  Service    │
  └─────┬─────┘          └──────┬──────┘         └──────┬──────┘
        │                        │                        │
        │                 ┌──────▼──────┐                │
        │                 │   Solana    │                │
        │                 │   Network   │                │
        │                 └─────────────┘                │
        │                                                 │
  ┌─────▼─────────────────────────────────────────────────┐
  │              External Payment Providers               │
  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │
  │  │ Stripe │  │MoonPay │  │  Ramp  │  │Transak │     │
  │  └────────┘  └────────┘  └────────┘  └────────┘     │
  └───────────────────────────────────────────────────────┘
```

## Core Services

### 1. Payment Service

The central service orchestrating all payment operations.

**File**: `backend/internal/service/payment/service.go`

```go
package payment

import (
    "context"
    "fmt"
    "time"
    
    "github.com/dankfolio/backend/internal/model"
    "github.com/dankfolio/backend/internal/repository"
    pb "github.com/dankfolio/backend/proto/dankfolio/v1"
)

type PaymentService struct {
    pb.UnimplementedPaymentServiceServer
    repo          repository.PaymentRepository
    providers     map[string]Provider
    cryptoService CryptoService
    eventBus      EventBus
}

// Provider interface for payment provider abstraction
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

// PaymentRequest represents a payment request
type PaymentRequest struct {
    Amount          float64
    Currency        string
    CryptoCurrency  string
    CryptoAmount    float64
    WalletAddress   string
    UserID          string
    PaymentMethod   string // "apple_pay", "google_pay", "card"
    Metadata        map[string]string
}

// PaymentIntent represents a payment intent
type PaymentIntent struct {
    ID              string
    ProviderID      string
    ClientSecret    string
    Amount          float64
    Currency        string
    Status          PaymentStatus
    ExpiresAt       time.Time
    Metadata        map[string]string
}

// CreatePaymentIntent creates a new payment intent
func (s *PaymentService) CreatePaymentIntent(
    ctx context.Context,
    req *pb.CreatePaymentIntentRequest,
) (*pb.CreatePaymentIntentResponse, error) {
    // Validate request
    if err := s.validatePaymentRequest(req); err != nil {
        return nil, fmt.Errorf("invalid payment request: %w", err)
    }
    
    // Check user KYC status if required
    if s.requiresKYC(req.Amount, req.Currency) {
        if err := s.checkUserKYC(ctx, req.UserId); err != nil {
            return nil, fmt.Errorf("KYC verification required: %w", err)
        }
    }
    
    // Get the appropriate provider
    provider, err := s.selectProvider(req.Provider, req.PaymentMethod)
    if err != nil {
        return nil, fmt.Errorf("provider selection failed: %w", err)
    }
    
    // Create payment request
    paymentReq := &PaymentRequest{
        Amount:         req.Amount,
        Currency:       req.Currency,
        CryptoCurrency: req.CryptoCurrency,
        CryptoAmount:   req.CryptoAmount,
        WalletAddress:  req.WalletAddress,
        UserID:         req.UserId,
        PaymentMethod:  req.PaymentMethod,
        Metadata: map[string]string{
            "source": "mobile_app",
            "version": req.AppVersion,
        },
    }
    
    // Create payment intent with provider
    intent, err := provider.CreatePaymentIntent(ctx, paymentReq)
    if err != nil {
        return nil, fmt.Errorf("failed to create payment intent: %w", err)
    }
    
    // Store payment record
    payment := &model.Payment{
        ID:             intent.ID,
        UserID:         req.UserId,
        Provider:       req.Provider,
        Amount:         req.Amount,
        Currency:       req.Currency,
        CryptoAmount:   req.CryptoAmount,
        CryptoCurrency: req.CryptoCurrency,
        WalletAddress:  req.WalletAddress,
        Status:         model.PaymentStatusPending,
        CreatedAt:      time.Now(),
    }
    
    if err := s.repo.CreatePayment(ctx, payment); err != nil {
        // Attempt to cancel the payment if DB save fails
        _ = provider.CancelPayment(ctx, intent.ID)
        return nil, fmt.Errorf("failed to store payment: %w", err)
    }
    
    // Publish payment created event
    s.eventBus.Publish(ctx, &PaymentCreatedEvent{
        PaymentID: payment.ID,
        UserID:    payment.UserID,
        Amount:    payment.Amount,
        Currency:  payment.Currency,
    })
    
    return &pb.CreatePaymentIntentResponse{
        PaymentIntentId: intent.ID,
        ClientSecret:    intent.ClientSecret,
        Amount:          req.Amount,
        Currency:        req.Currency,
        ExpiresAt:       intent.ExpiresAt.Unix(),
    }, nil
}
```

### 2. Provider Adapter Pattern

Each payment provider implements the Provider interface.

**File**: `backend/internal/service/payment/providers/stripe/provider.go`

```go
package stripe

import (
    "context"
    "fmt"
    
    "github.com/stripe/stripe-go/v74"
    "github.com/stripe/stripe-go/v74/paymentintent"
    "github.com/dankfolio/backend/internal/service/payment"
)

type StripeProvider struct {
    apiKey         string
    webhookSecret  string
    capabilities   *payment.ProviderCapabilities
}

func NewStripeProvider() payment.Provider {
    return &StripeProvider{
        capabilities: &payment.ProviderCapabilities{
            SupportedCurrencies: []string{"USD", "EUR", "GBP"},
            SupportedMethods:    []string{"apple_pay", "google_pay", "card"},
            MinAmount:          map[string]float64{"USD": 1.0, "EUR": 1.0, "GBP": 1.0},
            MaxAmount:          map[string]float64{"USD": 10000.0, "EUR": 10000.0, "GBP": 10000.0},
            RequiresKYC:        true,
            SupportsRefunds:    true,
        },
    }
}

func (p *StripeProvider) Initialize(config payment.ProviderConfig) error {
    p.apiKey = config.Get("api_key")
    p.webhookSecret = config.Get("webhook_secret")
    
    if p.apiKey == "" || p.webhookSecret == "" {
        return fmt.Errorf("missing required configuration")
    }
    
    stripe.Key = p.apiKey
    return nil
}

func (p *StripeProvider) CreatePaymentIntent(
    ctx context.Context, 
    req *payment.PaymentRequest,
) (*payment.PaymentIntent, error) {
    // Convert amount to cents
    amountCents := int64(req.Amount * 100)
    
    params := &stripe.PaymentIntentParams{
        Amount:   stripe.Int64(amountCents),
        Currency: stripe.String(req.Currency),
        PaymentMethodTypes: stripe.StringSlice([]string{
            p.mapPaymentMethod(req.PaymentMethod),
        }),
        Metadata: map[string]string{
            "user_id":         req.UserID,
            "wallet_address":  req.WalletAddress,
            "crypto_currency": req.CryptoCurrency,
            "crypto_amount":   fmt.Sprintf("%.8f", req.CryptoAmount),
        },
    }
    
    // Add payment method options for Apple Pay
    if req.PaymentMethod == "apple_pay" {
        params.PaymentMethodOptions = &stripe.PaymentIntentPaymentMethodOptionsParams{
            Card: &stripe.PaymentIntentPaymentMethodOptionsCardParams{
                RequestThreeDSecure: stripe.String("automatic"),
            },
        }
    }
    
    pi, err := paymentintent.New(params)
    if err != nil {
        return nil, fmt.Errorf("stripe error: %w", err)
    }
    
    return &payment.PaymentIntent{
        ID:           pi.ID,
        ProviderID:   "stripe",
        ClientSecret: pi.ClientSecret,
        Amount:       req.Amount,
        Currency:     req.Currency,
        Status:       p.mapStatus(pi.Status),
        ExpiresAt:    time.Now().Add(30 * time.Minute),
        Metadata:     req.Metadata,
    }, nil
}

func (p *StripeProvider) mapPaymentMethod(method string) string {
    switch method {
    case "apple_pay", "google_pay":
        return "card"
    default:
        return method
    }
}

func (p *StripeProvider) mapStatus(status stripe.PaymentIntentStatus) payment.PaymentStatus {
    switch status {
    case stripe.PaymentIntentStatusSucceeded:
        return payment.PaymentStatusSucceeded
    case stripe.PaymentIntentStatusProcessing:
        return payment.PaymentStatusProcessing
    case stripe.PaymentIntentStatusCanceled:
        return payment.PaymentStatusCanceled
    default:
        return payment.PaymentStatusPending
    }
}
```

### 3. Transaction Processing

**File**: `backend/internal/service/payment/transaction.go`

```go
package payment

import (
    "context"
    "database/sql"
    "fmt"
    "time"
    
    "github.com/dankfolio/backend/internal/model"
)

// ProcessPaymentConfirmation handles payment confirmation and crypto purchase
func (s *PaymentService) ProcessPaymentConfirmation(
    ctx context.Context,
    paymentID string,
    providerStatus string,
) error {
    // Start database transaction
    tx, err := s.repo.BeginTx(ctx)
    if err != nil {
        return fmt.Errorf("failed to start transaction: %w", err)
    }
    defer tx.Rollback()
    
    // Get payment record
    payment, err := s.repo.GetPayment(ctx, paymentID)
    if err != nil {
        return fmt.Errorf("payment not found: %w", err)
    }
    
    // Verify payment hasn't already been processed
    if payment.Status != model.PaymentStatusPending {
        return fmt.Errorf("payment already processed")
    }
    
    // Update payment status
    payment.Status = model.PaymentStatusProcessing
    if err := s.repo.UpdatePayment(ctx, tx, payment); err != nil {
        return fmt.Errorf("failed to update payment: %w", err)
    }
    
    // Execute crypto purchase
    purchaseResult, err := s.executeCryptoPurchase(ctx, payment)
    if err != nil {
        payment.Status = model.PaymentStatusFailed
        payment.FailureReason = err.Error()
        _ = s.repo.UpdatePayment(ctx, tx, payment)
        return fmt.Errorf("crypto purchase failed: %w", err)
    }
    
    // Update payment with success details
    payment.Status = model.PaymentStatusSucceeded
    payment.CryptoTransactionHash = purchaseResult.TransactionHash
    payment.CryptoAmountReceived = purchaseResult.AmountReceived
    payment.CompletedAt = sql.NullTime{Time: time.Now(), Valid: true}
    
    if err := s.repo.UpdatePayment(ctx, tx, payment); err != nil {
        return fmt.Errorf("failed to update payment: %w", err)
    }
    
    // Create transaction record for user's portfolio
    transaction := &model.Transaction{
        UserID:           payment.UserID,
        Type:             model.TransactionTypePurchase,
        FromCurrency:     payment.Currency,
        ToCurrency:       payment.CryptoCurrency,
        FromAmount:       payment.Amount,
        ToAmount:         purchaseResult.AmountReceived,
        TransactionHash:  purchaseResult.TransactionHash,
        Status:           model.TransactionStatusCompleted,
        CreatedAt:        time.Now(),
    }
    
    if err := s.repo.CreateTransaction(ctx, tx, transaction); err != nil {
        return fmt.Errorf("failed to create transaction: %w", err)
    }
    
    // Commit transaction
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }
    
    // Publish success event
    s.eventBus.Publish(ctx, &PaymentSucceededEvent{
        PaymentID:      payment.ID,
        UserID:         payment.UserID,
        Amount:         payment.Amount,
        CryptoAmount:   purchaseResult.AmountReceived,
        TransactionHash: purchaseResult.TransactionHash,
    })
    
    // Send user notification
    s.notificationService.SendPaymentSuccess(ctx, payment.UserID, payment)
    
    return nil
}

// executeCryptoPurchase performs the actual crypto purchase
func (s *PaymentService) executeCryptoPurchase(
    ctx context.Context,
    payment *model.Payment,
) (*CryptoPurchaseResult, error) {
    // Get current crypto price
    price, err := s.cryptoService.GetCurrentPrice(ctx, payment.CryptoCurrency)
    if err != nil {
        return nil, fmt.Errorf("failed to get crypto price: %w", err)
    }
    
    // Calculate final amount with slippage protection
    finalAmount := s.calculateFinalAmount(payment.CryptoAmount, price)
    
    // Execute blockchain transaction
    txHash, err := s.cryptoService.PurchaseCrypto(ctx, &CryptoPurchaseRequest{
        WalletAddress: payment.WalletAddress,
        Currency:      payment.CryptoCurrency,
        Amount:        finalAmount,
        UserID:        payment.UserID,
    })
    
    if err != nil {
        return nil, fmt.Errorf("blockchain transaction failed: %w", err)
    }
    
    return &CryptoPurchaseResult{
        TransactionHash: txHash,
        AmountReceived:  finalAmount,
        Price:           price,
    }, nil
}
```

### 4. Webhook Handler

**File**: `backend/internal/service/payment/webhook.go`

```go
package payment

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    
    "github.com/gorilla/mux"
)

type WebhookHandler struct {
    service *PaymentService
}

func NewWebhookHandler(service *PaymentService) *WebhookHandler {
    return &WebhookHandler{service: service}
}

func (h *WebhookHandler) RegisterRoutes(router *mux.Router) {
    router.HandleFunc("/webhooks/stripe", h.handleStripeWebhook).Methods("POST")
    router.HandleFunc("/webhooks/moonpay", h.handleMoonPayWebhook).Methods("POST")
    router.HandleFunc("/webhooks/ramp", h.handleRampWebhook).Methods("POST")
}

func (h *WebhookHandler) handleStripeWebhook(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    
    // Read body
    payload, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Failed to read body", http.StatusBadRequest)
        return
    }
    
    // Get signature header
    signature := r.Header.Get("Stripe-Signature")
    if signature == "" {
        http.Error(w, "Missing signature", http.StatusUnauthorized)
        return
    }
    
    // Get provider
    provider := h.service.providers["stripe"]
    
    // Handle webhook
    event, err := provider.HandleWebhook(ctx, payload, signature)
    if err != nil {
        logger.Error("Webhook handling failed", zap.Error(err))
        http.Error(w, "Webhook handling failed", http.StatusBadRequest)
        return
    }
    
    // Process event
    switch event.Type {
    case "payment_intent.succeeded":
        if err := h.handlePaymentSuccess(ctx, event); err != nil {
            logger.Error("Failed to process payment success", zap.Error(err))
            http.Error(w, "Processing failed", http.StatusInternalServerError)
            return
        }
    case "payment_intent.payment_failed":
        if err := h.handlePaymentFailure(ctx, event); err != nil {
            logger.Error("Failed to process payment failure", zap.Error(err))
            http.Error(w, "Processing failed", http.StatusInternalServerError)
            return
        }
    }
    
    w.WriteHeader(http.StatusOK)
}

func (h *WebhookHandler) handlePaymentSuccess(ctx context.Context, event *WebhookEvent) error {
    paymentID := event.Data["payment_intent_id"].(string)
    return h.service.ProcessPaymentConfirmation(ctx, paymentID, "succeeded")
}

func (h *WebhookHandler) handlePaymentFailure(ctx context.Context, event *WebhookEvent) error {
    paymentID := event.Data["payment_intent_id"].(string)
    reason := event.Data["failure_reason"].(string)
    
    payment, err := h.service.repo.GetPayment(ctx, paymentID)
    if err != nil {
        return err
    }
    
    payment.Status = model.PaymentStatusFailed
    payment.FailureReason = reason
    
    return h.service.repo.UpdatePayment(ctx, nil, payment)
}
```

### 5. Security Layer

**File**: `backend/internal/service/payment/security.go`

```go
package payment

import (
    "context"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
    "fmt"
    "time"
    
    "github.com/dankfolio/backend/pkg/encryption"
)

type SecurityManager struct {
    encryptor     encryption.Encryptor
    rateLimiter   RateLimiter
    fraudDetector FraudDetector
}

// ValidatePaymentRequest performs security checks on payment requests
func (s *SecurityManager) ValidatePaymentRequest(
    ctx context.Context,
    req *PaymentRequest,
) error {
    // Rate limiting
    if err := s.rateLimiter.CheckLimit(ctx, req.UserID, "payment", 5, time.Minute); err != nil {
        return fmt.Errorf("rate limit exceeded: %w", err)
    }
    
    // Amount validation
    if req.Amount <= 0 || req.Amount > 10000 {
        return fmt.Errorf("invalid amount: must be between 0 and 10000")
    }
    
    // Fraud detection
    riskScore := s.fraudDetector.CalculateRiskScore(ctx, &FraudCheckRequest{
        UserID:        req.UserID,
        Amount:        req.Amount,
        Currency:      req.Currency,
        PaymentMethod: req.PaymentMethod,
        IPAddress:     getIPFromContext(ctx),
        DeviceID:      getDeviceIDFromContext(ctx),
    })
    
    if riskScore > 0.8 {
        return fmt.Errorf("payment flagged as high risk")
    }
    
    // Wallet address validation
    if !s.isValidSolanaAddress(req.WalletAddress) {
        return fmt.Errorf("invalid wallet address")
    }
    
    return nil
}

// EncryptSensitiveData encrypts sensitive payment data
func (s *SecurityManager) EncryptSensitiveData(data map[string]string) (map[string]string, error) {
    encrypted := make(map[string]string)
    
    sensitiveFields := []string{"card_number", "cvv", "account_number"}
    
    for key, value := range data {
        if contains(sensitiveFields, key) {
            encryptedValue, err := s.encryptor.Encrypt([]byte(value))
            if err != nil {
                return nil, fmt.Errorf("encryption failed for %s: %w", key, err)
            }
            encrypted[key] = base64.StdEncoding.EncodeToString(encryptedValue)
        } else {
            encrypted[key] = value
        }
    }
    
    return encrypted, nil
}

// VerifyWebhookSignature verifies webhook signatures
func (s *SecurityManager) VerifyWebhookSignature(
    payload []byte,
    signature string,
    secret string,
) error {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expectedSignature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
    
    if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
        return fmt.Errorf("invalid webhook signature")
    }
    
    return nil
}

// AuditLog creates audit log entries for payment operations
func (s *SecurityManager) AuditLog(
    ctx context.Context,
    operation string,
    userID string,
    details map[string]interface{},
) {
    log := &AuditLogEntry{
        Timestamp: time.Now(),
        Operation: operation,
        UserID:    userID,
        IPAddress: getIPFromContext(ctx),
        Details:   details,
    }
    
    // Async write to audit log
    go s.writeAuditLog(log)
}
```

### 6. Hot Wallet Service

The hot wallet service manages cryptocurrency funds for immediate transaction processing while maintaining security through HSM integration and multi-signature controls.

**File**: `backend/internal/service/wallet/hot_wallet.go`

```go
package wallet

import (
    "context"
    "crypto/ecdsa"
    "encoding/hex"
    "fmt"
    "math/big"
    "sync"
    "time"
    
    "github.com/dankfolio/backend/internal/model"
    "github.com/dankfolio/backend/pkg/hsm"
    "github.com/dankfolio/backend/pkg/blockchain"
)

type HotWalletService struct {
    hsm              hsm.Module
    blockchain       blockchain.Client
    walletRepo       repository.WalletRepository
    coldWalletAddr   string
    thresholds       map[string]float64
    refillAmounts    map[string]float64
    mu               sync.RWMutex
}

// HotWallet represents an active hot wallet
type HotWallet struct {
    ID            string
    Address       string
    Currency      string
    Balance       float64
    LastRefill    time.Time
    IsActive      bool
    HSMKeyID      string
}

// GetHotWallet returns the active hot wallet for the specified currency
func (s *HotWalletService) GetHotWallet(ctx context.Context, currency string) (*HotWallet, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    // Get active hot wallet from database
    wallet, err := s.walletRepo.GetActiveHotWallet(ctx, currency)
    if err != nil {
        return nil, fmt.Errorf("failed to get hot wallet: %w", err)
    }
    
    if wallet == nil {
        return nil, fmt.Errorf("no active hot wallet for currency %s", currency)
    }
    
    // Get current balance from blockchain
    balance, err := s.blockchain.GetBalance(ctx, wallet.Address, currency)
    if err != nil {
        return nil, fmt.Errorf("failed to get wallet balance: %w", err)
    }
    
    return &HotWallet{
        ID:         wallet.ID,
        Address:    wallet.Address,
        Currency:   currency,
        Balance:    balance,
        LastRefill: wallet.LastRefill,
        IsActive:   wallet.IsActive,
        HSMKeyID:   wallet.HSMKeyID,
    }, nil
}

// CreateTransaction creates and signs a transaction using HSM
func (s *HotWalletService) CreateTransaction(
    ctx context.Context,
    fromWallet *HotWallet,
    toAddress string,
    amount float64,
    currency string,
) (*blockchain.Transaction, error) {
    // Validate transaction
    if err := s.validateTransaction(fromWallet, amount); err != nil {
        return nil, err
    }
    
    // Build transaction
    tx := &blockchain.Transaction{
        From:      fromWallet.Address,
        To:        toAddress,
        Amount:    amount,
        Currency:  currency,
        Nonce:     s.blockchain.GetNonce(ctx, fromWallet.Address),
        GasPrice:  s.blockchain.GetGasPrice(ctx),
        GasLimit:  21000,
        Timestamp: time.Now(),
    }
    
    // Sign transaction using HSM
    signature, err := s.signTransactionWithHSM(ctx, tx, fromWallet.HSMKeyID)
    if err != nil {
        return nil, fmt.Errorf("failed to sign transaction: %w", err)
    }
    
    tx.Signature = signature
    
    // Log transaction attempt
    s.auditLog(ctx, "transaction_created", map[string]interface{}{
        "wallet_id":  fromWallet.ID,
        "to_address": toAddress,
        "amount":     amount,
        "currency":   currency,
    })
    
    return tx, nil
}

// signTransactionWithHSM signs a transaction using the Hardware Security Module
func (s *HotWalletService) signTransactionWithHSM(
    ctx context.Context,
    tx *blockchain.Transaction,
    keyID string,
) ([]byte, error) {
    // Serialize transaction for signing
    txHash := tx.Hash()
    
    // Request signature from HSM
    signature, err := s.hsm.Sign(ctx, keyID, txHash)
    if err != nil {
        return nil, fmt.Errorf("HSM signing failed: %w", err)
    }
    
    return signature, nil
}

// MonitorAndRefill monitors hot wallet balances and triggers refills when needed
func (s *HotWalletService) MonitorAndRefill(ctx context.Context) error {
    currencies := []string{"SOL", "USDC", "BONK", "WIF"}
    
    for _, currency := range currencies {
        wallet, err := s.GetHotWallet(ctx, currency)
        if err != nil {
            logger.Error("Failed to get hot wallet", 
                zap.String("currency", currency),
                zap.Error(err))
            continue
        }
        
        threshold := s.thresholds[currency]
        if wallet.Balance < threshold {
            logger.Warn("Hot wallet balance below threshold",
                zap.String("currency", currency),
                zap.Float64("balance", wallet.Balance),
                zap.Float64("threshold", threshold))
            
            // Trigger refill from cold storage
            if err := s.refillHotWallet(ctx, wallet); err != nil {
                logger.Error("Failed to refill hot wallet",
                    zap.String("currency", currency),
                    zap.Error(err))
                
                // Send alert to operations team
                s.alertLowBalance(ctx, wallet)
            }
        }
    }
    
    return nil
}

// refillHotWallet transfers funds from cold storage to hot wallet
func (s *HotWalletService) refillHotWallet(ctx context.Context, wallet *HotWallet) error {
    refillAmount := s.refillAmounts[wallet.Currency]
    
    // Create multi-signature request for cold wallet transfer
    request := &MultiSigRequest{
        ID:            generateRequestID(),
        Type:          "hot_wallet_refill",
        FromAddress:   s.coldWalletAddr,
        ToAddress:     wallet.Address,
        Amount:        refillAmount,
        Currency:      wallet.Currency,
        RequiredSigs:  3, // M-of-N multi-sig
        CreatedAt:     time.Now(),
        ExpiresAt:     time.Now().Add(24 * time.Hour),
    }
    
    // Store request in database
    if err := s.walletRepo.CreateMultiSigRequest(ctx, request); err != nil {
        return fmt.Errorf("failed to create multisig request: %w", err)
    }
    
    // Notify signers
    s.notifySigners(ctx, request)
    
    // Audit log
    s.auditLog(ctx, "refill_requested", map[string]interface{}{
        "wallet_id":     wallet.ID,
        "amount":        refillAmount,
        "currency":      wallet.Currency,
        "request_id":    request.ID,
    })
    
    return nil
}

// RotateHotWallet creates a new hot wallet and deactivates the old one
func (s *HotWalletService) RotateHotWallet(ctx context.Context, currency string) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    // Get current hot wallet
    currentWallet, err := s.walletRepo.GetActiveHotWallet(ctx, currency)
    if err != nil {
        return fmt.Errorf("failed to get current wallet: %w", err)
    }
    
    // Generate new key in HSM
    keyID, address, err := s.generateNewWalletInHSM(ctx, currency)
    if err != nil {
        return fmt.Errorf("failed to generate new wallet: %w", err)
    }
    
    // Create new wallet record
    newWallet := &model.Wallet{
        ID:        generateWalletID(),
        Type:      model.WalletTypeHot,
        Currency:  currency,
        Address:   address,
        HSMKeyID:  keyID,
        IsActive:  true,
        CreatedAt: time.Now(),
    }
    
    // Begin transaction
    tx, err := s.walletRepo.BeginTx(ctx)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback()
    
    // Transfer remaining balance from old wallet
    if currentWallet != nil && currentWallet.Balance > 0 {
        transfer, err := s.CreateTransaction(ctx, currentWallet, address, currentWallet.Balance, currency)
        if err != nil {
            return fmt.Errorf("failed to create transfer: %w", err)
        }
        
        if _, err := s.blockchain.SendTransaction(ctx, transfer); err != nil {
            return fmt.Errorf("failed to transfer balance: %w", err)
        }
        
        // Deactivate old wallet
        currentWallet.IsActive = false
        if err := s.walletRepo.UpdateWallet(ctx, tx, currentWallet); err != nil {
            return fmt.Errorf("failed to deactivate old wallet: %w", err)
        }
    }
    
    // Activate new wallet
    if err := s.walletRepo.CreateWallet(ctx, tx, newWallet); err != nil {
        return fmt.Errorf("failed to create new wallet: %w", err)
    }
    
    // Commit transaction
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }
    
    // Audit log
    s.auditLog(ctx, "wallet_rotated", map[string]interface{}{
        "old_wallet_id": currentWallet.ID,
        "new_wallet_id": newWallet.ID,
        "currency":      currency,
    })
    
    return nil
}

// generateNewWalletInHSM creates a new key pair in the HSM
func (s *HotWalletService) generateNewWalletInHSM(ctx context.Context, currency string) (string, string, error) {
    // Generate key in HSM
    keyID, err := s.hsm.GenerateKey(ctx, hsm.KeySpec{
        Algorithm: hsm.AlgorithmECDSA,
        Curve:     hsm.CurveSecp256k1,
        Label:     fmt.Sprintf("hot_wallet_%s_%d", currency, time.Now().Unix()),
    })
    
    if err != nil {
        return "", "", fmt.Errorf("HSM key generation failed: %w", err)
    }
    
    // Get public key
    pubKey, err := s.hsm.GetPublicKey(ctx, keyID)
    if err != nil {
        return "", "", fmt.Errorf("failed to get public key: %w", err)
    }
    
    // Derive address from public key
    address := s.blockchain.DeriveAddress(pubKey)
    
    return keyID, address, nil
}

// Multi-signature support for critical operations
type MultiSigRequest struct {
    ID           string
    Type         string
    FromAddress  string
    ToAddress    string
    Amount       float64
    Currency     string
    RequiredSigs int
    Signatures   []MultiSigSignature
    Status       string
    CreatedAt    time.Time
    ExpiresAt    time.Time
}

type MultiSigSignature struct {
    SignerID  string
    Signature []byte
    SignedAt  time.Time
}

// ProcessMultiSigSignature processes a signature for a multi-sig request
func (s *HotWalletService) ProcessMultiSigSignature(
    ctx context.Context,
    requestID string,
    signerID string,
    signature []byte,
) error {
    request, err := s.walletRepo.GetMultiSigRequest(ctx, requestID)
    if err != nil {
        return fmt.Errorf("request not found: %w", err)
    }
    
    // Verify signature is valid
    if err := s.verifyMultiSigSignature(ctx, request, signerID, signature); err != nil {
        return fmt.Errorf("invalid signature: %w", err)
    }
    
    // Add signature
    request.Signatures = append(request.Signatures, MultiSigSignature{
        SignerID:  signerID,
        Signature: signature,
        SignedAt:  time.Now(),
    })
    
    // Check if we have enough signatures
    if len(request.Signatures) >= request.RequiredSigs {
        // Execute the request
        if err := s.executeMultiSigRequest(ctx, request); err != nil {
            return fmt.Errorf("failed to execute request: %w", err)
        }
        request.Status = "completed"
    }
    
    // Update request
    if err := s.walletRepo.UpdateMultiSigRequest(ctx, request); err != nil {
        return fmt.Errorf("failed to update request: %w", err)
    }
    
    return nil
}
```

### Hot Wallet Configuration

**File**: `backend/config/wallet.yaml`

```yaml
wallet:
  hot_wallet:
    # Minimum balance thresholds that trigger refill
    thresholds:
      SOL: 50.0
      USDC: 1000.0
      BONK: 1000000.0
      WIF: 10000.0
    
    # Amount to refill when below threshold
    refill_amounts:
      SOL: 200.0
      USDC: 5000.0
      BONK: 10000000.0
      WIF: 50000.0
    
    # Maximum balance allowed in hot wallet
    max_balances:
      SOL: 500.0
      USDC: 10000.0
      BONK: 50000000.0
      WIF: 100000.0
    
    # Key rotation schedule (days)
    rotation_interval: 30
    
    # Multi-signature configuration
    multisig:
      required_signatures: 3
      total_signers: 5
      timeout_hours: 24
  
  # HSM Configuration
  hsm:
    type: "securosys" # or "thales", "aws_cloudhsm"
    endpoint: ${HSM_ENDPOINT}
    credentials:
      api_key: ${HSM_API_KEY}
      cert_path: ${HSM_CERT_PATH}
      key_path: ${HSM_KEY_PATH}
    
    # HSM backup configuration
    backup:
      enabled: true
      frequency: "daily"
      retention_days: 90
  
  # Cold wallet configuration
  cold_wallet:
    address: ${COLD_WALLET_ADDRESS}
    multisig_signers:
      - id: "signer1"
        name: "CFO"
        public_key: ${SIGNER1_PUBKEY}
      - id: "signer2"
        name: "CTO"
        public_key: ${SIGNER2_PUBKEY}
      - id: "signer3"
        name: "Security Officer"
        public_key: ${SIGNER3_PUBKEY}
      - id: "signer4"
        name: "Operations Lead"
        public_key: ${SIGNER4_PUBKEY}
      - id: "signer5"
        name: "Compliance Officer"
        public_key: ${SIGNER5_PUBKEY}
```

### Hot Wallet Monitoring

```go
// backend/internal/service/wallet/monitoring.go
package wallet

import (
    "context"
    "time"
    
    "github.com/prometheus/client_golang/prometheus"
)

var (
    hotWalletBalance = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "hot_wallet_balance",
            Help: "Current hot wallet balance by currency",
        },
        []string{"currency"},
    )
    
    hotWalletTransactions = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "hot_wallet_transactions_total",
            Help: "Total number of hot wallet transactions",
        },
        []string{"currency", "type", "status"},
    )
    
    hotWalletRefills = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "hot_wallet_refills_total",
            Help: "Total number of hot wallet refills",
        },
        []string{"currency", "status"},
    )
    
    hsmOperations = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "hsm_operation_duration_seconds",
            Help:    "HSM operation duration",
            Buckets: []float64{.001, .005, .01, .05, .1, .5, 1, 2},
        },
        []string{"operation"},
    )
)

// MonitoringService continuously monitors hot wallet health
type MonitoringService struct {
    walletService *HotWalletService
    alertManager  AlertManager
}

func (m *MonitoringService) Start(ctx context.Context) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            m.checkWalletHealth(ctx)
        }
    }
}

func (m *MonitoringService) checkWalletHealth(ctx context.Context) {
    currencies := []string{"SOL", "USDC", "BONK", "WIF"}
    
    for _, currency := range currencies {
        wallet, err := m.walletService.GetHotWallet(ctx, currency)
        if err != nil {
            m.alertManager.SendAlert(ctx, Alert{
                Severity: "critical",
                Title:    "Hot Wallet Unavailable",
                Message:  fmt.Sprintf("Cannot access hot wallet for %s: %v", currency, err),
            })
            continue
        }
        
        // Update metrics
        hotWalletBalance.WithLabelValues(currency).Set(wallet.Balance)
        
        // Check balance thresholds
        threshold := m.walletService.thresholds[currency]
        if wallet.Balance < threshold*0.5 {
            m.alertManager.SendAlert(ctx, Alert{
                Severity: "critical",
                Title:    "Hot Wallet Balance Critical",
                Message:  fmt.Sprintf("%s hot wallet balance critically low: %.2f", currency, wallet.Balance),
            })
        } else if wallet.Balance < threshold {
            m.alertManager.SendAlert(ctx, Alert{
                Severity: "warning",
                Title:    "Hot Wallet Balance Low",
                Message:  fmt.Sprintf("%s hot wallet balance below threshold: %.2f", currency, wallet.Balance),
            })
        }
        
        // Check if wallet hasn't been used recently (potential issue)
        if time.Since(wallet.LastTransaction) > 24*time.Hour {
            m.alertManager.SendAlert(ctx, Alert{
                Severity: "info",
                Title:    "Hot Wallet Inactive",
                Message:  fmt.Sprintf("%s hot wallet hasn't processed transactions in 24 hours", currency),
            })
        }
    }
}
```

## Database Schema

```sql
-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(50) NOT NULL,
    provider_payment_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    crypto_currency VARCHAR(50) NOT NULL,
    crypto_amount DECIMAL(20, 8) NOT NULL,
    crypto_amount_received DECIMAL(20, 8),
    wallet_address VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50),
    crypto_transaction_hash VARCHAR(255),
    failure_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    INDEX idx_payments_user_id (user_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_provider (provider)
);

-- Payment events table for audit trail
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    INDEX idx_payment_events_payment_id (payment_id)
);

-- Provider configurations
CREATE TABLE payment_providers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    config JSONB NOT NULL,
    capabilities JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Configuration

**File**: `backend/config/payment.yaml`

```yaml
payment:
  providers:
    stripe:
      enabled: true
      api_key: ${STRIPE_API_KEY}
      webhook_secret: ${STRIPE_WEBHOOK_SECRET}
      capabilities:
        - apple_pay
        - google_pay
        - card
    
    moonpay:
      enabled: false
      api_key: ${MOONPAY_API_KEY}
      webhook_secret: ${MOONPAY_WEBHOOK_SECRET}
      capabilities:
        - card
        - bank_transfer
    
    ramp:
      enabled: false
      api_key: ${RAMP_API_KEY}
      webhook_secret: ${RAMP_WEBHOOK_SECRET}
      capabilities:
        - card
        - apple_pay
        - bank_transfer
  
  limits:
    min_amount:
      USD: 1.00
      EUR: 1.00
      GBP: 1.00
    max_amount:
      USD: 10000.00
      EUR: 10000.00
      GBP: 10000.00
    daily_limit:
      USD: 50000.00
      EUR: 50000.00
      GBP: 50000.00
  
  security:
    require_kyc_above:
      USD: 1000.00
      EUR: 1000.00
      GBP: 1000.00
    rate_limit:
      requests_per_minute: 10
      requests_per_hour: 100
    fraud_detection:
      enabled: true
      high_risk_threshold: 0.8
```

## Monitoring and Observability

### Metrics

```go
// Prometheus metrics
var (
    paymentRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "payment_requests_total",
            Help: "Total number of payment requests",
        },
        []string{"provider", "method", "currency"},
    )
    
    paymentSuccessTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "payment_success_total",
            Help: "Total number of successful payments",
        },
        []string{"provider", "method", "currency"},
    )
    
    paymentFailureTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "payment_failure_total",
            Help: "Total number of failed payments",
        },
        []string{"provider", "method", "currency", "reason"},
    )
    
    paymentDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "payment_duration_seconds",
            Help:    "Payment processing duration",
            Buckets: []float64{.1, .5, 1, 2.5, 5, 10, 30, 60},
        },
        []string{"provider", "method"},
    )
    
    paymentAmount = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "payment_amount",
            Help:    "Payment amounts",
            Buckets: []float64{10, 50, 100, 500, 1000, 5000, 10000},
        },
        []string{"currency"},
    )
)
```

### Logging

```go
// Structured logging with context
logger.Info("Payment intent created",
    zap.String("payment_id", payment.ID),
    zap.String("user_id", payment.UserID),
    zap.Float64("amount", payment.Amount),
    zap.String("currency", payment.Currency),
    zap.String("provider", payment.Provider),
    zap.String("trace_id", traceID),
)
```

### Distributed Tracing

```go
// OpenTelemetry tracing
func (s *PaymentService) CreatePaymentIntent(ctx context.Context, req *pb.CreatePaymentIntentRequest) (*pb.CreatePaymentIntentResponse, error) {
    ctx, span := tracer.Start(ctx, "PaymentService.CreatePaymentIntent",
        trace.WithAttributes(
            attribute.String("user_id", req.UserId),
            attribute.Float64("amount", req.Amount),
            attribute.String("currency", req.Currency),
        ),
    )
    defer span.End()
    
    // ... implementation
}
```

## Error Handling

### Error Types

```go
type PaymentError struct {
    Code    string
    Message string
    Details map[string]interface{}
}

var (
    ErrInvalidAmount      = &PaymentError{Code: "INVALID_AMOUNT", Message: "Invalid payment amount"}
    ErrProviderNotFound   = &PaymentError{Code: "PROVIDER_NOT_FOUND", Message: "Payment provider not found"}
    ErrPaymentFailed      = &PaymentError{Code: "PAYMENT_FAILED", Message: "Payment processing failed"}
    ErrKYCRequired        = &PaymentError{Code: "KYC_REQUIRED", Message: "KYC verification required"}
    ErrRateLimitExceeded  = &PaymentError{Code: "RATE_LIMIT", Message: "Rate limit exceeded"}
)
```

## Testing

### Unit Tests

```go
func TestPaymentService_CreatePaymentIntent(t *testing.T) {
    tests := []struct {
        name    string
        request *pb.CreatePaymentIntentRequest
        want    *pb.CreatePaymentIntentResponse
        wantErr bool
    }{
        {
            name: "valid apple pay request",
            request: &pb.CreatePaymentIntentRequest{
                Amount:         100.00,
                Currency:       "USD",
                CryptoCurrency: "SOL",
                CryptoAmount:   2.5,
                WalletAddress:  "7xKXtg2CW8...",
                Provider:       "stripe",
                PaymentMethod:  "apple_pay",
                UserId:         "user123",
            },
            want: &pb.CreatePaymentIntentResponse{
                PaymentIntentId: "pi_123",
                ClientSecret:    "pi_123_secret",
                Amount:          100.00,
                Currency:        "USD",
            },
            wantErr: false,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup mocks
            mockRepo := mocks.NewMockPaymentRepository(t)
            mockProvider := mocks.NewMockProvider(t)
            
            service := &PaymentService{
                repo:      mockRepo,
                providers: map[string]Provider{"stripe": mockProvider},
            }
            
            // Execute test
            got, err := service.CreatePaymentIntent(context.Background(), tt.request)
            
            // Verify
            if (err != nil) != tt.wantErr {
                t.Errorf("CreatePaymentIntent() error = %v, wantErr %v", err, tt.wantErr)
            }
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("CreatePaymentIntent() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

## Next Steps

1. [Payment Flow](./03-payment-flow.md) - Detailed payment flow documentation
2. [Provider Integration](./04-provider-integration.md) - How to add new payment providers
3. [Security Best Practices](./05-security.md) - Security implementation details