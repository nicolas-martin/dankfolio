# Fiat-Onramp Compliance Requirements Summary

## Overview

This document summarizes the compliance requirements for implementing fiat-to-crypto payment functionality in Dankfolio. It consolidates information from the detailed compliance documentation to provide a clear checklist for the fiat-onramp feature.

## Quick Reference

### Documentation Structure
```
dankfolio/
├── frontend/docs/
│   ├── features/fiat-onramp/
│   │   ├── 01-apple-pay-integration.md      # Frontend implementation
│   │   ├── 02-backend-architecture.md       # Backend + Hot Wallet Service
│   │   ├── 03-payment-flow.md               # End-to-end flow
│   │   ├── 04-provider-integration.md       # Adding new providers
│   │   ├── 05-hot-wallet-security.md        # Security architecture
│   │   └── 06-compliance-requirements.md    # This summary
│   └── compliance/
│       ├── 01-licensing-requirements.md      # Federal & state licenses
│       ├── 02-kyc-aml-requirements.md        # KYC/AML program
│       ├── 03-technical-compliance.md        # Technical implementation
│       └── apple-msb-requirements.md         # Apple App Store MSB
```

## Pre-Launch Requirements

### 1. Federal Registration ✅

- [ ] **FinCEN MSB Registration**
  - Form 107 submission
  - Processing time: 30-60 days
  - No fee required
  - Renewal: Every 2 years

- [ ] **IRS Requirements**
  - Obtain EIN
  - Set up Form 8300 reporting (cash >$10k)
  - Configure 1099-K reporting for crypto

### 2. State Licensing 🏛️

#### Phase 1 States (Launch)
- [ ] **Wyoming** - Minimal requirements, crypto-friendly
- [ ] **Montana** - No MTL requirement
- [ ] **Texas** - MTL required, $300k-$2M bond

#### Phase 2 States (3-6 months)
- [ ] **Florida** - MSB license, $50k-$2M bond
- [ ] **California** - MTL, $250k-$7M bond
- [ ] **Illinois** - TOMA license, $100k-$2M bond

### 3. Apple App Store Requirements 🍎

- [ ] **Company Developer Account** (not individual)
- [ ] **MSB Documentation Package**
  - FinCEN registration certificate
  - State licenses for each operational state
  - Compliance program documentation
  - Security audit report

- [ ] **App Implementation**
  - Geographic restrictions by license
  - Visible KYC/AML features
  - Clear fee disclosures
  - Age rating: 17+

## Technical Implementation Checklist

### 1. KYC Implementation 👤

```typescript
// Required KYC Tiers
Tier 0: No fiat purchases allowed
Tier 1: $1,000 daily (email, phone, name, DOB)
Tier 2: $10,000 daily (government ID, address, selfie)
Tier 3: $50,000 daily (source of funds, employment)
```

- [ ] **KYC Provider Integration**
  - Primary: Jumio or Onfido
  - Fallback provider configured
  - Progressive KYC flow
  - Document upload and verification

- [ ] **Identity Verification**
  - Government ID scanning
  - Selfie/liveness check
  - Address verification
  - SSN/TIN collection (US only)

### 2. AML Implementation 🚨

- [ ] **Transaction Monitoring**
  ```yaml
  Rules to implement:
  - Velocity checks (10 tx/hour limit)
  - Large transaction alerts (>$10,000)
  - Structuring detection ($9,000-$9,999)
  - Geographic risk assessment
  ```

- [ ] **Blockchain Analytics**
  - Chainalysis or Elliptic integration
  - Wallet risk scoring
  - Sanctions screening
  - Mixer detection

- [ ] **Reporting Systems**
  - SAR filing capability (30-day deadline)
  - CTR filing for >$10,000 cash
  - Travel Rule compliance (>$3,000)

### 3. Hot Wallet Security 🔐

- [ ] **HSM Integration**
  - FIPS 140-2 Level 3 certified
  - Support for Securosys, Thales, or AWS CloudHSM
  - Key generation in HSM only
  - Transaction signing in HSM

- [ ] **Multi-Signature Setup**
  - Cold wallet: 3-of-5 signatures
  - Automated refill triggers
  - Balance thresholds per currency
  - Emergency procedures

- [ ] **Monitoring**
  - Real-time balance monitoring
  - Automated reconciliation
  - Anomaly detection
  - 24/7 alerting

### 4. Data Security 🛡️

- [ ] **Encryption**
  - PII encryption at rest (AES-256-GCM)
  - TLS 1.3 for all communications
  - End-to-end encryption for sensitive data
  - Key rotation every 90 days

- [ ] **Audit Logging**
  - Immutable audit trail
  - All transactions logged
  - User actions tracked
  - 7-year retention

- [ ] **Access Control**
  - Role-based permissions
  - MFA for admin access
  - Segregation of duties
  - Regular access reviews

