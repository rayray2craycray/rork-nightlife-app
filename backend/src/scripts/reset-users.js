const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '.env.production' });

async function resetUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete existing demo users
    const result = await User.deleteMany({
      email: { $in: ['demo@rork.app', 'venue.owner@rork.app'] }
    });
    console.log(`🗑️  Deleted ${result.deletedCount} existing users`);

    // Create new users with properly hashed passwords
    const users = [
      {
        email: 'demo@rork.app',
        displayName: 'Demo User',
        password: 'Demo123!',
        isEmailVerified: true,
      },
      {
        email: 'venue.owner@rork.app',
        displayName: 'Venue Owner',
        password: 'VenueOwner123!',
        isEmailVerified: true,
        role: 'USER',
      },
    ];

    const createdUsers = await Promise.all(
      users.map(userData => User.create(userData))
    );

    console.log(`✅ Created ${createdUsers.length} users with hashed passwords`);
    console.log('📧 Demo accounts:');
    console.log('   demo@rork.app / Demo123!');
    console.log('   venue.owner@rork.app / VenueOwner123!');

    await mongoose.disconnect();
    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetUsers();
