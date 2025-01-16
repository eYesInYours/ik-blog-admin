module.exports = {
  apps: [{
    name: 'ik-blog-admin',
    script: 'npm',
    args: 'run build:prod',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3333
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3333
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
} 