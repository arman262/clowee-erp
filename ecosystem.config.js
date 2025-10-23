module.exports = {
  apps: [
    {
      name: 'clowee-erp-server',
      cwd: './server',
      script: 'index.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'clowee-erp-client',
      script: 'npm',
      args: 'run build && npx serve -s dist -l 9990',
      env: {
        NODE_ENV: 'production',
        PORT: '9990'
      }
    }
  ]
};