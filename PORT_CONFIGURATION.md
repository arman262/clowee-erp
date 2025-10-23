# Port Configuration Guide

## Overview
This application is now configured to run on **port 9990** by default.

## Configuration Files Updated

### 1. Frontend Configuration
- **File**: `vite.config.ts`
- **Port**: 9990
- **Feature**: `strictPort: true` prevents automatic fallback to other ports

### 2. Environment Variables
- **File**: `.env`
- **Variables**:
  - `VITE_PORT=9990` - Frontend port
  - `VITE_API_URL=http://202.59.208.112:3008` - Backend API URL

### 3. PM2 Deployment
- **File**: `ecosystem.config.js`
- **Port**: 9990 for production build
- **Backend**: Port 3008 (unchanged)

### 4. API Client
- **File**: `src/integrations/postgres/client.ts`
- Uses `VITE_API_URL` environment variable

## How to Run

### Development Mode
```bash
npm run dev
```
Frontend: http://202.59.208.112:9990
Backend: http://202.59.208.112:3008

### Production Mode with PM2
```bash
# Stop existing processes
pm2 stop all
pm2 delete all

# Start with new configuration
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

## Verification

1. Check if port 9990 is in use:
```bash
lsof -i :9990
```

2. Check PM2 status:
```bash
pm2 status
pm2 logs
```

3. Access the application:
- Frontend: http://202.59.208.112:9990
- Backend API: http://202.59.208.112:3008

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 9990
lsof -i :9990

# Kill the process
kill -9 <PID>
```

### PM2 Not Starting
```bash
# Check logs
pm2 logs clowee-erp-client

# Restart
pm2 restart clowee-erp-client
```

### Environment Variables Not Loading
Ensure `.env` file exists and contains:
```
VITE_PORT=9990
VITE_API_URL=http://202.59.208.112:3008
```

## Files Modified
1. `/vite.config.ts` - Added port 9990 and strictPort
2. `/.env` - Added VITE_PORT and VITE_API_URL
3. `/ecosystem.config.js` - Updated production port to 9990
4. `/src/integrations/postgres/client.ts` - Use env variable
5. `/src/hooks/useFranchiseAgreements.ts` - Use env variable
6. `/src/hooks/useBankMoneyLogs.ts` - Use env variable
7. `/src/components/ui/file-upload.tsx` - Use env variable
