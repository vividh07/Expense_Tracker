const mongoose = require('mongoose');

let memoryServer;

const connectDB = async () => {
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-tracker';

  if (process.env.USE_MEMORY_DB === '1' || uri === 'memory') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('expense-tracker');
    console.log('Using in-memory MongoDB');
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Tip: set USE_MEMORY_DB=1 for local smoke tests, or use Atlas MONGODB_URI');
    process.exit(1);
  }
};

module.exports = connectDB;
