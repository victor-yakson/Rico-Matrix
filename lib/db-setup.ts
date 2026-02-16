import { sequelize } from './db';
import { Visit } from './models/Visit';

export async function initializeDatabase() {
  try {
    // Test the connection
    await sequelize.authenticate();

    // Sync all models with the database
    // Use { force: true } only in development to recreate tables
    // Use { alter: true } to update existing tables without losing data
    await sequelize.sync({ alter: true });
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}
