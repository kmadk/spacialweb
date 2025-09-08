# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. Do NOT open a public GitHub issue

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Send a private report

Send details to **security@fir-spatial.dev** (if this email doesn't exist, use GitHub Security Advisories)

Include the following information:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (if you have them)

### 3. What to expect

- **Acknowledgment**: We'll acknowledge receipt within 48 hours
- **Initial Assessment**: We'll provide an initial assessment within 7 days
- **Updates**: We'll keep you informed of our progress
- **Resolution**: We'll work to resolve critical issues within 30 days

### 4. Coordinated Disclosure

- We'll work with you to understand and resolve the issue
- We'll coordinate public disclosure timing
- We'll credit you in our security advisory (if desired)

## Security Best Practices

When using FIR Spatial Web in production:

### Client-Side Security
- Always validate and sanitize user inputs
- Use Content Security Policy (CSP) headers
- Keep dependencies updated
- Be cautious with dynamic code execution

### Penpot File Processing
- Validate Penpot files before processing
- Sandbox file processing operations
- Limit file sizes and complexity
- Scan for malicious content

### WebGL Security
- Validate shader inputs
- Limit texture sizes and formats
- Monitor GPU memory usage
- Handle WebGL context loss gracefully

### Spatial Audio Security
- Respect user privacy with audio permissions
- Validate audio file sources
- Limit audio processing resources
- Handle audio context restrictions

## Known Security Considerations

### 1. Client-Side Processing
This library processes design files entirely on the client side. While this provides privacy benefits, ensure proper input validation.

### 2. WebGL Context
WebGL operations could potentially be exploited. We use established libraries (deck.gl) to minimize risks.

### 3. Dynamic Content Generation
Generated React components should be treated as potentially untrusted content in sensitive environments.

### 4. Spatial Audio
Spatial audio features require microphone/audio permissions. These are handled through standard browser APIs.

## Bug Bounty Program

Currently, we do not offer a formal bug bounty program. However, we greatly appreciate security researchers who help us maintain a secure codebase and will acknowledge contributions appropriately.

## Contact

For non-security issues, please use GitHub issues.
For security concerns: **security@fir-spatial.dev** or GitHub Security Advisories.

---

*This security policy is inspired by industry best practices and will be updated as our project evolves.*