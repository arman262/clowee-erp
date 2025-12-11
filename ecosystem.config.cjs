module.exports = {
  apps: [
    {
      name: 'clowee-server',
      cwd: '/var/www/clowee-erp/server',
      script: 'npm',
      args: 'start'
    },
    {
      name: 'clowee-erp',
      cwd: '/var/www/html/web_apps/clowee-erp',
      script: './node_modules/.bin/vite',
      args: 'preview --port 9990 --host 0.0.0.0'
    }
  ]
};