### 5. Payment Integration 💳

- [ ] **Apple Pay Setup**
  - Stripe integration
  - Merchant configuration
  - Test environment
  - Production certificates

- [ ] **Provider Abstraction**
  - Generic payment interface
  - Multiple provider support
  - Webhook handling
  - Idempotency keys

## Compliance Program Requirements

### 1. Policies and Procedures 📋

- [ ] **Written AML Policy**
  - Board approved
  - Risk assessment
  - Customer due diligence procedures
  - Transaction monitoring procedures
  - SAR filing procedures

- [ ] **Privacy Policy**
  - GDPR compliant
  - CCPA compliant
  - Data retention periods
  - User rights explained

- [ ] **Terms of Service**
  - Prohibited activities
  - Account termination rights
  - Dispute resolution
  - Liability limitations

### 2. Personnel Requirements 👥

- [ ] **Compliance Officer**
  - Designated BSA officer
  - Direct reporting to board/CEO
  - CAMS certification preferred
  - 5+ years experience

- [ ] **Training Program**
  - Annual AML training for all staff
  - Role-specific training
  - Testing and certification
  - Training records retention

### 3. Third-Party Requirements 🤝

- [ ] **Independent Audit**
  - Annual compliance audit
  - Qualified third-party firm
  - Remediation tracking
  - Board reporting

- [ ] **Legal Counsel**
  - Crypto-specialized firm
  - State licensing support
  - Regulatory guidance
  - Incident response

## Implementation Timeline

### Month 1-2: Foundation
- [ ] FinCEN MSB registration
- [ ] Compliance officer hiring
- [ ] AML policy drafting
- [ ] KYC vendor selection

### Month 2-4: Technical Build
- [ ] KYC integration
- [ ] AML system implementation
- [ ] Hot wallet infrastructure
- [ ] Audit logging system

### Month 4-5: Testing & Documentation
- [ ] Security audit
- [ ] Compliance testing
- [ ] Documentation completion
- [ ] Staff training

### Month 6: Launch Preparation
- [ ] State license applications
- [ ] Apple App Store submission
- [ ] Production deployment
- [ ] Go-live monitoring

## Cost Estimates

### Initial Costs
- **Federal Registration**: $0
- **State Licenses (3 states)**: $15,000-$30,000
- **Surety Bonds**: $500,000-$2,000,000
- **Legal Fees**: $250,000-$500,000
- **KYC/AML Vendors**: $50,000-$100,000/year
- **Security Audit**: $25,000-$50,000
- **HSM Setup**: $20,000-$50,000

**Total Initial**: $860,000-$2,730,000

### Ongoing Annual Costs
- **License Renewals**: $15,000-$30,000
- **Compliance Officer**: $150,000-$250,000
- **KYC/AML Services**: $100,000-$200,000
- **Audits**: $50,000-$100,000
- **Legal/Regulatory**: $100,000-$200,000

**Total Annual**: $415,000-$780,000

## Risk Mitigation

### 1. Regulatory Risks
- Start with crypto-friendly states
- Maintain conservative compliance stance
- Regular regulatory monitoring
- Strong legal counsel relationships

### 2. Operational Risks
- Automated monitoring systems
- 24/7 security operations
- Incident response procedures
- Regular disaster recovery testing

### 3. Financial Risks
- Adequate insurance coverage
- Reserve requirements met
- Multiple banking relationships
- Clear fee structures

## Success Metrics

### Compliance KPIs
- KYC completion rate >95%
- False positive rate <20%
- Alert review time <24 hours
- SAR quality score >90%
- Audit findings <5 per year

### Operational KPIs
- Payment success rate >98%
- Average KYC time <5 minutes
- Hot wallet availability >99.9%
- Transaction monitoring uptime >99.9%

## Key Contacts

### Internal
- **Compliance Officer**: TBD
- **Security Team**: security@dankfolio.com
- **Legal Counsel**: TBD

### External
- **FinCEN**: FRC@fincen.gov
- **Apple App Review**: appstore@dankfolio.com
- **KYC Provider Support**: TBD

## Next Steps

1. **Immediate Actions**
   - Begin FinCEN registration
   - Hire compliance officer
   - Select KYC/AML vendors
   - Draft compliance policies

2. **Short-term (30 days)**
   - Complete federal registration
   - Begin state license applications
   - Start technical implementation
   - Establish banking relationships

3. **Medium-term (90 days)**
   - Complete KYC integration
   - Deploy hot wallet infrastructure
   - Conduct security audit
   - Submit to Apple App Store

## Conclusion

Implementing fiat-onramp functionality requires significant compliance investment but opens up mainstream adoption. This checklist provides a comprehensive roadmap for achieving regulatory compliance while maintaining user experience and security.

For detailed information on any topic, refer to the linked documentation in the structure diagram at the beginning of this document.