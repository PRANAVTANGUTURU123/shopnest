// Adds sample users without touching existing data (unlike seed.js, which wipes the DB).
// Run with: node seedUsers.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const sampleUsers = [
  { name: 'Ravi Kumar', email: 'ravi.kumar@example.com', role: 'user' },
  { name: 'Sneha Patel', email: 'sneha.patel@example.com', role: 'user' },
  { name: 'Arjun Mehta', email: 'arjun.mehta@example.com', role: 'user' },
  { name: 'Priya Sharma', email: 'priya.sharma@example.com', role: 'user' },
  { name: 'Karan Singh', email: 'karan.singh@example.com', role: 'admin' }
];

const importUsers = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    for (const u of sampleUsers) {
      const exists = await User.findOne({ email: u.email });
      if (exists) {
        console.log(`⏭  Skipped (already exists): ${u.email}`);
        continue;
      }
      await User.create({ ...u, password: hashedPassword });
      console.log(`✅ Created: ${u.name} <${u.email}> [${u.role}]`);
    }

    console.log('\nDone. All sample users have password: password123');
    process.exit();
  } catch (error) {
    console.error(`❌ Error seeding users: ${error.message}`);
    process.exit(1);
  }
};

importUsers();
