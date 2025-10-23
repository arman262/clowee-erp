#!/bin/bash

echo "🚀 Deploying Clowee ERP on Port 9990"
echo "======================================"

# Stop existing PM2 processes
echo "📦 Stopping existing PM2 processes..."
pm2 stop all
pm2 delete all

# Kill any process using port 9990
echo "🔍 Checking for processes on port 9990..."
PORT_PID=$(lsof -ti:9990)
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  Killing process $PORT_PID on port 9990..."
    kill -9 $PORT_PID
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Start PM2 with new configuration
echo "▶️  Starting PM2 processes..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show status
echo ""
echo "✅ Deployment Complete!"
echo "======================================"
pm2 status
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://202.59.208.112:9990"
echo "   Backend:  http://202.59.208.112:3008"
echo ""
echo "📊 View logs: pm2 logs"
echo "🔄 Restart:   pm2 restart all"
