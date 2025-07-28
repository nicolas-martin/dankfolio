# Hot Wallet Security Architecture

## Overview

This document details the security architecture for Dankfolio's hot wallet implementation, focusing on protecting user funds while maintaining operational efficiency for fiat-to-crypto purchases. Our approach combines Hardware Security Modules (HSM), multi-signature controls, and automated monitoring to achieve enterprise-grade security.

## Table of Contents

1. [Security Principles](#security-principles)
2. [Architecture Overview](#architecture-overview)
3. [HSM Integration](#hsm-integration)
4. [Multi-Signature Implementation](#multi-signature-implementation)
5. [Key Management](#key-management)
6. [Balance Management](#balance-management)
7. [Transaction Security](#transaction-security)
8. [Monitoring and Alerts](#monitoring-and-alerts)
9. [Incident Response](#incident-response)
10. [Compliance Considerations](#compliance-considerations)

## Security Principles

### Defense in Depth

Our hot wallet security follows a layered approach:

1. **Physical Security**: HSMs provide tamper-resistant hardware protection
2. **Cryptographic Security**: All keys are generated and stored in HSMs
3. **Operational Security**: Multi-signature requirements for critical operations
4. **Monitoring Security**: Real-time monitoring and alerting
5. **Process Security**: Automated balance management and key rotation

### Least Privilege

- Hot wallets only contain funds necessary for immediate operations
- Access controls limit who can initiate transactions
- Automated systems have minimal permissions

### Zero Trust

- All operations require authentication and authorization
- No single point of failure
- Continuous verification of all transactions

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cold Storage                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Signer 1  │  │   Signer 2  │  │   Signer 3  │  (3-of-5)  │
│  │     HSM     │  │     HSM     │  │     HSM     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Refill when below threshold
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Hot Wallets                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    HSM Cluster                            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │  │
│  │  │  HSM 1  │  │  HSM 2  │  │  HSM 3  │  │ Backup  │    │  │
│  │  │ Primary │  │Secondary│  │ Tertiary│  │   HSM   │    │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ SOL Wallet  │  │USDC Wallet  │  │BONK Wallet  │            │
│  │  Balance:   │  │  Balance:   │  │  Balance:   │            │
│  │   50-500    │  │ 1000-10000  │  │    1M-50M   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Process payments
                             ▼
                    ┌─────────────────┐
                    │ User Wallets    │
                    └─────────────────┘
```

## HSM Integration

### HSM Selection Criteria

We support enterprise-grade HSMs that meet the following requirements:

1. **Certification**: FIPS 140-2 Level 3 or higher
2. **Performance**: Minimum 1000 signatures/second
3. **Availability**: 99.99% uptime SLA
4. **Standards**: Support for PKCS#11, JCE, or native APIs
5. **Backup**: Secure key backup and recovery mechanisms

### Supported HSM Providers

#### 1. Securosys Primus HSM
```yaml
hsm:
  type: "securosys"
  config:
    endpoint: "https://hsm.securosys.com/v1"
    api_key: ${SECUROSYS_API_KEY}
    partition: "production"
    high_availability: true
```

#### 2. Thales Luna Network HSM
```yaml
hsm:
  type: "thales"
  config:
    server_address: "10.0.1.100"
    server_port: 1792
    partition_name: "dankfolio_prod"
    partition_password: ${THALES_PARTITION_PASSWORD}
```

#### 3. AWS CloudHSM
```yaml
hsm:
  type: "aws_cloudhsm"
  config:
    cluster_id: ${AWS_CLOUDHSM_CLUSTER_ID}
    region: "us-east-1"
    credentials:
      access_key_id: ${AWS_ACCESS_KEY_ID}
      secret_access_key: ${AWS_SECRET_ACCESS_KEY}
```

### HSM Operations

#### Key Generation

```go
// backend/internal/service/wallet/hsm/key_generation.go
func (h *HSMManager) GenerateWalletKey(ctx context.Context, walletType string) (*WalletKey, error) {
    // Generate unique key label
    label := fmt.Sprintf("hot_wallet_%s_%d", walletType, time.Now().Unix())
    
    // Key generation parameters
    keySpec := &KeyGenerationSpec{
        Algorithm: AlgorithmECDSA,
        Curve:     CurveSecp256k1, // For Solana compatibility
        Label:     label,
        Exportable: false, // Keys never leave HSM
        Attributes: map[string]string{
            "purpose":     "hot_wallet",
            "currency":    walletType,
            "created_at":  time.Now().Format(time.RFC3339),
            "rotation_due": time.Now().Add(30 * 24 * time.Hour).Format(time.RFC3339),
        },
    }
    
    // Generate key in HSM
    keyID, err := h.hsm.GenerateKey(ctx, keySpec)
    if err != nil {
        return nil, fmt.Errorf("HSM key generation failed: %w", err)
    }
    
    // Get public key for address derivation
    pubKey, err := h.hsm.GetPublicKey(ctx, keyID)
    if err != nil {
        return nil, fmt.Errorf("failed to retrieve public key: %w", err)
    }
    
    // Derive blockchain address
    address := deriveAddress(pubKey, walletType)
    
    return &WalletKey{
        ID:        keyID,
        Address:   address,
        PublicKey: pubKey,
        Label:     label,
        CreatedAt: time.Now(),
    }, nil
}
```

#### Transaction Signing

```go
// backend/internal/service/wallet/hsm/signing.go
func (h *HSMManager) SignTransaction(ctx context.Context, tx Transaction, keyID string) ([]byte, error) {
    // Audit log the signing request
    h.auditLogger.Log(ctx, AuditEntry{
        Action:    "transaction_sign_request",
        KeyID:     keyID,
        TxHash:    tx.Hash(),
        Timestamp: time.Now(),
    })
    
    // Validate transaction
    if err := h.validateTransaction(tx); err != nil {
        return nil, fmt.Errorf("transaction validation failed: %w", err)
    }
    
    // Create signing request with timeout
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    // Sign transaction hash
    signature, err := h.hsm.Sign(ctx, SignRequest{
        KeyID:     keyID,
        Data:      tx.Hash(),
        Algorithm: SigningAlgorithmECDSA,
        HashAlgo:  HashAlgorithmSHA256,
    })
    
    if err != nil {
        h.alertManager.SendAlert(Alert{
            Severity: "critical",
            Title:    "HSM Signing Failed",
            Message:  fmt.Sprintf("Failed to sign transaction: %v", err),
        })
        return nil, err
    }
    
    // Verify signature before returning
    if err := h.verifySignature(tx.Hash(), signature, keyID); err != nil {
        return nil, fmt.Errorf("signature verification failed: %w", err)
    }
    
    return signature, nil
}
```

## Multi-Signature Implementation

### Cold Wallet Multi-Sig

For cold wallet operations, we require 3-of-5 signatures from designated officers:

```go
// backend/internal/service/wallet/multisig/cold_wallet.go
type ColdWalletMultiSig struct {
    signers map[string]Signer
    config  MultiSigConfig
}

type MultiSigConfig struct {
    RequiredSignatures int
    TotalSigners       int
    TimeoutHours       int
    Signers           []SignerConfig
}

type SignerConfig struct {
    ID        string
    Name      string
    Role      string
    PublicKey string
    HSMKeyID  string
}

func (m *ColdWalletMultiSig) CreateRefillRequest(
    ctx context.Context,
    amount float64,
    currency string,
    toAddress string,
) (*RefillRequest, error) {
    request := &RefillRequest{
        ID:           generateRequestID(),
        Type:         RequestTypeHotWalletRefill,
        FromAddress:  m.config.ColdWalletAddress,
        ToAddress:    toAddress,
        Amount:       amount,
        Currency:     currency,
        RequiredSigs: m.config.RequiredSignatures,
        Status:       RequestStatusPending,
        CreatedAt:    time.Now(),
        ExpiresAt:    time.Now().Add(time.Duration(m.config.TimeoutHours) * time.Hour),
    }
    
    // Validate request
    if err := m.validateRefillRequest(request); err != nil {
        return nil, err
    }
    
    // Store in database
    if err := m.repo.CreateMultiSigRequest(ctx, request); err != nil {
        return nil, err
    }
    
    // Notify all signers
    for _, signer := range m.config.Signers {
        m.notificationService.NotifySigner(ctx, signer, request)
    }
    
    return request, nil
}
```

### Signature Collection and Validation

```go
func (m *ColdWalletMultiSig) AddSignature(
    ctx context.Context,
    requestID string,
    signerID string,
    signature []byte,
) error {
    // Get request
    request, err := m.repo.GetMultiSigRequest(ctx, requestID)
    if err != nil {
        return err
    }
    
    // Validate request status
    if request.Status != RequestStatusPending {
        return ErrRequestNotPending
    }
    
    if time.Now().After(request.ExpiresAt) {
        return ErrRequestExpired
    }
    
    // Validate signer
    signer, exists := m.signers[signerID]
    if !exists {
        return ErrUnauthorizedSigner
    }
    
    // Verify signature
    message := request.SigningMessage()
    if err := signer.VerifySignature(message, signature); err != nil {
        return ErrInvalidSignature
    }
    
    // Check for duplicate signature
    for _, sig := range request.Signatures {
        if sig.SignerID == signerID {
            return ErrDuplicateSignature
        }
    }
    
    // Add signature
    request.Signatures = append(request.Signatures, Signature{
        SignerID:  signerID,
        Signature: signature,
        Timestamp: time.Now(),
    })
    
    // Check if we have enough signatures
    if len(request.Signatures) >= request.RequiredSigs {
        // Execute the refill
        if err := m.executeRefill(ctx, request); err != nil {
            return fmt.Errorf("refill execution failed: %w", err)
        }
        request.Status = RequestStatusCompleted
    }
    
    // Update request
    return m.repo.UpdateMultiSigRequest(ctx, request)
}
```

## Key Management

### Key Lifecycle

```go
// backend/internal/service/wallet/key_management.go
type KeyManager struct {
    hsm              HSMManager
    repo             KeyRepository
    rotationInterval time.Duration
}

// Key rotation states
const (
    KeyStateActive    = "active"
    KeyStateRotating  = "rotating"
    KeyStateRetired   = "retired"
    KeyStateDestroyed = "destroyed"
)

func (k *KeyManager) RotateKeys(ctx context.Context) error {
    // Get keys due for rotation
    keys, err := k.repo.GetKeysForRotation(ctx, time.Now())
    if err != nil {
        return err
    }
    
    for _, key := range keys {
        if err := k.rotateKey(ctx, key); err != nil {
            k.logger.Error("Key rotation failed",
                zap.String("key_id", key.ID),
                zap.Error(err))
            continue
        }
    }
    
    return nil
}

func (k *KeyManager) rotateKey(ctx context.Context, oldKey *Key) error {
    // Mark old key as rotating
    oldKey.State = KeyStateRotating
    if err := k.repo.UpdateKey(ctx, oldKey); err != nil {
        return err
    }
    
    // Generate new key
    newKey, err := k.hsm.GenerateWalletKey(ctx, oldKey.Currency)
    if err != nil {
        return err
    }
    
    // Transfer any remaining balance
    if oldKey.Balance > 0 {
        if err := k.transferBalance(ctx, oldKey, newKey); err != nil {
            return err
        }
    }
    
    // Activate new key
    newKey.State = KeyStateActive
    if err := k.repo.CreateKey(ctx, newKey); err != nil {
        return err
    }
    
    // Retire old key (keep for 90 days for audit)
    oldKey.State = KeyStateRetired
    oldKey.RetiredAt = time.Now()
    oldKey.DestroyAt = time.Now().Add(90 * 24 * time.Hour)
    
    return k.repo.UpdateKey(ctx, oldKey)
}
```

### Key Backup and Recovery

```go
type KeyBackup struct {
    hsm    HSMManager
    backup BackupProvider
}

func (b *KeyBackup) BackupKeys(ctx context.Context) error {
    // Get all active keys
    keys, err := b.repo.GetActiveKeys(ctx)
    if err != nil {
        return err
    }
    
    // Create backup session
    session, err := b.hsm.CreateBackupSession(ctx)
    if err != nil {
        return err
    }
    defer session.Close()
    
    // Backup each key
    backupData := &BackupData{
        Timestamp: time.Now(),
        Keys:      make([]KeyBackupEntry, 0, len(keys)),
    }
    
    for _, key := range keys {
        // Export key in encrypted format
        encryptedKey, err := session.ExportKey(key.ID)
        if err != nil {
            return fmt.Errorf("failed to export key %s: %w", key.ID, err)
        }
        
        backupData.Keys = append(backupData.Keys, KeyBackupEntry{
            KeyID:        key.ID,
            Label:        key.Label,
            EncryptedKey: encryptedKey,
            Metadata:     key.Metadata,
        })
    }
    
    // Store backup in secure location
    return b.backup.Store(ctx, backupData)
}
```

## Balance Management

### Automated Balance Monitoring

```go
// backend/internal/service/wallet/balance_manager.go
type BalanceManager struct {
    walletService *HotWalletService
    config        BalanceConfig
    metrics       *BalanceMetrics
}

type BalanceConfig struct {
    CheckInterval    time.Duration
    Thresholds      map[string]ThresholdConfig
    RefillAmounts   map[string]float64
    MaxBalances     map[string]float64
}

type ThresholdConfig struct {
    Min      float64
    Target   float64
    Critical float64 // Below this triggers immediate alert
}

func (b *BalanceManager) MonitorBalances(ctx context.Context) {
    ticker := time.NewTicker(b.config.CheckInterval)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            b.checkAllBalances(ctx)
        }
    }
}

func (b *BalanceManager) checkAllBalances(ctx context.Context) {
    for currency, threshold := range b.config.Thresholds {
        wallet, err := b.walletService.GetHotWallet(ctx, currency)
        if err != nil {
            b.handleWalletError(ctx, currency, err)
            continue
        }
        
        // Update metrics
        b.metrics.UpdateBalance(currency, wallet.Balance)
        
        // Check thresholds
        if wallet.Balance < threshold.Critical {
            b.handleCriticalBalance(ctx, wallet)
        } else if wallet.Balance < threshold.Min {
            b.handleLowBalance(ctx, wallet)
        } else if wallet.Balance > b.config.MaxBalances[currency] {
            b.handleExcessBalance(ctx, wallet)
        }
    }
}

func (b *BalanceManager) handleLowBalance(ctx context.Context, wallet *HotWallet) {
    // Calculate refill amount
    refillAmount := b.config.RefillAmounts[wallet.Currency]
    
    // Create refill request
    request, err := b.walletService.CreateRefillRequest(ctx, RefillRequest{
        WalletID:     wallet.ID,
        Currency:     wallet.Currency,
        Amount:       refillAmount,
        CurrentBalance: wallet.Balance,
        Reason:       "automated_low_balance_refill",
    })
    
    if err != nil {
        b.alertManager.SendAlert(ctx, Alert{
            Severity: "critical",
            Title:    "Refill Request Failed",
            Message:  fmt.Sprintf("Failed to create refill for %s: %v", wallet.Currency, err),
        })
        return
    }
    
    b.logger.Info("Refill request created",
        zap.String("currency", wallet.Currency),
        zap.Float64("amount", refillAmount),
        zap.String("request_id", request.ID))
}
```

### Balance Reconciliation

```go
type BalanceReconciler struct {
    blockchain    BlockchainClient
    walletService *HotWalletService
    repo          ReconciliationRepository
}

func (r *BalanceReconciler) ReconcileBalances(ctx context.Context) error {
    wallets, err := r.walletService.GetAllHotWallets(ctx)
    if err != nil {
        return err
    }
    
    reconciliation := &Reconciliation{
        ID:        generateID(),
        Timestamp: time.Now(),
        Results:   make([]ReconciliationResult, 0),
    }
    
    for _, wallet := range wallets {
        // Get on-chain balance
        onChainBalance, err := r.blockchain.GetBalance(ctx, wallet.Address, wallet.Currency)
        if err != nil {
            reconciliation.Results = append(reconciliation.Results, ReconciliationResult{
                WalletID: wallet.ID,
                Currency: wallet.Currency,
                Status:   "error",
                Error:    err.Error(),
            })
            continue
        }
        
        // Compare with database balance
        dbBalance := wallet.Balance
        difference := math.Abs(onChainBalance - dbBalance)
        
        result := ReconciliationResult{
            WalletID:       wallet.ID,
            Currency:       wallet.Currency,
            OnChainBalance: onChainBalance,
            DBBalance:      dbBalance,
            Difference:     difference,
            Status:         "matched",
        }
        
        // Check if difference exceeds threshold
        if difference > 0.001 { // Allow small rounding differences
            result.Status = "mismatch"
            
            // Update database to match on-chain
            wallet.Balance = onChainBalance
            if err := r.walletService.UpdateWalletBalance(ctx, wallet); err != nil {
                result.Error = err.Error()
            }
            
            // Alert on significant differences
            if difference > 1.0 {
                r.alertManager.SendAlert(ctx, Alert{
                    Severity: "high",
                    Title:    "Balance Mismatch Detected",
                    Message:  fmt.Sprintf("%s wallet mismatch: DB=%.2f, Chain=%.2f", 
                        wallet.Currency, dbBalance, onChainBalance),
                })
            }
        }
        
        reconciliation.Results = append(reconciliation.Results, result)
    }
    
    // Store reconciliation record
    return r.repo.StoreReconciliation(ctx, reconciliation)
}
```

## Transaction Security

### Transaction Validation

```go
type TransactionValidator struct {
    config ValidationConfig
    limiter RateLimiter
}

type ValidationConfig struct {
    MaxTransactionAmounts map[string]float64
    DailyLimits          map[string]float64
    RequireMultiSig      map[string]float64 // Amounts requiring multi-sig
}

func (v *TransactionValidator) ValidateTransaction(ctx context.Context, tx *Transaction) error {
    // Check transaction amount
    maxAmount := v.config.MaxTransactionAmounts[tx.Currency]
    if tx.Amount > maxAmount {
        return fmt.Errorf("transaction amount %.2f exceeds maximum %.2f for %s", 
            tx.Amount, maxAmount, tx.Currency)
    }
    
    // Check daily limits
    dailyTotal, err := v.getDailyTotal(ctx, tx.WalletID, tx.Currency)
    if err != nil {
        return err
    }
    
    dailyLimit := v.config.DailyLimits[tx.Currency]
    if dailyTotal+tx.Amount > dailyLimit {
        return fmt.Errorf("transaction would exceed daily limit of %.2f %s", 
            dailyLimit, tx.Currency)
    }
    
    // Check if multi-sig required
    multiSigThreshold := v.config.RequireMultiSig[tx.Currency]
    if tx.Amount >= multiSigThreshold && !tx.HasMultiSigApproval() {
        return ErrMultiSigRequired
    }
    
    // Rate limiting
    if err := v.limiter.CheckLimit(ctx, tx.WalletID); err != nil {
        return fmt.Errorf("rate limit exceeded: %w", err)
    }
    
    // Validate destination address
    if err := v.validateAddress(tx.ToAddress, tx.Currency); err != nil {
        return fmt.Errorf("invalid destination address: %w", err)
    }
    
    return nil
}
```

### Transaction Monitoring

```go
type TransactionMonitor struct {
    analyzer     TransactionAnalyzer
    alertManager AlertManager
}

func (m *TransactionMonitor) AnalyzeTransaction(ctx context.Context, tx *Transaction) {
    // Analyze transaction patterns
    analysis := m.analyzer.Analyze(tx)
    
    // Check for anomalies
    if analysis.RiskScore > 0.8 {
        m.alertManager.SendAlert(ctx, Alert{
            Severity: "high",
            Title:    "High Risk Transaction Detected",
            Message:  fmt.Sprintf("Transaction %s flagged with risk score %.2f", 
                tx.ID, analysis.RiskScore),
            Details: map[string]interface{}{
                "transaction_id": tx.ID,
                "amount":        tx.Amount,
                "currency":      tx.Currency,
                "risk_factors":  analysis.RiskFactors,
            },
        })
    }
    
    // Check for unusual patterns
    for _, pattern := range analysis.UnusualPatterns {
        m.logger.Warn("Unusual transaction pattern detected",
            zap.String("pattern", pattern.Type),
            zap.String("description", pattern.Description),
            zap.String("transaction_id", tx.ID))
    }
}
```

## Monitoring and Alerts

### Real-time Monitoring Dashboard

```yaml
# grafana/dashboards/hot-wallet-security.json
{
  "dashboard": {
    "title": "Hot Wallet Security Monitor",
    "panels": [
      {
        "title": "Wallet Balances",
        "targets": [{
          "expr": "hot_wallet_balance{currency=~\"$currency\"}"
        }]
      },
      {
        "title": "Transaction Rate",
        "targets": [{
          "expr": "rate(hot_wallet_transactions_total[5m])"
        }]
      },
      {
        "title": "HSM Operation Latency",
        "targets": [{
          "expr": "histogram_quantile(0.95, hsm_operation_duration_seconds)"
        }]
      },
      {
        "title": "Failed Transactions",
        "targets": [{
          "expr": "rate(hot_wallet_transactions_total{status=\"failed\"}[5m])"
        }]
      }
    ]
  }
}
```

### Alert Configuration

```yaml
# prometheus/alerts/hot-wallet.yml
groups:
  - name: hot_wallet_security
    rules:
      - alert: HotWalletBalanceCritical
        expr: |
          hot_wallet_balance < hot_wallet_threshold_critical
        for: 1m
        labels:
          severity: critical
          team: security
        annotations:
          summary: "Hot wallet balance critically low"
          description: "{{ $labels.currency }} wallet balance is {{ $value }}, below critical threshold"
          runbook: "https://docs.dankfolio.com/runbooks/hot-wallet-critical"

      - alert: HSMConnectionLost
        expr: |
          up{job="hsm_exporter"} == 0
        for: 30s
        labels:
          severity: critical
          team: security
        annotations:
          summary: "HSM connection lost"
          description: "Cannot connect to HSM {{ $labels.instance }}"

      - alert: UnauthorizedWalletAccess
        expr: |
          increase(unauthorized_wallet_access_total[5m]) > 0
        labels:
          severity: critical
          team: security
        annotations:
          summary: "Unauthorized wallet access attempt detected"
          description: "{{ $value }} unauthorized access attempts in the last 5 minutes"

      - alert: TransactionAnomalyDetected
        expr: |
          transaction_anomaly_score > 0.8
        labels:
          severity: high
          team: security
        annotations:
          summary: "Transaction anomaly detected"
          description: "Transaction {{ $labels.transaction_id }} has anomaly score {{ $value }}"
```

## Incident Response

### Automated Response Actions

```go
type IncidentResponder struct {
    walletService *HotWalletService
    alertManager  AlertManager
    config        ResponseConfig
}

func (r *IncidentResponder) HandleSecurityIncident(ctx context.Context, incident *SecurityIncident) error {
    switch incident.Type {
    case IncidentTypeUnauthorizedAccess:
        return r.handleUnauthorizedAccess(ctx, incident)
    case IncidentTypeAnomalousTransaction:
        return r.handleAnomalousTransaction(ctx, incident)
    case IncidentTypeHSMFailure:
        return r.handleHSMFailure(ctx, incident)
    case IncidentTypeBalanceDiscrepancy:
        return r.handleBalanceDiscrepancy(ctx, incident)
    default:
        return r.handleGenericIncident(ctx, incident)
    }
}

func (r *IncidentResponder) handleUnauthorizedAccess(ctx context.Context, incident *SecurityIncident) error {
    // 1. Freeze affected wallet
    if err := r.walletService.FreezeWallet(ctx, incident.WalletID); err != nil {
        return err
    }
    
    // 2. Rotate keys immediately
    if err := r.walletService.EmergencyKeyRotation(ctx, incident.WalletID); err != nil {
        return err
    }
    
    // 3. Transfer remaining balance to secure wallet
    if err := r.walletService.EmergencyTransfer(ctx, incident.WalletID); err != nil {
        return err
    }
    
    // 4. Notify security team
    r.alertManager.SendCriticalAlert(ctx, CriticalAlert{
        Type:      "security_breach",
        Title:     "Unauthorized Wallet Access",
        Message:   fmt.Sprintf("Wallet %s compromised, emergency procedures activated", incident.WalletID),
        Recipient: "security@dankfolio.com",
    })
    
    // 5. Create incident report
    return r.createIncidentReport(ctx, incident)
}
```

### Manual Response Procedures

```markdown
## Hot Wallet Security Incident Response Playbook

### 1. Unauthorized Access Detected

**Immediate Actions (0-5 minutes):**
1. Execute emergency freeze: `dankctl wallet freeze --id=<wallet_id>`
2. Check transaction logs: `dankctl wallet transactions --id=<wallet_id> --last=1h`
3. Initiate key rotation: `dankctl wallet rotate-keys --id=<wallet_id> --emergency`

**Investigation (5-30 minutes):**
1. Review access logs in Splunk
2. Check for correlated incidents
3. Identify attack vector

**Recovery (30+ minutes):**
1. Generate incident report
2. Update security controls
3. Resume operations with new keys

### 2. HSM Connection Failure

**Immediate Actions:**
1. Switch to backup HSM: `dankctl hsm failover --target=backup`
2. Verify wallet operations: `dankctl wallet health-check`
3. Page on-call engineer

**Troubleshooting:**
1. Check network connectivity
2. Verify HSM health status
3. Review HSM logs

### 3. Balance Discrepancy

**Investigation:**
1. Run reconciliation: `dankctl wallet reconcile --currency=<currency>`
2. Check blockchain explorer
3. Review transaction history

**Resolution:**
1. Update database to match on-chain
2. Investigate root cause
3. File incident report
```

## Compliance Considerations

### Regulatory Requirements

1. **Key Management Standards**
   - NIST SP 800-57 compliance
   - PCI-DSS key management requirements
   - SOC 2 Type II controls

2. **Audit Trail Requirements**
   - All key operations logged
   - Transaction signing recorded
   - Access attempts tracked
   - 7-year retention policy

3. **Segregation of Duties**
   - Key generation separate from usage
   - Multi-signature for critical operations
   - Role-based access control

### Audit Logging

```go
type AuditLogger struct {
    storage AuditStorage
    signer  AuditSigner
}

type AuditEntry struct {
    ID          string
    Timestamp   time.Time
    Action      string
    Actor       string
    Resource    string
    Result      string
    Details     map[string]interface{}
    IPAddress   string
    Signature   []byte
}

func (a *AuditLogger) LogWalletOperation(ctx context.Context, op WalletOperation) error {
    entry := &AuditEntry{
        ID:        generateAuditID(),
        Timestamp: time.Now(),
        Action:    op.Type,
        Actor:     op.UserID,
        Resource:  fmt.Sprintf("wallet:%s", op.WalletID),
        Result:    op.Result,
        Details: map[string]interface{}{
            "amount":        op.Amount,
            "currency":      op.Currency,
            "to_address":    op.ToAddress,
            "tx_hash":       op.TransactionHash,
            "risk_score":    op.RiskScore,
        },
        IPAddress: getIPFromContext(ctx),
    }
    
    // Sign audit entry
    signature, err := a.signer.Sign(entry)
    if err != nil {
        return err
    }
    entry.Signature = signature
    
    // Store with integrity protection
    return a.storage.Store(ctx, entry)
}
```

## Security Checklist

### Daily Checks
- [ ] Verify all hot wallet balances
- [ ] Review transaction anomalies
- [ ] Check HSM connectivity
- [ ] Validate key rotation schedule
- [ ] Review access logs

### Weekly Checks
- [ ] Run balance reconciliation
- [ ] Test incident response procedures
- [ ] Review security alerts
- [ ] Update threat intelligence
- [ ] Verify backup integrity

### Monthly Checks
- [ ] Rotate wallet keys
- [ ] Security assessment
- [ ] Penetration testing
- [ ] Compliance audit
- [ ] Update security documentation

### Quarterly Reviews
- [ ] Full security audit
- [ ] Disaster recovery test
- [ ] Multi-sig signer verification
- [ ] HSM firmware updates
- [ ] Policy and procedure review

## Conclusion

The hot wallet security architecture provides multiple layers of protection while maintaining operational efficiency. By combining HSM technology, multi-signature controls, automated monitoring, and comprehensive incident response procedures, we ensure that user funds remain secure throughout the fiat-to-crypto purchase process.