# Port 9990 Configuration - Summary

## ✅ Changes Completed

### 1. Vite Development Server
**File**: `vite.config.ts`
```typescript
server: {
  host: "::",
  port: 9990,
  strictPort: true,  // ← Prevents fallback to 8080/8081
}
```

### 2. Environment Variables
**File**: `.env`
```env
VITE_PORT=9990
VITE_API_URL=http://202.59.208.112:3008
```

### 3. PM2 Production Deployment
**File**: `ecosystem.config.js`
```javascript
{
  name: 'clowee-erp-client',
  script: 'npm',
  args: 'run build && npx serve -s dist -l 9990',  // ← Changed from 8081
  env: {
    NODE_ENV: 'production',
    PORT: '9990'
  }
}
```

### 4. API Client Configuration
All API calls now use environment variables:
- `src/integrations/postgres/client.ts`
- `src/hooks/useFranchiseAgreements.ts`
- `src/hooks/useBankMoneyLogs.ts`
- `src/components/ui/file-upload.tsx`

## 🚀 Deployment Steps

### Quick Deploy
```bash
./deploy-port-9990.sh
```

### Manual Deploy
```bash
# 1. Stop existing processes
pm2 stop all
pm2 delete all

# 2. Kill any process on port 9990
lsof -ti:9990 | xargs kill -9

# 3. Build and start
npm run build
pm2 start ecosystem.config.js
pm2 save
```

## 🔍 Verification

### Check Application
- Frontend: http://202.59.208.112:9990
- Backend: http://202.59.208.112:3008

### Check Processes
```bash
pm2 status
pm2 logs
lsof -i :9990
```

## 🎯 Key Features

1. **Fixed Port**: Application always runs on 9990
2. **No Fallback**: `strictPort: true` prevents automatic port changes
3. **Environment-Based**: All URLs use environment variables
4. **Consistent**: Same port for dev and production

## 📝 Notes

- Backend API remains on port 3008
- Database remains on port 5433
- All file uploads use the configured API URL
- All API calls are centralized through environment variables

## 🔧 Troubleshooting

If port 9990 is already in use:
```bash
lsof -i :9990
kill -9 <PID>
```

If PM2 fails to start:
```bash
pm2 logs clowee-erp-client
pm2 restart clowee-erp-client
```
