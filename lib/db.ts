import { Sequelize } from 'sequelize';

// Only import and initialize on the server side
if (typeof window !== 'undefined') {
  throw new Error('This module should only be used on the server side');
}

// Validate environment variables
const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASS', 'DB_HOST', 'DB_PORT'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASS!,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    dialectModule: require('mysql2'), // Explicitly specify the dialect module
    logging: false,
  }
);
