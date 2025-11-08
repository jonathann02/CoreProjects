# Security Policy

## Security Standards

This project implements security controls based on:

### OWASP Application Security Verification Standard (ASVS) 5.0
- **V1: Architecture, Design and Threat Modeling** - Threat modeling completed
- **V2: Authentication** - JWT Bearer with secure defaults
- **V4: Access Control** - Policy-based authorization
- **V5: Input Validation** - Server-side validation with RFC 7807 ProblemDetails
- **V7: Error Handling and Logging** - Structured logging without sensitive data
- **V10: Malicious Code Search** - Static analysis with CodeQL
- **V11: Business Logic** - Input validation and business rule enforcement

### OWASP API Security Top 10 (2023)
- **API1:2023 Broken Object Level Authorization** - Implemented proper authorization checks
- **API2:2023 Broken Authentication** - JWT Bearer authentication
- **API3:2023 Broken Object Property Level Authorization** - Not applicable (no nested properties)
- **API4:2023 Unrestricted Resource Consumption** - Rate limiting implemented
- **API5:2023 Broken Function Level Authorization** - Policy-based access control
- **API6:2023 Unrestricted Access to Sensitive Business Flows** - Proper authentication required
- **API7:2023 Server Side Request Forgery** - Input validation prevents SSRF
- **API8:2023 Security Misconfiguration** - Secure defaults, environment-based config
- **API9:2023 Improper Inventory Management** - Single API version, OpenAPI documentation
- **API10:2023 Unsafe Consumption of APIs** - Secure HTTP client configuration

### NIST Secure Software Development Framework (SSDF) SP 800-218
- **PO.1.1: Protect Sensitive Information** - No secrets in code, environment variables
- **PO.2.1: Use Code Repositories** - Git with security scanning
- **PO.3.1: Use Build Tools** - Deterministic builds with locked dependencies
- **PS.1.1: Perform Static Analysis** - Code analysis enabled, warnings as errors
- **PS.2.1: Use Dynamic Analysis** - Integration testing with security scenarios
- **PW.1.1: Establish Trust Relationships** - Code signing (planned)
- **PW.2.1: Protect Integrity** - SLSA Level 1+ with GitHub Actions
- **RC.1.1: Regularly Perform Risk Analysis** - Threat modeling completed
- **RC.2.1: Protect Against Attacks** - Input validation, rate limiting, secure headers
- **SC.1.1: Supply Chain Risk Management** - Dependabot enabled
- **SC.2.1: Secure Development Environment** - CodeQL scanning
- **SC.3.1: Secure Deployment Infrastructure** - Container security scanning (planned)

### MITRE CWE Top 25 (2023)
Addressed vulnerabilities include:
- CWE-20: Improper Input Validation
- CWE-79: Cross-site Scripting (XSS)
- CWE-89: SQL Injection
- CWE-200: Information Disclosure
- CWE-284: Improper Access Control
- CWE-502: Deserialization of Untrusted Data

## Reporting Security Issues

Please report security vulnerabilities by creating an issue in this repository with the label "security".

## Security Controls

### Authentication & Authorization
- JWT Bearer tokens with configurable issuer/audience
- Policy-based authorization with "products:write" policy for mutations
- Secure defaults: authenticated users can read, only authorized can write

### Input Validation
- Server-side validation using DataAnnotations and FluentValidation
- RFC 7807 ProblemDetails for structured error responses
- Whitelist-based sorting and pagination parameters

### Data Protection
- EF Core with SQL Server, RowVersion for concurrency control
- Prepared statements prevent SQL injection
- Sensitive data not logged

### Infrastructure Security
- HTTPS redirection and HSTS in production
- Rate limiting (100 req/min per IP, 20 burst)
- Security headers (X-Content-Type-Options, etc.)
- CORS restricted to localhost in development

### Observability
- Structured logging without sensitive information
- OpenTelemetry for distributed tracing
- Health checks for liveness and readiness

### Supply Chain Security
- Reproducible builds with locked NuGet packages
- Dependabot for automated dependency updates
- CodeQL for static security analysis
- Container scanning (planned for CI/CD)
