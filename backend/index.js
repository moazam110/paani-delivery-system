import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import customerRoutes from './routes/customerRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import authRoutes from './routes/authRoutes.js';
// Add other route imports here as needed

dotenv.config();

const app = express();
app.use(express.json());

let dbConnected = false;

// ✅ Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    dbConnected = true;
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    dbConnected = false;
  }
};

// ✅ Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Paani Delivery System Backend API',
    version: '1.0.0',
    status: 'Running',
    database: dbConnected ? 'Connected' : 'Disconnected',
    endpoints: {
      health: '/api/health',
      customers: '/api/customers',
      deliveryRequests: '/api/delivery-requests',
      dashboardMetrics: '/api/dashboard/metrics',
      testCustomer: '/api/test-customer (POST)',
      auth: {
        login: '/api/auth/login (POST)',
        register: '/api/auth/register (POST)',
      },
      notifications: '/api/notifications',
      upload: '/api/upload (POST)',
    },
  });
});

// ✅ API Routes
app.use('/api/customers', customerRoutes);
app.use('/api/delivery-requests', deliveryRoutes);
app.use('/api/auth', authRoutes);
// Add other `app.use` lines here if you have more routes

const PORT = process.env.PORT || 10000;

// ✅ Start Server after DB connects
(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();
