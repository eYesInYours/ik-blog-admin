module.exports = {
  apps: [{
    name: 'ik-blog-admin',           // 应用名称
    script: './node_modules/.bin/vite',  // 直接使用 vite 命令
    args: 'build',                   // 构建命令
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