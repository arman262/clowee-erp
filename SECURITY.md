# Security Policy

## Security Measures Implemented

### Authentication & Authorization
- JWT-based authentication with 8-hour token expiry
- Strong 128-character cryptographic JWT secret
- Role-based access control (admin, user, spectator, super_admin)
- Strict login rate limiting (5 attempts per 15 minutes)
- Password hashing with bcrypt (12 rounds)

### API Security
- SQL injection prevention via parameterized queries
- Column name whitelist validation
- Table name whitelist validation
- Input validation using express-validator
- CORS restricted to production domain only
- Rate limiting (1000 requests per 15 minutes)

### Data Protection
- Password hashes excluded from API responses
- Sensitive data not logged
- Environment variables for all secrets
- Secure file permissions on .env (600)

### File Upload Security
- File type validation (PDF, JPG, JPEG, PNG only)
- File size limit (10MB)
- Random filename generation
- Directory traversal prevention

### HTTP Security Headers
- Helmet.js for security headers
- HSTS enabled (1 year, includeSubDomains, preload)
- Content Security Policy configured
- X-Frame-Options, X-Content-Type-Options enabled

### Infrastructure
- HTTPS enforced via Apache reverse proxy
- SSL certificate from Let's Encrypt
- PM2 process management with auto-restart
- Trust proxy configuration for rate limiting

## Reporting Security Issues

If you discover a security vulnerability, please email: security@tolpar.com.bd

Do NOT create public GitHub issues for security vulnerabilities.

## Security Best Practices

1. Never commit .env files
2. Rotate JWT_SECRET regularly
3. Keep dependencies updated
4. Monitor logs for suspicious activity
5. Use strong database passwords
6. Regularly backup database
7. Review user permissions periodically
8. Enable database SSL in production

## Environment Variables

Required environment variables (see .env.example):
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- JWT_SECRET (minimum 32 characters)
- PORT
- NODE_ENV (production/development)
