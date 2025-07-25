/**
 * Configuration file for Paani Delivery System Backend
 */

const config = {
  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/paani',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 4000,
    environment: process.env.NODE_ENV || 'development',
  },

  // CORS Configuration
  cors: {
    origin: config => config.server.environment === 'production'
      ? ['https://paani-f.onrender.com']  // ✅ Your actual frontend URL
      : ['http://localhost:9002'],
    credentials: true,
  },
};

// ✅ Production-specific adjustments
if (config.server.environment === 'production') {
  config.mongodb.options.bufferCommands = false;
  config.mongodb.options.autoIndex = false;
}

module.exports = config;
