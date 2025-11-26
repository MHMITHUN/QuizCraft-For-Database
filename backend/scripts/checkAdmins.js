const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: '../.env' });
dotenv.config();

const checkAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[db] Connected to MongoDB\n');

    const admins = await User.find({ role: 'admin' }).select('name email role isEmailVerified createdAt');
    
    console.log(`Found ${admins.length} admin account(s):\n`);
    
    admins.forEach((admin, index) => {
      console.log(`Admin ${index + 1}:`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Name: ${admin.name}`);
      console.log(`  Verified: ${admin.isEmailVerified}`);
      console.log(`  Created: ${admin.createdAt}`);
      console.log(`  ID: ${admin._id}`);
      console.log('');
    });

    console.log('Your .env configuration:');
    console.log(`  ADMIN_EMAIL: ${process.env.ADMIN_EMAIL}`);
    console.log(`  ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? '***' : 'NOT SET'}`);

    process.exit(0);
  } catch (error) {
    console.error('[error]', error);
    process.exit(1);
  }
};

checkAdmins();
