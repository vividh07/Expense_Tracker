const mongoose = require('mongoose');

let memoryServer;

const isProduction = () => process.env.NODE_ENV === 'production';

const startMemory = async () => {
  if (isProduction()) {
    throw new Error('In-memory MongoDB is blocked when NODE_ENV=production');
  }
  const { MongoMemoryServer } = require('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri('expense-tracker');
  await mongoose.connect(uri);
  console.log('Using in-memory MongoDB (DEV ONLY — data clears when server stops)');
};

/**
 * Production (deploy laptop): real MongoDB only. No memory fallback.
 * Development (coding laptop): USE_MEMORY_DB=1 or auto-fallback if mongod is down.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-tracker';
  const wantMemory = process.env.USE_MEMORY_DB === '1' || uri === 'memory';

  if (isProduction() && wantMemory) {
    console.error('Refusing USE_MEMORY_DB / memory URI while NODE_ENV=production.');
    console.error('On the deploy laptop use a real MONGODB_URI and leave USE_MEMORY_DB unset.');
    process.exit(1);
  }

  if (wantMemory) {
    try {
      await startMemory();
      return;
    } catch (err) {
      console.error('Failed to start in-memory MongoDB:', err.message);
      process.exit(1);
    }
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (!isProduction()) {
      console.warn('DEV fallback → in-memory MongoDB (not for production).');
      try {
        await startMemory();
        return;
      } catch (memErr) {
        console.error('In-memory fallback failed:', memErr.message);
      }
    }
    console.error('Production requires a running MongoDB. Check MONGODB_URI / mongod service.');
    process.exit(1);
  }
};

module.exports = connectDB;
