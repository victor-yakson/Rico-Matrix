import { Sequelize } from 'sequelize';

// Only import and initialize on the server side
if (typeof window !== 'undefined') {
  throw new Error('This module should only be used on the server side');
}

const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const prefix = env === 'production' ? 'PROD_' : 'DEV_';

const getEnv = (key: string) =>
  process.env[`${prefix}${key}`] ?? process.env[key];

// Validate environment variables
const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASS', 'DB_HOST', 'DB_PORT'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !getEnv(envVar));

export const dbStatus = {
  enabled: missingEnvVars.length === 0,
  missing: missingEnvVars,
};

export const sequelize = dbStatus.enabled
  ? new Sequelize(getEnv('DB_NAME')!, getEnv('DB_USER')!, getEnv('DB_PASS')!, {
      host: getEnv('DB_HOST') || 'localhost',
      port: parseInt(getEnv('DB_PORT') || '3306'),
      dialect: 'mysql',
      dialectModule: require('mysql2'), // Explicitly specify the dialect module
      logging: false,
    })
  : null;
