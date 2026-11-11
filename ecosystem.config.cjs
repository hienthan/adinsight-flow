module.exports = {
  apps: [
    {
      name: 'pb-backend',
      cwd: '/Users/hienthan/Developments/GoogleAds/crawler-demo',
      script: 'pocketbase',
      args: 'serve --dir=/Users/hienthan/Developments/GoogleAds/crawler-demo/pb_data',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
    {
      name: 'pb-frontend',
      cwd: '/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend',
      script: 'npm',
      args: 'run dev',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
