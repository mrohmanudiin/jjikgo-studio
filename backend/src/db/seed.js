require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const { 
  branches, users, authSessions, themes, packages, addons, cafeSnacks, promos,
  shifts, expenses, transactions, queues, booths, settings
} = require('./schema');

async function seed() {
  const queryClient = postgres(process.env.DATABASE_URL);
  const db = drizzle(queryClient);

  console.log('🌱 Clearing existing database data...');
  
  // Clear tables in reverse dependency order
  await db.delete(queues);
  await db.delete(transactions);
  await db.delete(expenses);
  await db.delete(shifts);
  await db.delete(booths);
  await db.delete(themes);
  await db.delete(promos);
  await db.delete(cafeSnacks);
  await db.delete(addons);
  await db.delete(packages);
  await db.delete(authSessions);
  await db.delete(settings);
  await db.delete(users);
  await db.delete(branches);

  console.log('🌱 Inserting new dummy data...');

  // ── 1. Create Branches ──────────────────────────────
  const insertedBranches = await db.insert(branches).values([
    { name: 'Hongdae Base', location: 'Hongdae, Seoul' },
    { name: 'Gangnam Studio', location: 'Gangnam, Seoul' },
    { name: 'Myeongdong Central', location: 'Myeongdong, Seoul' }
  ]).returning();

  console.log(`✅ Created ${insertedBranches.length} branches`);

  // ── 2. Create Users ─────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);
  const insertedUsers = [];
  
  // Global admin just in case
  const [globalAdmin] = await db.insert(users).values({
    username: 'admin', password: hashedPassword, fullName: 'Super Admin', role: 'admin', branchId: null
  }).returning();
  insertedUsers.push(globalAdmin);

  for (const branch of insertedBranches) {
    const slug = branch.name.split(' ')[0].toLowerCase(); // e.g., hongdae
    
    const branchUsers = await db.insert(users).values([
      { username: `admin_${slug}`, password: hashedPassword, fullName: `Admin ${branch.name}`, role: 'admin', branchId: branch.id },
      { username: `cashier_${slug}`, password: hashedPassword, fullName: `Cashier ${branch.name}`, role: 'cashier', branchId: branch.id },
      { username: `staff_${slug}`, password: hashedPassword, fullName: `Staff ${branch.name}`, role: 'staff', branchId: branch.id }
    ]).returning();
    
    insertedUsers.push(...branchUsers);
  }

  console.log(`✅ Created 1 global admin and 3 users per branch. Password for all: password123`);

  // ── 3. Create Settings & Global Items ───────────────
  const insertedPackages = await db.insert(packages).values([
    { slug: 'basic-2', label: 'Basic 2 Prints', price: 4000, prints: 2 },
    { slug: 'basic-4', label: 'Basic 4 Prints', price: 8000, prints: 4 },
    { slug: 'premium-2', label: 'Premium 2 Prints', price: 6000, prints: 2 },
  ]).returning();

  const insertedAddons = await db.insert(addons).values([
    { label: 'Retouch', price: 1000 },
    { label: 'Digital File', price: 2000 },
    { label: 'Extra Time', price: 5000 }
  ]).returning();

  console.log(`✅ Created packages and addons`);

  // ── 4. Create Themes ────────────────────────────────
  const themeData = [
    { name: 'Classic Y2K', price: 5000, color: '#ff66b2', prefix: 'Y2K', maxCapacity: 4 },
    { name: 'Dark Mode', price: 6000, color: '#333333', prefix: 'DRK', maxCapacity: 2 },
    { name: 'Neon Lights', price: 7000, color: '#00ffcc', prefix: 'NEO', maxCapacity: 6 },
    { name: 'Vintage Film', price: 5500, color: '#d2b48c', prefix: 'VTG', maxCapacity: 4 },
    { name: 'ID Photo', price: 8000, color: '#ffffff', prefix: 'ID', maxCapacity: 1 },
    { name: 'Pet Friendly', price: 7000, color: '#ffb347', prefix: 'PET', maxCapacity: 4 },
  ];

  const insertedThemes = [];
  for (const t of themeData) {
    const [theme] = await db.insert(themes).values(t).returning();
    insertedThemes.push(theme);
  }

  console.log(`✅ Created ${insertedThemes.length} themes`);

  // ── 5. Create Booths ────────────────────────────────
  const insertedBooths = [];
  for (const branch of insertedBranches) {
    for (let i = 0; i < insertedThemes.length; i++) {
        const theme = insertedThemes[i];
        const [booth] = await db.insert(booths).values({
            name: `${branch.name.split(' ')[0]} - Booth ${i + 1}`,
            themeId: theme.id,
            branchId: branch.id,
            status: 'available'
        }).returning();
        insertedBooths.push(booth);
    }
  }

  console.log(`✅ Created booths for each branch`);

  // ── 6. Create Shifts ────────────────────────────────
  const shiftStartTime = new Date();
  shiftStartTime.setHours(8, 0, 0, 0); // Started at 8 AM today

  const insertedShifts = [];
  for (const branch of insertedBranches) {
    const cashier = insertedUsers.find(u => u.branchId === branch.id && u.role === 'cashier');
    if (cashier) {
        const [shift] = await db.insert(shifts).values({
            branchId: branch.id,
            userId: cashier.id,
            startTime: shiftStartTime,
            startingCash: 100000,
            status: 'open'
        }).returning();
        insertedShifts.push(shift);
    }
  }

  console.log(`✅ Created active shifts for cashiers`);

  // ── 7. Create Transactions & Queues ─────────────────
  let globalInvoiceCounter = 1;

  for (const branch of insertedBranches) {
    const branchShift = insertedShifts.find(s => s.branchId === branch.id);
    const branchBooths = insertedBooths.filter(b => b.branchId === branch.id);
    const cashier = insertedUsers.find(u => u.branchId === branch.id && u.role === 'cashier');

    let queueNumber = 1;

    // We will create exactly 25 transactions per branch
    for (let i = 0; i < 25; i++) {
        const theme = insertedThemes[i % insertedThemes.length];
        const pkg = insertedPackages[i % insertedPackages.length];
        const booth = branchBooths.find(b => b.themeId === theme.id);
        
        // Randomize status specifically for dummy data spread
        // 60% done, then the rest a mix of active states
        let queueStatus;
        const rand = Math.random();
        if (rand < 0.6) queueStatus = 'done';
        else if (rand < 0.7) queueStatus = 'waiting';
        else if (rand < 0.8) queueStatus = 'in_session';
        else if (rand < 0.9) queueStatus = 'selecting';
        else queueStatus = 'printing';

        // Transaction status: generally 'waiting' unless queue is 'done' or 'cancelled' (which makes it 'completed' but schema says default 'waiting' or enum not enforced, actually transaction doesn't have strict enum but we use 'done' or 'waiting')
        const txStatus = queueStatus === 'done' ? 'done' : 'waiting';

        const createdAt = new Date();
        // Spread the transactions from 9 AM to current hour
        createdAt.setHours(9 + Math.floor(i / 2), (i * 15) % 60, 0, 0);

        const dateStr = createdAt.toISOString().slice(0,10).replace(/-/g, '');
        const invoiceNumber = `INV-${dateStr}-${String(globalInvoiceCounter++).padStart(4, '0')}`;
        
        // Price formula
        let extraAddons = [];
        let addonsPrice = 0;
        if (i % 3 === 0) {
           extraAddons.push({ label: 'Retouch', price: 1000 });
           addonsPrice += 1000;
        }

        const [tx] = await db.insert(transactions).values({
            invoiceNumber,
            customerName: `Customer ${branch.name.split(' ')[0]} ${i + 1}`,
            customerEmail: i % 4 === 0 ? `customer${i}@example.com` : null,
            themeId: theme.id,
            packageName: pkg.label,
            paymentMethod: i % 3 === 0 ? 'cash' : 'card',
            totalPrice: theme.price + pkg.price + addonsPrice,
            status: txStatus,
            addons: extraAddons.length > 0 ? extraAddons : null,
            peopleCount: (i % 4) + 1,
            branchId: branch.id,
            shiftId: branchShift.id,
            userId: cashier.id,
            createdAt
        }).returning();

        // Ensure session times align roughly with updated queue status if we want to be realistic,
        // but simple defaults are fine for the Queue entries
        await db.insert(queues).values({
            transactionId: tx.id,
            themeId: theme.id,
            boothId: queueStatus !== 'waiting' ? booth.id : null, // Not assigned booth if waiting
            queueNumber: queueNumber++,
            status: queueStatus,
            createdAt
        });
    }
  }

  console.log(`✅ Created transactions and populated queue entries`);
  console.log('🎉 Seeding successfully completed!');
  
  await queryClient.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
