const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: '../.env' });
dotenv.config();

const updateAdminEmail = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[db] Connected to MongoDB');

    const newEmail = process.env.ADMIN_EMAIL;
    const newPassword = process.env.ADMIN_PASSWORD;

    if (!newEmail || !newPassword) {
      console.error('[error] ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file');
      process.exit(1);
    }

    // Find all admin users
    const existingAdmins = await User.find({ role: 'admin' });
    
    if (existingAdmins.length === 0) {
      console.log('[info] No admin users found. Creating new admin...');
      
      const admin = await User.create({
        name: 'Admin',
        email: newEmail,
        password: newPassword,
        role: 'admin',
        subscription: {
          plan: 'institutional',
          isActive: true
        },
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      });

      console.log('[success] Admin user created successfully');
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      process.exit(0);
    }

    console.log(`[info] Found ${existingAdmins.length} existing admin(s)`);
    
    // Check if new email already exists
    const emailExists = existingAdmins.some(admin => admin.email === newEmail);
    
    if (emailExists) {
      console.log('[info] Admin with this email already exists');
      const admin = existingAdmins.find(admin => admin.email === newEmail);
      
      // Update password if different
      const isPasswordSame = await admin.comparePassword(newPassword);
      if (!isPasswordSame) {
        admin.password = newPassword;
        await admin.save();
        console.log('[update] Admin password updated');
      }
      
      console.log('[success] Admin user is up to date');
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      process.exit(0);
    }

    // If email is different, ask what to do
    console.log('\n[action] Admin email change detected!');
    console.log('Old admin(s):');
    existingAdmins.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.email}`);
    });
    console.log(`New admin email from .env: ${newEmail}`);
    
    console.log('\n[options] Choose an action:');
    console.log('1. Delete all old admins and create new admin with new email');
    console.log('2. Update the first admin\'s email (keep same user)');
    console.log('3. Keep old admins and add new admin (multiple admins)');
    
    // For automation, we'll update the first admin's email
    console.log('\n[auto] Updating first admin email...');
    
    const adminToUpdate = existingAdmins[0];
    adminToUpdate.email = newEmail;
    adminToUpdate.password = newPassword;
    await adminToUpdate.save();

    console.log('[success] Admin email updated successfully');
    console.log('New Email:', adminToUpdate.email);
    console.log('Role:', adminToUpdate.role);
    console.log('\nNote: Old admin data (history, created quizzes) is preserved.');

    process.exit(0);
  } catch (error) {
    console.error('[error] Error updating admin:', error);
    process.exit(1);
  }
};

updateAdminEmail();
