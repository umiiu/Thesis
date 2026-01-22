const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`
╔════════════════════════════════════╗
║  ✅ MongoDB Connected              ║
║  📊 Database: ${conn.connection.db.databaseName}
║  🖥️  Host: ${conn.connection.host}
╚════════════════════════════════════╝
    `);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed due to app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error(`
╔════════════════════════════════════╗
║  ❌ MongoDB Connection Failed      ║
╚════════════════════════════════════╝
    `);
        console.error('Error:', error.message);
        console.log('\n💡 Solutions:');
        console.log('   1. Make sure MongoDB is installed and running');
        console.log('   2. Check MONGODB_URI in .env file');
        console.log('   3. Start MongoDB: mongod');
        console.log('   4. Or use MongoDB Atlas (cloud)');
        process.exit(1);
    }
};

module.exports = connectDB;