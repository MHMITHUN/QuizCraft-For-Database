const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: '../.env' });
dotenv.config();

const promoteToAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[db] Connected to MongoDB\n');

    const targetEmail = process.env.ADMIN_EMAIL;
    const targetPassword = process.env.ADMIN_PASSWORD;

    if (!targetEmail || !targetPassword) {
      console.error('[error] ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
      process.exit(1);
    }

    console.log(`Target admin email: ${targetEmail}\n`);

    // Step 1: Delete all existing admins
    const existingAdmins = await User.find({ role: 'admin' });
    if (existingAdmins.length > 0) {
      console.log(`[action] Found ${existingAdmins.length} existing admin(s):`);
      existingAdmins.forEach(admin => console.log(`  - ${admin.email}`));
      
      await User.deleteMany({ role: 'admin' });
      console.log(`[success] Deleted all existing admin accounts\n`);
    }

    // Step 2: Find user with target email
    const targetUser = await User.findOne({ email: targetEmail });

    if (targetUser) {
      console.log(`[info] Found existing user with email ${targetEmail}`);
      console.log(`  Current role: ${targetUser.role}`);
      console.log(`  Name: ${targetUser.name}`);
      
      console.log(`\n[action] Promoting user to admin...`);
      
      // Promote to admin and update settings
      targetUser.role = 'admin';
      targetUser.password = targetPassword;
      targetUser.subscription = {
        plan: 'institutional',
        isActive: true
      };
      targetUser.isEmailVerified = true;
      targetUser.emailVerifiedAt = new Date();
      
      await targetUser.save();
      
      console.log(`[success] ✅ User promoted to admin successfully!`);
      console.log(`\nAdmin Account:`);
      console.log(`  Email: ${targetUser.email}`);
      console.log(`  Name: ${targetUser.name}`);
      console.log(`  Role: ${targetUser.role}`);
      console.log(`  Password: ${targetPassword}`);
    } else {
      console.log(`[info] No existing user found with email ${targetEmail}`);
      console.log(`[action] Creating new admin account...`);
      
      const newAdmin = await User.create({
        name: 'Admin',
        email: targetEmail,
        password: targetPassword,
        role: 'admin',
        subscription: {
          plan: 'institutional',
          isActive: true
        },
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      });

      console.log(`[success] ✅ New admin account created!`);
      console.log(`\nAdmin Account:`);
      console.log(`  Email: ${newAdmin.email}`);
      console.log(`  Name: ${newAdmin.name}`);
      console.log(`  Role: ${newAdmin.role}`);
      console.log(`  Password: ${targetPassword}`);
    }

    console.log(`\n👉 You can now login with:`);
    console.log(`   Email: ${targetEmail}`);
    console.log(`   Password: ${targetPassword}`);
    console.log(`👉 2FA codes will be sent to: ${targetEmail}`);

    process.exit(0);
  } catch (error) {
    console.error('[error]', error.message);
    process.exit(1);
  }
};

promoteToAdmin();
