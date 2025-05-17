// ecosystem.config.js
require("dotenv").config(); // load .env into process.env

module.exports = {
  apps: [
    {
      name: "mvps-print",
      script: "src/backend/index.js",
      // node_args: '--experimental-modules', // if you need ESM flags
      env: {
        NODE_ENV: "production",
        // everything in process.env (including AWS_*, DB_*, etc) is already loaded
      },
    },
  ],
};
