const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: '../.env' });
dotenv.config();

const email = process.argv[2] || process.env.ADMIN_EMAIL;

const findUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[db] Connected to MongoDB\n');

    if (!email) {
      console.error('[error] Please provide an email');
      console.log('Usage: node findUserByEmail.js email@example.com');
      process.exit(1);
    }

    const users = await User.find({ email: email });
    
    if (users.length === 0) {
      console.log(`No user found with email: ${email}`);
    } else {
      console.log(`Found ${users.length} user(s) with email: ${email}\n`);
      
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user._id}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Email Verified: ${user.isEmailVerified}`);
        console.log(`  Active: ${user.isActive}`);
        console.log(`  Created: ${user.createdAt}`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('[error]', error.message);
    process.exit(1);
  }
};

findUser();
