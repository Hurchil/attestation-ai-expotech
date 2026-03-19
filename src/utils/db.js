const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Créer l'admin par défaut si nécessaire
    await createDefaultAdmin();
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createDefaultAdmin = async () => {
  const Admin = require('../models/Admin');
  
  const adminExists = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
  
  if (!adminExists && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    await Admin.create({
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD
    });
    console.log('Default admin created');
  }
};

module.exports = connectDB;