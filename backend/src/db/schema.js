const { pgTable, text, timestamp, integer, serial, boolean, doublePrecision, json, pgEnum, uniqueIndex } = require('drizzle-orm/pg-core');
const { relations } = require('drizzle-orm');

// ── Enums ──────────────────────────────────────────────
const roleEnum = pgEnum('role', ['admin', 'cashier', 'staff']);
const queueStatusEnum = pgEnum('queue_status', [
  'waiting', 'called', 'in_session', 'selecting',
  'print_requested', 'printing', 'done', 'cancelled'
]);
const shiftStatusEnum = pgEnum('shift_status', ['open', 'closed']);
const boothStatusEnum = pgEnum('booth_status', ['available', 'busy', 'maintenance']);

// ── Branches ───────────────────────────────────────────
const branches = pgTable('Branch', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Users ──────────────────────────────────────────────
const users = pgTable('User', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name'),
  email: text('email'),
  role: text('role').default('staff').notNull(),
  branchId: integer('branch_id').references(() => branches.id),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Auth Sessions (NEW table) ──────────────────────────
const authSessions = pgTable('auth_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Themes ─────────────────────────────────────────────
const themes = pgTable('Theme', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  boothNumber: text('booth_number'),
  price: doublePrecision('price').notNull(),
  active: boolean('active').default(true).notNull(),
  color: text('color'),
  prefix: text('prefix').default('T'),
  maxCapacity: integer('max_capacity').default(4),
  branchId: integer('branch_id').references(() => branches.id),
});

// ── Packages ───────────────────────────────────────────
const packages = pgTable('Package', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  label: text('label').notNull(),
  price: doublePrecision('price').notNull(),
  description: text('description'),
  prints: integer('prints').default(0),
  active: boolean('active').default(true).notNull(),
  branchId: integer('branch_id').references(() => branches.id),
});

// ── Addons ─────────────────────────────────────────────
const addons = pgTable('Addon', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  price: doublePrecision('price').notNull(),
  active: boolean('active').default(true).notNull(),
  branchId: integer('branch_id').references(() => branches.id),
});

// ── Cafe Snacks ────────────────────────────────────────
const cafeSnacks = pgTable('CafeSnack', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  price: doublePrecision('price').notNull(),
  active: boolean('active').default(true).notNull(),
  branchId: integer('branch_id').references(() => branches.id),
});

// ── Promos ─────────────────────────────────────────────
const promos = pgTable('Promo', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  discount: doublePrecision('discount').notNull(),
  type: text('type').notNull(),
  active: boolean('active').default(true).notNull(),
  branchId: integer('branch_id').references(() => branches.id),
});

// ── Shifts ─────────────────────────────────────────────
const shifts = pgTable('Shift', {
  id: serial('id').primaryKey(),
  branchId: integer('branch_id').references(() => branches.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'),
  startingCash: doublePrecision('starting_cash').default(0).notNull(),
  endingCash: doublePrecision('ending_cash').default(0),
  totalExpenses: doublePrecision('total_expenses').default(0).notNull(),
  status: text('status').default('open').notNull(),
});

// ── Expenses ───────────────────────────────────────────
const expenses = pgTable('Expense', {
  id: serial('id').primaryKey(),
  shiftId: integer('shift_id').references(() => shifts.id).notNull(),
  amount: doublePrecision('amount').notNull(),
  description: text('description').notNull(),
  time: timestamp('time').defaultNow().notNull(),
});

// ── Booths (defined BEFORE queues) ─────────────────────
const booths = pgTable('Booth', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  themeId: integer('theme_id').references(() => themes.id).notNull(),
  status: text('status').default('available').notNull(),
  branchId: integer('branch_id').references(() => branches.id),
});

// ── Transactions ───────────────────────────────────────
const transactions = pgTable('Transaction', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  themeId: integer('theme_id').references(() => themes.id),
  packageName: text('package_name').notNull(),
  paymentMethod: text('payment_method').notNull(),
  totalPrice: doublePrecision('total_price').notNull(),
  status: text('status').default('waiting').notNull(),
  addons: json('addons'),
  cafeSnacks: json('cafe_snacks'),
  promo: text('promo'),
  peopleCount: integer('people_count').default(1).notNull(),
  note: text('note'),
  branchId: integer('branch_id').references(() => branches.id),
  shiftId: integer('shift_id').references(() => shifts.id),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Queue ──────────────────────────────────────────────
const queues = pgTable('Queue', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').references(() => transactions.id).notNull(),
  themeId: integer('theme_id').references(() => themes.id).notNull(),
  boothId: integer('booth_id').references(() => booths.id),
  queueNumber: integer('queue_number').notNull(),
  status: text('status').default('waiting').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Settings ───────────────────────────────────────────
const settings = pgTable('Setting', {
  id: serial('id').primaryKey(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  branchId: integer('branch_id').references(() => branches.id),
}, (table) => ({
  branchKeyIdx: uniqueIndex('Setting_branch_id_key_key').on(table.branchId, table.key),
}));

// ── Relations ──────────────────────────────────────────
const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  transactions: many(transactions),
  themes: many(themes),
  booths: many(booths),
  shifts: many(shifts),
  settings: many(settings),
}));

const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
  shifts: many(shifts),
  transactions: many(transactions),
  authSessions: many(authSessions),
}));

const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

const themesRelations = relations(themes, ({ one, many }) => ({
  branch: one(branches, { fields: [themes.branchId], references: [branches.id] }),
  queues: many(queues),
  transactions: many(transactions),
  booths: many(booths),
}));

const transactionsRelations = relations(transactions, ({ one, many }) => ({
  branch: one(branches, { fields: [transactions.branchId], references: [branches.id] }),
  theme: one(themes, { fields: [transactions.themeId], references: [themes.id] }),
  shift: one(shifts, { fields: [transactions.shiftId], references: [shifts.id] }),
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  queue: many(queues),
}));

const queuesRelations = relations(queues, ({ one }) => ({
  transaction: one(transactions, { fields: [queues.transactionId], references: [transactions.id] }),
  theme: one(themes, { fields: [queues.themeId], references: [themes.id] }),
  booth: one(booths, { fields: [queues.boothId], references: [booths.id] }),
}));

const boothsRelations = relations(booths, ({ one, many }) => ({
  branch: one(branches, { fields: [booths.branchId], references: [branches.id] }),
  theme: one(themes, { fields: [booths.themeId], references: [themes.id] }),
  queues: many(queues),
}));

const shiftsRelations = relations(shifts, ({ one, many }) => ({
  branch: one(branches, { fields: [shifts.branchId], references: [branches.id] }),
  user: one(users, { fields: [shifts.userId], references: [users.id] }),
  transactions: many(transactions),
  expenses: many(expenses),
}));

const expensesRelations = relations(expenses, ({ one }) => ({
  shift: one(shifts, { fields: [expenses.shiftId], references: [shifts.id] }),
}));

const settingsRelations = relations(settings, ({ one }) => ({
  branch: one(branches, { fields: [settings.branchId], references: [branches.id] }),
}));

module.exports = {
  // enums
  roleEnum, queueStatusEnum, shiftStatusEnum, boothStatusEnum,
  // tables
  branches, users, authSessions, themes, packages, addons, cafeSnacks, promos,
  shifts, expenses, transactions, queues, booths, settings,
  // relations
  branchesRelations, usersRelations, authSessionsRelations, themesRelations,
  transactionsRelations, queuesRelations, boothsRelations, shiftsRelations,
  expensesRelations, settingsRelations,
};
