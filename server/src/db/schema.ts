import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer,
  boolean,
  pgEnum,
  varchar,
  foreignKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'processing', 'success', 'failed']);
export const depositStatusEnum = pgEnum('deposit_status', ['pending', 'completed', 'failed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  phone_number: varchar('phone_number', { length: 20 }),
  role: userRoleEnum('role').notNull().default('user'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Digital wallets table
export const walletsTable = pgTable('wallets', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  balance: numeric('balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userReference: foreignKey({
    columns: [table.user_id],
    foreignColumns: [usersTable.id]
  })
}));

// Deposit transactions table
export const depositsTable = pgTable('deposits', {
  id: serial('id').primaryKey(),
  wallet_id: integer('wallet_id').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  status: depositStatusEnum('status').notNull().default('pending'),
  payment_method: varchar('payment_method', { length: 100 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  walletReference: foreignKey({
    columns: [table.wallet_id],
    foreignColumns: [walletsTable.id]
  })
}));

// Product categories table
export const productCategoriesTable = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Digital products table
export const digitalProductsTable = pgTable('digital_products', {
  id: serial('id').primaryKey(),
  category_id: integer('category_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 15, scale: 2 }).notNull(),
  provider: varchar('provider', { length: 100 }).notNull(),
  product_code: varchar('product_code', { length: 50 }).notNull().unique(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  categoryReference: foreignKey({
    columns: [table.category_id],
    foreignColumns: [productCategoriesTable.id]
  })
}));

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  product_id: integer('product_id').notNull(),
  wallet_id: integer('wallet_id').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  customer_number: varchar('customer_number', { length: 50 }).notNull(),
  status: transactionStatusEnum('status').notNull().default('pending'),
  transaction_code: varchar('transaction_code', { length: 100 }).notNull().unique(),
  provider_reference: varchar('provider_reference', { length: 100 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userReference: foreignKey({
    columns: [table.user_id],
    foreignColumns: [usersTable.id]
  }),
  productReference: foreignKey({
    columns: [table.product_id],
    foreignColumns: [digitalProductsTable.id]
  }),
  walletReference: foreignKey({
    columns: [table.wallet_id],
    foreignColumns: [walletsTable.id]
  })
}));

// Sessions table for authentication
export const sessionsTable = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  user_id: integer('user_id').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userReference: foreignKey({
    columns: [table.user_id],
    foreignColumns: [usersTable.id]
  })
}));

// Define relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  wallet: one(walletsTable, {
    fields: [usersTable.id],
    references: [walletsTable.user_id]
  }),
  transactions: many(transactionsTable),
  sessions: many(sessionsTable)
}));

export const walletsRelations = relations(walletsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [walletsTable.user_id],
    references: [usersTable.id]
  }),
  deposits: many(depositsTable),
  transactions: many(transactionsTable)
}));

export const depositsRelations = relations(depositsTable, ({ one }) => ({
  wallet: one(walletsTable, {
    fields: [depositsTable.wallet_id],
    references: [walletsTable.id]
  })
}));

export const productCategoriesRelations = relations(productCategoriesTable, ({ many }) => ({
  products: many(digitalProductsTable)
}));

export const digitalProductsRelations = relations(digitalProductsTable, ({ one, many }) => ({
  category: one(productCategoriesTable, {
    fields: [digitalProductsTable.category_id],
    references: [productCategoriesTable.id]
  }),
  transactions: many(transactionsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id]
  }),
  product: one(digitalProductsTable, {
    fields: [transactionsTable.product_id],
    references: [digitalProductsTable.id]
  }),
  wallet: one(walletsTable, {
    fields: [transactionsTable.wallet_id],
    references: [walletsTable.id]
  })
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Wallet = typeof walletsTable.$inferSelect;
export type NewWallet = typeof walletsTable.$inferInsert;

export type Deposit = typeof depositsTable.$inferSelect;
export type NewDeposit = typeof depositsTable.$inferInsert;

export type ProductCategory = typeof productCategoriesTable.$inferSelect;
export type NewProductCategory = typeof productCategoriesTable.$inferInsert;

export type DigitalProduct = typeof digitalProductsTable.$inferSelect;
export type NewDigitalProduct = typeof digitalProductsTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type Session = typeof sessionsTable.$inferSelect;
export type NewSession = typeof sessionsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  wallets: walletsTable,
  deposits: depositsTable,
  productCategories: productCategoriesTable,
  digitalProducts: digitalProductsTable,
  transactions: transactionsTable,
  sessions: sessionsTable
};