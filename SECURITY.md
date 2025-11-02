# Security Policy

## Reporting Security Vulnerabilities

We take the security of SolanaPvP seriously. If you discover a security vulnerability, please follow these steps:

### **DO NOT** disclose the vulnerability publicly until it has been addressed by our team.

### Reporting Process

1. **Email**: Send details to `security@solanapvp.com` (update with your actual contact)
2. **Discord**: Contact us on our Discord server (provide link)
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

## Scope

### In Scope

- Solana smart contract vulnerabilities (Solana_SC/programs/)
- Backend API vulnerabilities (API/)
- Frontend security issues (FRONT/)
- Authentication and authorization flaws
- Data exposure or leakage
- Economic exploits in game logic

### Out of Scope

- Third-party services (Switchboard VRF, Solana RPC)
- Social engineering attacks
- Physical security
- DoS attacks against public infrastructure

## Security Features

### Smart Contract

- VRF-based randomness via Switchboard v2
- PDA-based access control
- Refund mechanism with time locks
- Protected state transitions
- Careful handling of remaining accounts

### Backend

- SignalR for real-time updates
- SQLite database with EF Core
- Input validation and sanitization
- Proper error handling

### Frontend

- Wallet adapter integration
- Transaction signing verification
- Input sanitization
- HTTPS enforcement (production)

## Known Limitations

1. **Devnet Deployment**: Currently deployed on Solana devnet for testing
2. **VRF Setup**: Requires proper Switchboard VRF configuration
3. **Refund Window**: 2-minute minimum before refunds allowed
4. **Testing**: Smart contract is in active development

## Bug Bounty Program

_Coming Soon_ - We plan to launch a bug bounty program once the platform is on mainnet.

## Security Best Practices for Users

1. **Never share your private keys**
2. **Verify transaction details** before signing
3. **Use hardware wallets** for large amounts
4. **Check program addresses** before interacting
5. **Be cautious of phishing** attempts

## Audit Status

- [ ] Smart Contract Audit - Pending
- [ ] Backend Security Review - Pending
- [ ] Frontend Security Review - Pending

## Contact

- Security Email: `security@solanapvp.com` (update this)
- Project Website: `https://solanapvp.com` (update this)
- GitHub: `https://github.com/your-org/solanapvp` (update this)
- Discord: [Your Discord Link] (update this)

## Acknowledgments

We appreciate security researchers who help keep SolanaPvP safe. Acknowledged researchers will be listed here (with permission).

---

**Last Updated**: November 2, 2025
