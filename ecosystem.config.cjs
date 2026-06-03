/**
 * PM2 process config for Hostinger VPS (or any Linux server).
 * Usage on server: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "vaidya-gpt",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 7111",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: "7111",
      },
    },
  ],
};
