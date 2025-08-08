import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  walletsTable, 
  productCategoriesTable, 
  digitalProductsTable, 
  transactionsTable 
} from '../db/schema';
import { type GetTransactionsInput } from '../schema';
import { getUserTransactions } from '../handlers/get_user_transactions';

describe('getUserTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testWalletId: number;
  let testProductId: number;

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'hashedpassword',
        full_name: 'Test User',
        phone_number: '1234567890',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();
    testUserId = user.id;

    // Create test wallet
    const [wallet] = await db.insert(walletsTable)
      .values({
        user_id: testUserId,
        balance: '100.00'
      })
      .returning()
      .execute();
    testWalletId = wallet.id;

    // Create test category
    const [category] = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category',
        is_active: true
      })
      .returning()
      .execute();

    // Create test product
    const [product] = await db.insert(digitalProductsTable)
      .values({
        category_id: category.id,
        name: 'Test Product',
        description: 'A test product',
        price: '10.00',
        provider: 'Test Provider',
        product_code: 'TEST001',
        is_active: true
      })
      .returning()
      .execute();
    testProductId = product.id;
  });

  it('should return user transactions with pagination', async () => {
    // Create test transactions
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          product_id: testProductId,
          wallet_id: testWalletId,
          amount: '10.00',
          customer_number: '123456789',
          status: 'success',
          transaction_code: 'TXN001'
        },
        {
          user_id: testUserId,
          product_id: testProductId,
          wallet_id: testWalletId,
          amount: '20.00',
          customer_number: '987654321',
          status: 'pending',
          transaction_code: 'TXN002'
        }
      ])
      .execute();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 10
    };

    const result = await getUserTransactions(testUserId, input);

    expect(result.transactions).toHaveLength(2);
    expect(result.total_count).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);

    // Verify transaction fields
    const firstTransaction = result.transactions[0];
    expect(firstTransaction.user_id).toBe(testUserId);
    expect(firstTransaction.product_id).toBe(testProductId);
    expect(firstTransaction.wallet_id).toBe(testWalletId);
    expect(typeof firstTransaction.amount).toBe('number');
    expect(firstTransaction.amount).toBeGreaterThan(0);
    expect(firstTransaction.customer_number).toBeDefined();
    expect(firstTransaction.transaction_code).toBeDefined();
    expect(firstTransaction.created_at).toBeInstanceOf(Date);
  });

  it('should filter transactions by status', async () => {
    // Create transactions with different statuses
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          product_id: testProductId,
          wallet_id: testWalletId,
          amount: '10.00',
          customer_number: '123456789',
          status: 'success',
          transaction_code: 'TXN001'
        },
        {
          user_id: testUserId,
          product_id: testProductId,
          wallet_id: testWalletId,
          amount: '20.00',
          customer_number: '987654321',
          status: 'pending',
          transaction_code: 'TXN002'
        },
        {
          user_id: testUserId,
          product_id: testProductId,
          wallet_id: testWalletId,
          amount: '30.00',
          customer_number: '555666777',
          status: 'failed',
          transaction_code: 'TXN003'
        }
      ])
      .execute();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 10,
      status: 'success'
    };

    const result = await getUserTransactions(testUserId, input);

    expect(result.transactions).toHaveLength(1);
    expect(result.total_count).toBe(1);
    expect(result.transactions[0].status).toBe('success');
    expect(result.transactions[0].transaction_code).toBe('TXN001');
  });

  it('should handle pagination correctly', async () => {
    // Create 5 test transactions
    const transactions = Array.from({ length: 5 }, (_, i) => ({
      user_id: testUserId,
      product_id: testProductId,
      wallet_id: testWalletId,
      amount: '10.00',
      customer_number: `12345678${i}`,
      status: 'success' as const,
      transaction_code: `TXN00${i + 1}`
    }));

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    // Test first page
    const firstPageInput: GetTransactionsInput = {
      page: 1,
      limit: 2
    };

    const firstPageResult = await getUserTransactions(testUserId, firstPageInput);

    expect(firstPageResult.transactions).toHaveLength(2);
    expect(firstPageResult.total_count).toBe(5);
    expect(firstPageResult.page).toBe(1);
    expect(firstPageResult.limit).toBe(2);

    // Test second page
    const secondPageInput: GetTransactionsInput = {
      page: 2,
      limit: 2
    };

    const secondPageResult = await getUserTransactions(testUserId, secondPageInput);

    expect(secondPageResult.transactions).toHaveLength(2);
    expect(secondPageResult.total_count).toBe(5);
    expect(secondPageResult.page).toBe(2);
    expect(secondPageResult.limit).toBe(2);

    // Verify different transactions on different pages
    const firstPageCodes = firstPageResult.transactions.map(t => t.transaction_code);
    const secondPageCodes = secondPageResult.transactions.map(t => t.transaction_code);
    
    expect(firstPageCodes).not.toEqual(secondPageCodes);
  });

  it('should return only transactions for the specified user', async () => {
    // Create another user
    const [otherUser] = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password: 'hashedpassword',
        full_name: 'Other User',
        phone_number: '0987654321',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    // Create wallet for other user
    const [otherWallet] = await db.insert(walletsTable)
      .values({
        user_id: otherUser.id,
        balance: '50.00'
      })
      .returning()
      .execute();

    // Create transactions for both users
    await db.insert(transactionsTable)
      .values([
        {
          user_id: testUserId,
          product_id: testProductId,
          wallet_id: testWalletId,
          amount: '10.00',
          customer_number: '123456789',
          status: 'success',
          transaction_code: 'TXN001'
        },
        {
          user_id: otherUser.id,
          product_id: testProductId,
          wallet_id: otherWallet.id,
          amount: '20.00',
          customer_number: '987654321',
          status: 'success',
          transaction_code: 'TXN002'
        }
      ])
      .execute();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 10
    };

    const result = await getUserTransactions(testUserId, input);

    expect(result.transactions).toHaveLength(1);
    expect(result.total_count).toBe(1);
    expect(result.transactions[0].user_id).toBe(testUserId);
    expect(result.transactions[0].transaction_code).toBe('TXN001');
  });

  it('should return empty result when user has no transactions', async () => {
    const input: GetTransactionsInput = {
      page: 1,
      limit: 10
    };

    const result = await getUserTransactions(testUserId, input);

    expect(result.transactions).toHaveLength(0);
    expect(result.total_count).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('should order transactions by creation date (newest first)', async () => {
    // Create transactions with slight delays to ensure different timestamps
    const [firstTransaction] = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        product_id: testProductId,
        wallet_id: testWalletId,
        amount: '10.00',
        customer_number: '123456789',
        status: 'success',
        transaction_code: 'TXN001'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [secondTransaction] = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        product_id: testProductId,
        wallet_id: testWalletId,
        amount: '20.00',
        customer_number: '987654321',
        status: 'success',
        transaction_code: 'TXN002'
      })
      .returning()
      .execute();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 10
    };

    const result = await getUserTransactions(testUserId, input);

    expect(result.transactions).toHaveLength(2);
    // Newest transaction should be first (TXN002)
    expect(result.transactions[0].transaction_code).toBe('TXN002');
    expect(result.transactions[1].transaction_code).toBe('TXN001');
    expect(result.transactions[0].created_at >= result.transactions[1].created_at).toBe(true);
  });

  it('should handle numeric amount conversion correctly', async () => {
    await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        product_id: testProductId,
        wallet_id: testWalletId,
        amount: '15.75', // String value for numeric column
        customer_number: '123456789',
        status: 'success',
        transaction_code: 'TXN001'
      })
      .execute();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 10
    };

    const result = await getUserTransactions(testUserId, input);

    expect(result.transactions).toHaveLength(1);
    expect(typeof result.transactions[0].amount).toBe('number');
    expect(result.transactions[0].amount).toBe(15.75);
  });
});