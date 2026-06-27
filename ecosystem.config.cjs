/**
 * ecosystem.config.cjs — PM2 Configuration
 * Cluster mode for production reliability and performance.
 */
module.exports = {
  apps: [
    {
      name: 'v79-tickit-backend',
      script: 'server/index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
