require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const { users, branches } = require('./schema');
const { eq } = require('drizzle-orm');

async function ensureData() {
  const dbUrl = process.env.DATABASE_URL || process.env.DB_URL || process.env.ATABASE_URL;
  if (!dbUrl) {
    console.error('❌ No DATABASE_URL found');
    process.exit(1);
  }

  const queryClient = postgres(dbUrl);
  const schema = require('./schema');
  const db = drizzle(queryClient, { schema });

  console.log('🔍 Checking for core data...');
  
  try {
    // 1. Ensure at least one branch
    let branch = await db.query.branches.findFirst();
    if (!branch) {
      console.log('🌱 Creating default branch...');
      const [newBranch] = await db.insert(branches).values({
        name: 'Main Branch',
        location: 'Default Location',
        active: true
      }).returning();
      branch = newBranch;
      console.log('✅ Default branch created.');
    }

    // 2. Ensure Admin
    const adminUser = await db.query.users.findFirst({
        where: eq(users.username, 'admin')
    });

    const hashedPassword = await bcrypt.hash('password123', 12);

    if (!adminUser) {
      console.log('🌱 Creating admin user...');
      await db.insert(users).values({
        username: 'admin',
        password: hashedPassword,
        fullName: 'System Admin',
        role: 'admin',
        active: true
      });
      console.log('✅ Admin created: admin / password123');
    }

    // 3. Ensure Cashier (for the cashier app testing)
    const cashierUser = await db.query.users.findFirst({
        where: eq(users.username, 'cashier')
    });
    if (!cashierUser) {
        console.log('🌱 Creating cashier user...');
        await db.insert(users).values({
            username: 'cashier',
            password: hashedPassword,
            fullName: 'Main Cashier',
            role: 'cashier',
            branchId: branch.id,
            active: true
        });
        console.log('✅ Cashier created: cashier / password123');
    }

    // 4. Ensure Staff (for the staff app testing)
    const staffUser = await db.query.users.findFirst({
        where: eq(users.username, 'staff')
    });
    if (!staffUser) {
        console.log('🌱 Creating staff user...');
        await db.insert(users).values({
            username: 'staff',
            password: hashedPassword,
            fullName: 'Main Staff',
            role: 'staff',
            branchId: branch.id,
            active: true
        });
        console.log('✅ Staff created: staff / password123');
    }

    console.log('🎉 Setup check complete.');
  } catch (err) {
    console.error('❌ Error during data setup:', err);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

ensureData();
