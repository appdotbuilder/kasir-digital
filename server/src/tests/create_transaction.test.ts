import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletsTable, digitalProductsTable, productCategoriesTable, transactionsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testWalletId: number;
  let testProductId: number;

  const setupTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'hashedpassword123',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create test wallet with sufficient balance
    const walletResult = await db.insert(walletsTable)
      .values({
        user_id: testUserId,
        balance: '1000.00'
      })
      .returning()
      .execute();

    testWalletId = walletResult[0].id;

    // Create test product category
    const categoryResult = await db.insert(productCategoriesTable)
      .values({
        name: 'Mobile Credit',
        description: 'Mobile credit top-up services',
        is_active: true
      })
      .returning()
      .execute();

    // Create test product
    const productResult = await db.insert(digitalProductsTable)
      .values({
        category_id: categoryResult[0].id,
        name: 'Mobile Credit 50',
        description: 'Mobile credit top-up 50 units',
        price: '50.00',
        provider: 'TestProvider',
        product_code: 'MC50',
        is_active: true
      })
      .returning()
      .execute();

    testProductId = productResult[0].id;
  };

  const testInput: CreateTransactionInput = {
    product_id: 0, // Will be set in test
    customer_number: '081234567890',
    amount: 50
  };

  it('should create a successful transaction', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      product_id: testProductId
    };

    const result = await createTransaction(testUserId, input);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.product_id).toEqual(testProductId);
    expect(result.wallet_id).toEqual(testWalletId);
    expect(result.amount).toEqual(50);
    expect(result.customer_number).toEqual('081234567890');
    expect(result.id).toBeDefined();
    expect(result.transaction_code).toMatch(/^TXN-\d+-\d+-[a-z0-9]+$/);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(['success', 'failed']).toContain(result.status);

    // If successful, should have provider reference
    if (result.status === 'success') {
      expect(result.provider_reference).toBeTruthy();
      expect(result.provider_reference).toMatch(/^TESTPROVIDER-\d+-[a-z0-9]+$/i);
    }
  });

  it('should deduct amount from wallet balance on successful transaction', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      product_id: testProductId
    };

    const result = await createTransaction(testUserId, input);

    // Check wallet balance was updated
    const wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.id, testWalletId))
      .execute();

    const updatedWallet = wallets[0];

    if (result.status === 'success') {
      // Balance should be reduced by transaction amount
      expect(parseFloat(updatedWallet.balance)).toEqual(950); // 1000 - 50
    } else {
      // Balance should be refunded if transaction failed
      expect(parseFloat(updatedWallet.balance)).toEqual(1000); // Original balance
    }
  });

  it('should save transaction to database', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      product_id: testProductId
    };

    const result = await createTransaction(testUserId, input);

    // Query transaction from database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const savedTransaction = transactions[0];
    
    expect(savedTransaction.user_id).toEqual(testUserId);
    expect(savedTransaction.product_id).toEqual(testProductId);
    expect(savedTransaction.wallet_id).toEqual(testWalletId);
    expect(parseFloat(savedTransaction.amount)).toEqual(50);
    expect(savedTransaction.customer_number).toEqual('081234567890');
    expect(['success', 'failed']).toContain(savedTransaction.status);
    expect(savedTransaction.transaction_code).toMatch(/^TXN-\d+-\d+-[a-z0-9]+$/);
    expect(savedTransaction.created_at).toBeInstanceOf(Date);
    expect(savedTransaction.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent product', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      product_id: 999999 // Non-existent product ID
    };

    await expect(createTransaction(testUserId, input))
      .rejects.toThrow(/product not found or inactive/i);
  });

  it('should throw error for inactive product', async () => {
    await setupTestData();
    
    // Deactivate the test product
    await db.update(digitalProductsTable)
      .set({ is_active: false })
      .where(eq(digitalProductsTable.id, testProductId))
      .execute();

    const input = {
      ...testInput,
      product_id: testProductId
    };

    await expect(createTransaction(testUserId, input))
      .rejects.toThrow(/product not found or inactive/i);
  });

  it('should throw error for insufficient wallet balance', async () => {
    await setupTestData();
    
    // Update wallet to have insufficient balance
    await db.update(walletsTable)
      .set({ balance: '25.00' }) // Less than required 50
      .where(eq(walletsTable.id, testWalletId))
      .execute();

    const input = {
      ...testInput,
      product_id: testProductId
    };

    await expect(createTransaction(testUserId, input))
      .rejects.toThrow(/insufficient wallet balance/i);
  });

  it('should throw error for user without wallet', async () => {
    await setupTestData();
    
    // Create another user without wallet
    const userResult = await db.insert(usersTable)
      .values({
        email: 'nowallet@example.com',
        password: 'hashedpassword123',
        full_name: 'No Wallet User',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const userWithoutWallet = userResult[0].id;

    const input = {
      ...testInput,
      product_id: testProductId
    };

    await expect(createTransaction(userWithoutWallet, input))
      .rejects.toThrow(/user wallet not found/i);
  });

  it('should handle large transaction amounts correctly', async () => {
    await setupTestData();
    
    // Update wallet balance to handle large transaction
    await db.update(walletsTable)
      .set({ balance: '10000.50' })
      .where(eq(walletsTable.id, testWalletId))
      .execute();

    // Create expensive product
    const categoryResult = await db.select()
      .from(productCategoriesTable)
      .limit(1)
      .execute();

    const expensiveProductResult = await db.insert(digitalProductsTable)
      .values({
        category_id: categoryResult[0].id,
        name: 'Premium Service',
        description: 'Premium digital service',
        price: '5000.25',
        provider: 'PremiumProvider',
        product_code: 'PREM5K',
        is_active: true
      })
      .returning()
      .execute();

    const input = {
      product_id: expensiveProductResult[0].id,
      customer_number: '081234567890',
      amount: 5000.25
    };

    const result = await createTransaction(testUserId, input);

    expect(result.amount).toEqual(5000.25);
    expect(typeof result.amount).toBe('number');

    // Check wallet balance calculation
    const wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.id, testWalletId))
      .execute();

    const updatedBalance = parseFloat(wallets[0].balance);

    if (result.status === 'success') {
      expect(updatedBalance).toEqual(5000.25); // 10000.50 - 5000.25
    } else {
      expect(updatedBalance).toEqual(10000.50); // Refunded
    }
  });

  it('should generate unique transaction codes', async () => {
    await setupTestData();
    
    const input = {
      ...testInput,
      product_id: testProductId
    };

    // Create multiple transactions
    const results = await Promise.all([
      createTransaction(testUserId, input),
      createTransaction(testUserId, input),
      createTransaction(testUserId, input)
    ]);

    // All transaction codes should be unique
    const transactionCodes = results.map(r => r.transaction_code);
    const uniqueCodes = new Set(transactionCodes);
    
    expect(uniqueCodes.size).toEqual(transactionCodes.length);
    
    // All codes should follow the expected format
    transactionCodes.forEach(code => {
      expect(code).toMatch(/^TXN-\d+-\d+-[a-z0-9]+$/);
    });
  });
});