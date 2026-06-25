# Release Update: Beta 1.8.6 — Cryptographic Remote Support Tokens & Security Hardening

We are thrilled to announce the release of **Beta 1.8.6**, a security-focused feature update that introduces secure, offline-compatible **Cryptographic Remote Support Tokens (Asymmetric Support Access)**. 

This release officially deprecates and replaces insecure backdoors or shared root passwords, providing a premium, hardware-locked support portal for local systems and self-hosted environments.

Here is a breakdown of what's new in this release:

## 1. Cryptographic Asymmetric Support Access
* Support verification is now completely offline-compatible using the Elliptic Curve Digital Signature Algorithm (ECDSA) with the NIST P-256 curve (ES256).
* The local system contains a hardcoded developer public key. When a remote support token is imported, the system verifies that the token's digital signature matches the public key and that the token has not expired.

## 2. Hardware-Locked System Access (Machine Binding)
* To prevent support tokens from being reused across different installations, each token is cryptographically bound to the client's local **Machine ID** (derived from network MAC addresses). 
* The system matches the token's target ID against the local hardware node, ensuring it only unlocks on the intended machine.

## 3. Ephemeral Sessions (Auto-Expiration)
* Authorized support sessions do not write any persistent accounts or backdoor roles to the database.
* The API signs an ephemeral session cookie with a virtual `support-admin-session` user ID that automatically self-terminates after a maximum of **24 hours**.

## 4. Premium Support Portal UI & Login Integration
* **Dedicated Support Interface**: A new `/support` portal displays the client's local Machine ID with one-click copy buttons and a token entry input.
* **Sign-In Redirection**: A secure Remote Support Portal quick-link is integrated directly into the primary login screen footer.

---
*Version 1.8.6 is now fully live and compiled on GitHub!*
