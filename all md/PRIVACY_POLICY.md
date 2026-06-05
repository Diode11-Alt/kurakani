# Privacy Policy

**Effective Date:** [INSERT DATE]  
**Last Updated:** [INSERT DATE]  
**App Name:** [Your App Name]  
**Company/Developer:** [Your Name / Company Name]  
**Contact:** privacy@[yourdomain.com]

---

## 1. Our Core Privacy Promise

[App Name] is built on a single principle: **we cannot read your messages, and neither can anyone else.**

We use end-to-end encryption (E2EE) for all messages, calls, and shared media. This means:

- Your messages are encrypted on your device before they leave it.
- Only you and the person you're communicating with can read them.
- We do not have the encryption keys. We cannot decrypt your messages even if legally compelled to.
- Our server acts as a blind relay — it routes encrypted blobs without ever seeing their contents.

---

## 2. What Information We Collect

### 2.1 Information You Provide

| Data | Purpose | Retained |
|------|---------|---------|
| Phone number (hashed) | Account identity verification | Until account deletion |
| Username | Display in-app | Until account deletion |
| Profile photo (encrypted) | Shown to your contacts | Until you delete it |
| Display name (optional) | Shown to contacts | Until you change or delete it |

**We do not collect:** Your real name, email address, birthday, gender, location, or any advertising identifiers.

### 2.2 Information Generated Automatically

| Data | Purpose | Retained |
|------|---------|---------|
| Public cryptographic keys | Enable encrypted messaging | Until account deletion |
| Message delivery metadata | Confirm message delivered | 30 days |
| Call metadata (duration, time — NOT audio/video content) | Call records | 30 days |
| Device registration ID | Multi-device support | Until device removed |
| Server access logs (IP address, timestamp) | Security and abuse prevention | 90 days |

### 2.3 What We Do NOT Collect or Store

- Message content (we only store encrypted ciphertext we cannot read)
- Call audio or video (WebRTC calls are peer-to-peer — never routed through our servers)
- Contact lists
- Location data
- Behavioral analytics or tracking data
- Advertising identifiers
- Third-party analytics (no Google Analytics, no Facebook SDK)

---

## 3. How We Use Your Information

We use your information **only** for:

1. Delivering your encrypted messages to recipients
2. Enabling voice and video calls (credential provisioning — not content)
3. Account security (detecting unauthorized access attempts)
4. Responding to your support requests

We **never** use your data for advertising, profiling, or selling to third parties.

---

## 4. Information Sharing

We share your information with:

### 4.1 Service Providers (Infrastructure)
- **Cloud hosting provider** — Stores encrypted database contents (they cannot read them)
- **Object storage (MinIO/S3)** — Stores encrypted file attachments (they cannot decrypt them)

These providers have access to encrypted data only. No provider has our encryption keys.

### 4.2 Legal Requirements

We may disclose information if required by a valid court order or legal process. **However**, because of our encryption architecture, the only information we can provide is:

- Whether a phone number hash exists in our system
- Account creation date and last connection date
- Number of messages sent (not content)
- IP address logs (if within 90-day retention)

We **cannot** provide message content, call content, or contacts.

We publish a [Transparency Report] annually listing all legal requests received.

### 4.3 Emergency Situations

If we receive credible information that someone's life is in immediate danger, we may share the limited metadata above with law enforcement without prior notice.

---

## 5. Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Account information | Until deletion + 30 days grace |
| Encrypted message ciphertext | Until delivered + 30 days |
| Undelivered messages | 30 days, then deleted |
| Server access logs | 90 days |
| Call metadata | 30 days |
| Deleted account data | 30 days, then permanently erased |

After account deletion, your data is permanently deleted within 30 days. There is no way to recover it after this period.

---

## 6. Your Rights

Depending on your location, you have the right to:

- **Access** — Request a copy of data we hold about you
- **Correction** — Update incorrect information
- **Deletion** — Delete your account and all associated data
- **Portability** — Export your data in a machine-readable format
- **Restriction** — Restrict processing of your data
- **Objection** — Object to certain types of processing

**GDPR (EU Users):** Contact us at privacy@[yourdomain.com] with "GDPR Request" in the subject. We respond within 30 days.

**CCPA (California Users):** We do not sell your personal information. Contact us to exercise your rights.

**To delete your account:** Go to Settings → Account → Delete Account in the app.

---

## 7. Security

- All client-server communication is encrypted with TLS 1.3 or higher.
- Messages are additionally end-to-end encrypted (TLS is not sufficient — we use application-layer encryption).
- Cryptographic keys are generated and stored on your device only.
- We use bcrypt (cost factor 12) for password hashing.
- We conduct regular security audits.
- We maintain a responsible disclosure program at security@[yourdomain.com].

---

## 8. Children's Privacy

[App Name] is not intended for users under 13 years of age (or the minimum age in your country). We do not knowingly collect information from children. If you believe a child has created an account, contact us at privacy@[yourdomain.com] and we will delete the account promptly.

---

## 9. International Data Transfers

Our servers are located in [Country/Region]. If you access [App Name] from another country, your data may be transferred to and processed in [Country/Region]. We comply with applicable data transfer regulations.

---

## 10. Changes to This Policy

We will notify you of material changes to this Privacy Policy via:
- In-app notification
- Notice on our website

Continued use of [App Name] after changes constitutes acceptance of the new policy. We will always maintain a history of previous policy versions.

---

## 11. Contact Us

**Privacy inquiries:** privacy@[yourdomain.com]  
**Security vulnerabilities:** security@[yourdomain.com]  
**General support:** support@[yourdomain.com]  
**Mailing address:** [Your Address]

---

> **Note to developer:** Before publishing this Privacy Policy:
> 1. Fill in all `[bracketed]` fields
> 2. Have a lawyer review it for your jurisdiction
> 3. Ensure it accurately reflects your actual data practices
> 4. Update it whenever you change data practices
> 5. This template is provided as a starting point, not legal advice
