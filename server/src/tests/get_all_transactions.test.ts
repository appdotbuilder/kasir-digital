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
import { getAllTransactions } from '../handlers/get_all_transactions';

describe('getAllTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create users
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'user1@test.com',
          password: 'password123',
          full_name: 'User One',
          phone_number: '123456789',
          role: 'user'
        },
        {
          email: 'user2@test.com',
          password: 'password123',
          full_name: 'User Two',
          phone_number: '987654321',
          role: 'user'
        }
      ])
      .returning()
      .execute();

    // Create wallets
    const walletResults = await db.insert(walletsTable)
      .values([
        {
          user_id: userResults[0].id,
          balance: '1000.00'
        },
        {
          user_id: userResults[1].id,
          balance: '500.00'
        }
      ])
      .returning()
      .execute();

    // Create product category
    const [categoryResult] = await db.insert(productCategoriesTable)
      .values({
        name: 'Mobile Credit',
        description: 'Mobile phone credits'
      })
      .returning()
      .execute();

    // Create digital products
    const productResults = await db.insert(digitalProductsTable)
      .values([
        {
          category_id: categoryResult.id,
          name: 'Telkomsel Credit 10K',
          description: 'Telkomsel mobile credit 10,000',
          price: '10000.00',
          provider: 'Telkomsel',
          product_code: 'TEL_10K'
        },
        {
          category_id: categoryResult.id,
          name: 'XL Credit 25K',
          description: 'XL mobile credit 25,000',
          price: '25000.00',
          provider: 'XL',
          product_code: 'XL_25K'
        }
      ])
      .returning()
      .execute();

    // Create transactions
    const transactionResults = await db.insert(transactionsTable)
      .values([
        {
          user_id: userResults[0].id,
          product_id: productResults[0].id,
          wallet_id: walletResults[0].id,
          amount: '10000.00',
          customer_number: '081234567890',
          status: 'success',
          transaction_code: 'TXN001'
        },
        {
          user_id: userResults[0].id,
          product_id: productResults[1].id,
          wallet_id: walletResults[0].id,
          amount: '25000.00',
          customer_number: '081234567891',
          status: 'pending',
          transaction_code: 'TXN002'
        },
        {
          user_id: userResults[1].id,
          product_id: productResults[0].id,
          wallet_id: walletResults[1].id,
          amount: '10000.00',
          customer_number: '081987654321',
          status: 'failed',
          transaction_code: 'TXN003'
        },
        {
          user_id: userResults[1].id,
          product_id: productResults[1].id,
          wallet_id: walletResults[1].id,
          amount: '25000.00',
          customer_number: '081987654322',
          status: 'success',
          transaction_code: 'TXN004'
        }
      ])
      .returning()
      .execute();

    return {
      users: userResults,
      wallets: walletResults,
      category: categoryResult,
      products: productResults,
      transactions: transactionResults
    };
  };

  it('should get all transactions with default pagination', async () => {
    await createTestData();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 20
    };

    const result = await getAllTransactions(input);

    expect(result.transactions).toHaveLength(4);
    expect(result.total_count).toBe(4);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);

    // Verify transaction data structure and numeric conversion
    const transaction = result.transactions[0];
    expect(transaction.id).toBeDefined();
    expect(transaction.user_id).toBeDefined();
    expect(transaction.product_id).toBeDefined();
    expect(transaction.wallet_id).toBeDefined();
    expect(typeof transaction.amount).toBe('number');
    expect(transaction.customer_number).toBeDefined();
    expect(transaction.status).toMatch(/^(pending|processing|success|failed)$/);
    expect(transaction.transaction_code).toBeDefined();
    expect(transaction.created_at).toBeInstanceOf(Date);
    expect(transaction.updated_at).toBeInstanceOf(Date);
  });

  it('should filter transactions by status', async () => {
    await createTestData();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 20,
      status: 'success'
    };

    const result = await getAllTransactions(input);

    expect(result.transactions).toHaveLength(2);
    expect(result.total_count).toBe(2);
    
    // Verify all returned transactions have success status
    result.transactions.forEach(transaction => {
      expect(transaction.status).toBe('success');
    });
  });

  it('should filter transactions by user_id', async () => {
    const testData = await createTestData();
    const firstUserId = testData.users[0].id;

    const input: GetTransactionsInput = {
      page: 1,
      limit: 20,
      user_id: firstUserId
    };

    const result = await getAllTransactions(input);

    expect(result.transactions).toHaveLength(2);
    expect(result.total_count).toBe(2);
    
    // Verify all returned transactions belong to the specified user
    result.transactions.forEach(transaction => {
      expect(transaction.user_id).toBe(firstUserId);
    });
  });

  it('should filter transactions by both status and user_id', async () => {
    const testData = await createTestData();
    const firstUserId = testData.users[0].id;

    const input: GetTransactionsInput = {
      page: 1,
      limit: 20,
      status: 'success',
      user_id: firstUserId
    };

    const result = await getAllTransactions(input);

    expect(result.transactions).toHaveLength(1);
    expect(result.total_count).toBe(1);
    
    // Verify the returned transaction matches both filters
    const transaction = result.transactions[0];
    expect(transaction.status).toBe('success');
    expect(transaction.user_id).toBe(firstUserId);
  });

  it('should handle pagination correctly', async () => {
    await createTestData();

    // Get first page with limit 2
    const firstPageInput: GetTransactionsInput = {
      page: 1,
      limit: 2
    };

    const firstPageResult = await getAllTransactions(firstPageInput);

    expect(firstPageResult.transactions).toHaveLength(2);
    expect(firstPageResult.total_count).toBe(4);
    expect(firstPageResult.page).toBe(1);
    expect(firstPageResult.limit).toBe(2);

    // Get second page
    const secondPageInput: GetTransactionsInput = {
      page: 2,
      limit: 2
    };

    const secondPageResult = await getAllTransactions(secondPageInput);

    expect(secondPageResult.transactions).toHaveLength(2);
    expect(secondPageResult.total_count).toBe(4);
    expect(secondPageResult.page).toBe(2);
    expect(secondPageResult.limit).toBe(2);

    // Verify different transactions on different pages
    const firstPageIds = firstPageResult.transactions.map(t => t.id);
    const secondPageIds = secondPageResult.transactions.map(t => t.id);
    expect(firstPageIds).not.toEqual(secondPageIds);
  });

  it('should order transactions by created_at descending (most recent first)', async () => {
    await createTestData();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 20
    };

    const result = await getAllTransactions(input);

    // Verify transactions are ordered by created_at descending
    for (let i = 0; i < result.transactions.length - 1; i++) {
      const current = result.transactions[i];
      const next = result.transactions[i + 1];
      expect(current.created_at.getTime()).toBeGreaterThanOrEqual(next.created_at.getTime());
    }
  });

  it('should return empty result when no transactions match filter', async () => {
    await createTestData();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 20,
      status: 'processing' // No transactions with this status
    };

    const result = await getAllTransactions(input);

    expect(result.transactions).toHaveLength(0);
    expect(result.total_count).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should handle page beyond available data', async () => {
    await createTestData();

    const input: GetTransactionsInput = {
      page: 10, // Page beyond available data
      limit: 20
    };

    const result = await getAllTransactions(input);

    expect(result.transactions).toHaveLength(0);
    expect(result.total_count).toBe(4); // Total count should still be accurate
    expect(result.page).toBe(10);
    expect(result.limit).toBe(20);
  });

  it('should convert numeric amount fields correctly', async () => {
    await createTestData();

    const input: GetTransactionsInput = {
      page: 1,
      limit: 20
    };

    const result = await getAllTransactions(input);

    // Verify all amount fields are properly converted to numbers
    result.transactions.forEach(transaction => {
      expect(typeof transaction.amount).toBe('number');
      expect(transaction.amount).toBeGreaterThan(0);
      expect(Number.isFinite(transaction.amount)).toBe(true);
    });

    // Check specific amounts match expected values
    const amounts = result.transactions.map(t => t.amount).sort();
    expect(amounts).toContain(10000);
    expect(amounts).toContain(25000);
  });
});