const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: '../.env' });
dotenv.config();

const switchAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[db] Connected to MongoDB\n');

    const newEmail = process.env.ADMIN_EMAIL;
    const newPassword = process.env.ADMIN_PASSWORD;

    if (!newEmail || !newPassword) {
      console.error('[error] ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
      process.exit(1);
    }

    // Find all existing admins
    const existingAdmins = await User.find({ role: 'admin' });
    
    console.log(`Current admin accounts: ${existingAdmins.length}`);
    existingAdmins.forEach(admin => {
      console.log(`  - ${admin.email}`);
    });

    console.log(`\nTarget admin email from .env: ${newEmail}\n`);

    // Check if target email already exists
    const targetExists = existingAdmins.find(admin => admin.email === newEmail);
    
    if (targetExists) {
      console.log('[info] Admin with target email already exists');
      console.log('[action] Updating password for existing admin...');
      
      targetExists.password = newPassword;
      await targetExists.save();
      
      // Delete other admins
      const othersDeleted = await User.deleteMany({ 
        role: 'admin', 
        email: { $ne: newEmail } 
      });
      
      console.log(`[success] Deleted ${othersDeleted.deletedCount} other admin(s)`);
      console.log(`[success] Admin account ready: ${newEmail}`);
      process.exit(0);
    }

    // Delete all existing admins
    console.log('[action] Removing old admin accounts...');
    const deleted = await User.deleteMany({ role: 'admin' });
    console.log(`[success] Deleted ${deleted.deletedCount} admin account(s)`);

    // Create new admin
    console.log('[action] Creating new admin account...');
    const newAdmin = await User.create({
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

    console.log('\n[success] ✅ Admin account created successfully!');
    console.log(`Email: ${newAdmin.email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`Role: ${newAdmin.role}`);
    console.log('\n👉 You can now login with this email and password');
    console.log('👉 2FA codes will be sent to:', newEmail);

    process.exit(0);
  } catch (error) {
    console.error('[error]', error.message);
    process.exit(1);
  }
};

switchAdmin();
