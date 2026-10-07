import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

const connectDatabase = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    
    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB connected: ${config.database.uri}`);
    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error(`MongoDB disconnection error: ${error.message}`);
    process.exit(1);
  }
};

export { connectDatabase, disconnectDatabase };
