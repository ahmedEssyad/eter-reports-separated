/**
 * Create Admin User Script
 * Run this script to create an admin user in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const createAdmin = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const adminData = {
            username: 'admin',
            password: 'admin123',
            name: 'Administrator',
            role: 'admin',
            isActive: true
        };

        const admin = await User.createAdmin(adminData);
        console.log('✅ Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('⚠️  Please change the password after first login!');

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
};

// Run the script
createAdmin();