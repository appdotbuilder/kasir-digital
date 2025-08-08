import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletsTable, transactionsTable, sessionsTable, digitalProductsTable, productCategoriesTable } from '../db/schema';
import { getAdminStats } from '../handlers/get_admin_stats';

// Test data
const testUser = {
  email: 'user@example.com',
  password: 'hashedpassword123',
  full_name: 'Test User',
  phone_number: null,
  role: 'user' as const,
  is_active: true
};

const testAdmin = {
  email: 'admin@example.com',
  password: 'hashedpassword123',
  full_name: 'Admin User',
  phone_number: null,
  role: 'admin' as const,
  is_active: true
};

const testCategory = {
  name: 'Mobile Prepaid',
  description: 'Mobile prepaid top-ups',
  is_active: true
};

const testProduct = {
  category_id: 1,
  name: 'Mobile Top-Up',
  description: 'Mobile credit top-up',
  price: '10.00',
  provider: 'Telkom',
  product_code: 'TELKOM_10',
  is_active: true
};

describe('getAdminStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const result = await getAdminStats();

    expect(result.total_users).toEqual(0);
    expect(result.total_transactions).toEqual(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.active_users).toEqual(0);
  });

  it('should count total users correctly', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser, testAdmin]).execute();

    const result = await getAdminStats();

    expect(result.total_users).toEqual(2);
    expect(result.total_transactions).toEqual(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.active_users).toEqual(0);
  });

  it('should count total transactions correctly', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = users[0].id;

    const wallets = await db.insert(walletsTable).values({
      user_id: userId,
      balance: '100.00'
    }).returning().execute();
    const walletId = wallets[0].id;

    const categories = await db.insert(productCategoriesTable).values(testCategory).returning().execute();
    const categoryId = categories[0].id;

    const products = await db.insert(digitalProductsTable).values({
      ...testProduct,
      category_id: categoryId
    }).returning().execute();
    const productId = products[0].id;

    // Create test transactions
    await db.insert(transactionsTable).values([
      {
        user_id: userId,
        product_id: productId,
        wallet_id: walletId,
        amount: '10.00',
        customer_number: '081234567890',
        status: 'pending',
        transaction_code: 'TXN001'
      },
      {
        user_id: userId,
        product_id: productId,
        wallet_id: walletId,
        amount: '20.00',
        customer_number: '081234567891',
        status: 'success',
        transaction_code: 'TXN002'
      }
    ]).execute();

    const result = await getAdminStats();

    expect(result.total_users).toEqual(1);
    expect(result.total_transactions).toEqual(2);
    expect(result.total_revenue).toEqual(20); // Only successful transactions
    expect(result.active_users).toEqual(0);
  });

  it('should calculate revenue from successful transactions only', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = users[0].id;

    const wallets = await db.insert(walletsTable).values({
      user_id: userId,
      balance: '100.00'
    }).returning().execute();
    const walletId = wallets[0].id;

    const categories = await db.insert(productCategoriesTable).values(testCategory).returning().execute();
    const categoryId = categories[0].id;

    const products = await db.insert(digitalProductsTable).values({
      ...testProduct,
      category_id: categoryId
    }).returning().execute();
    const productId = products[0].id;

    // Create transactions with different statuses
    await db.insert(transactionsTable).values([
      {
        user_id: userId,
        product_id: productId,
        wallet_id: walletId,
        amount: '15.50',
        customer_number: '081234567890',
        status: 'success',
        transaction_code: 'TXN001'
      },
      {
        user_id: userId,
        product_id: productId,
        wallet_id: walletId,
        amount: '25.75',
        customer_number: '081234567891',
        status: 'success',
        transaction_code: 'TXN002'
      },
      {
        user_id: userId,
        product_id: productId,
        wallet_id: walletId,
        amount: '100.00',
        customer_number: '081234567892',
        status: 'failed',
        transaction_code: 'TXN003'
      },
      {
        user_id: userId,
        product_id: productId,
        wallet_id: walletId,
        amount: '50.00',
        customer_number: '081234567893',
        status: 'pending',
        transaction_code: 'TXN004'
      }
    ]).execute();

    const result = await getAdminStats();

    expect(result.total_transactions).toEqual(4);
    expect(result.total_revenue).toEqual(41.25); // Only successful transactions: 15.50 + 25.75
    expect(typeof result.total_revenue).toEqual('number');
  });

  it('should count active users correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable).values([testUser, testAdmin]).returning().execute();
    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create sessions for different time periods
    const now = new Date();
    const recentDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const oldDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

    await db.insert(sessionsTable).values([
      {
        id: 'recent_session_1',
        user_id: user1Id,
        expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000), // expires tomorrow
        created_at: recentDate
      },
      {
        id: 'recent_session_2',
        user_id: user2Id,
        expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000), // expires tomorrow
        created_at: recentDate
      },
      {
        id: 'old_session',
        user_id: user1Id,
        expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000), // expires tomorrow
        created_at: oldDate
      }
    ]).execute();

    const result = await getAdminStats();

    expect(result.total_users).toEqual(2);
    expect(result.active_users).toEqual(2); // Both users have recent sessions
  });

  it('should exclude inactive users from active user count', async () => {
    // Create active and inactive users
    const users = await db.insert(usersTable).values([
      testUser, // active
      {
        ...testAdmin,
        is_active: false // inactive
      }
    ]).returning().execute();
    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create recent sessions for both users
    const recentDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

    await db.insert(sessionsTable).values([
      {
        id: 'session_1',
        user_id: user1Id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        created_at: recentDate
      },
      {
        id: 'session_2',
        user_id: user2Id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        created_at: recentDate
      }
    ]).execute();

    const result = await getAdminStats();

    expect(result.total_users).toEqual(2);
    expect(result.active_users).toEqual(1); // Only active user counted
  });

  it('should return comprehensive stats with all data', async () => {
    // Create users
    const users = await db.insert(usersTable).values([testUser, testAdmin]).returning().execute();
    const userId = users[0].id;

    // Create wallet
    const wallets = await db.insert(walletsTable).values({
      user_id: userId,
      balance: '200.00'
    }).returning().execute();
    const walletId = wallets[0].id;

    // Create category and product
    const categories = await db.insert(productCategoriesTable).values(testCategory).returning().execute();
    const categoryId = categories[0].id;

    const products = await db.insert(digitalProductsTable).values({
      ...testProduct,
      category_id: categoryId
    }).returning().execute();
    const productId = products[0].id;

    // Create transactions
    await db.insert(transactionsTable).values([
      {
        user_id: userId,
        product_id: productId,
        wallet_id: walletId,
        amount: '30.00',
        customer_number: '081234567890',
        status: 'success',
        transaction_code: 'TXN001'
      },
      {
        user_id: userId,
        product_id: productId,
        wallet_id: walletId,
        amount: '45.50',
        customer_number: '081234567891',
        status: 'success',
        transaction_code: 'TXN002'
      }
    ]).execute();

    // Create recent sessions
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    await db.insert(sessionsTable).values({
      id: 'active_session',
      user_id: userId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: recentDate
    }).execute();

    const result = await getAdminStats();

    expect(result.total_users).toEqual(2);
    expect(result.total_transactions).toEqual(2);
    expect(result.total_revenue).toEqual(75.5);
    expect(result.active_users).toEqual(1);
  });
});