module.exports = {
  apps: [
    {
      name: "darknet-sim",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: "/www/wwwroot/darknet-market-sim",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        DATABASE_URL: "file:./prisma/dev.db",
        NEXTAUTH_URL: "http://你的域名或IP:3000",
        NEXTAUTH_SECRET: "change-me-to-a-random-string-at-least-32-chars",
      },
      autorestart: true,
      max_memory_restart: "500M",
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};