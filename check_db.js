const { db } = require('./backend/src/config/db');
const { branches, users, transactions, queues, themes } = require('./backend/src/db/schema');

async function check() {
  try {
    const b = await db.select().from(branches);
    console.log('Branches:', b.length);
    if (b.length > 0) console.log('First branch:', b[0]);
    
    const u = await db.select().from(users);
    console.log('Users:', u.length);
    
    const t = await db.select().from(themes);
    console.log('Themes:', t.length);

    const tx = await db.select().from(transactions);
    console.log('Transactions:', tx.length);

    const q = await db.select().from(queues);
    console.log('Queues:', q.length);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
