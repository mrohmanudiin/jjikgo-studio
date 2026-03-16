require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const { users } = require('./schema');
const { eq } = require('drizzle-orm');

async function ensureAdmin() {
  const dbUrl = process.env.DATABASE_URL || process.env.DB_URL || process.env.ATABASE_URL;
  if (!dbUrl) {
    console.error('❌ No DATABASE_URL found');
    process.exit(1);
  }

  const queryClient = postgres(dbUrl);
  const db = drizzle(queryClient);

  console.log('🔍 Checking for admin user...');
  
  try {
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists.');
    } else {
      console.log('🌱 Creating default admin user...');
      const hashedPassword = await bcrypt.hash('password123', 12);
      await db.insert(users).values({
        username: 'admin',
        password: hashedPassword,
        fullName: 'System Admin',
        role: 'admin',
        active: true
      });
      console.log('✅ Default admin created: admin / password123');
    }
  } catch (err) {
    console.error('❌ Error ensuring admin:', err);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

ensureAdmin();
