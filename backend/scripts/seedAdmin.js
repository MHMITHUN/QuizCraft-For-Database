const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[db] Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });

    if (existingAdmin) {
      console.log('[seed] Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      subscription: {
        plan: 'institutional',
        isActive: true
      },
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });

    console.log('[seed] Admin user created successfully');
    console.log('Email:', admin.email);
    console.log('Password:', process.env.ADMIN_PASSWORD);
    console.log('Role:', admin.role);
    console.log('Please change the password after first login.');

    process.exit(0);
  } catch (error) {
    console.error('[seed] Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
