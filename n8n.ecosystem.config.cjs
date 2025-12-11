module.exports = {
  apps: [{
    name: 'n8n',
    script: '/usr/local/bin/n8n',
    args: 'start',
    cwd: '/var/www/clowee-erp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      N8N_HOST: '0.0.0.0',
      N8N_PORT: '5678',
      N8N_PROTOCOL: 'https',
      N8N_WEBHOOK_URL: 'https://n8n.sohub.com.bd/'
    },
    env_development: {
      NODE_ENV: 'development',
      N8N_HOST: '0.0.0.0',
      N8N_PORT: '5678',
      N8N_PROTOCOL: 'https',
      N8N_WEBHOOK_URL: 'https://n8n.sohub.com.bd/'
    }
  }]
};