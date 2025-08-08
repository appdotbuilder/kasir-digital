import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletsTable, depositsTable } from '../db/schema';
import { type CreateDepositInput } from '../schema';
import { createDeposit } from '../handlers/create_deposit';
import { eq } from 'drizzle-orm';

describe('createDeposit', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    full_name: 'Test User',
    phone_number: '1234567890',
    role: 'user' as const,
    is_active: true
  };

  const testDepositInput: CreateDepositInput = {
    amount: 100.50,
    payment_method: 'credit_card'
  };

  it('should create and complete a deposit successfully', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create wallet for user
    const walletResult = await db.insert(walletsTable)
      .values({
        user_id: user.id,
        balance: '50.00' // Initial balance
      })
      .returning()
      .execute();
    const wallet = walletResult[0];

    // Create deposit
    const result = await createDeposit(user.id, testDepositInput);

    // Verify deposit fields
    expect(result.wallet_id).toEqual(wallet.id);
    expect(result.amount).toEqual(100.50);
    expect(typeof result.amount).toBe('number');
    expect(result.status).toEqual('completed');
    expect(result.payment_method).toEqual('credit_card');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update wallet balance after deposit', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create wallet with initial balance
    const initialBalance = 25.75;
    await db.insert(walletsTable)
      .values({
        user_id: user.id,
        balance: initialBalance.toString()
      })
      .returning()
      .execute();

    // Create deposit
    await createDeposit(user.id, testDepositInput);

    // Verify wallet balance was updated
    const updatedWallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, user.id))
      .execute();

    expect(updatedWallets).toHaveLength(1);
    const updatedWallet = updatedWallets[0];
    const expectedBalance = initialBalance + testDepositInput.amount;
    expect(parseFloat(updatedWallet.balance)).toEqual(expectedBalance);
    expect(updatedWallet.updated_at).toBeInstanceOf(Date);
  });

  it('should save deposit record to database', async () => {
    // Create user and wallet
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const walletResult = await db.insert(walletsTable)
      .values({
        user_id: user.id,
        balance: '0.00'
      })
      .returning()
      .execute();

    // Create deposit
    const result = await createDeposit(user.id, testDepositInput);

    // Verify deposit was saved to database
    const deposits = await db.select()
      .from(depositsTable)
      .where(eq(depositsTable.id, result.id))
      .execute();

    expect(deposits).toHaveLength(1);
    const savedDeposit = deposits[0];
    expect(savedDeposit.wallet_id).toEqual(result.wallet_id);
    expect(parseFloat(savedDeposit.amount)).toEqual(100.50);
    expect(savedDeposit.status).toEqual('completed');
    expect(savedDeposit.payment_method).toEqual('credit_card');
    expect(savedDeposit.created_at).toBeInstanceOf(Date);
    expect(savedDeposit.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different payment methods', async () => {
    // Create user and wallet
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    await db.insert(walletsTable)
      .values({
        user_id: user.id,
        balance: '0.00'
      })
      .returning()
      .execute();

    const bankTransferInput: CreateDepositInput = {
      amount: 250.00,
      payment_method: 'bank_transfer'
    };

    // Create deposit with bank transfer
    const result = await createDeposit(user.id, bankTransferInput);

    expect(result.payment_method).toEqual('bank_transfer');
    expect(result.amount).toEqual(250.00);
    expect(result.status).toEqual('completed');
  });

  it('should handle decimal amounts correctly', async () => {
    // Create user and wallet
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    await db.insert(walletsTable)
      .values({
        user_id: user.id,
        balance: '15.33'
      })
      .returning()
      .execute();

    const decimalInput: CreateDepositInput = {
      amount: 0.99,
      payment_method: 'paypal'
    };

    // Create deposit with decimal amount
    const result = await createDeposit(user.id, decimalInput);

    expect(result.amount).toEqual(0.99);
    expect(typeof result.amount).toBe('number');

    // Verify wallet balance calculation is correct
    const updatedWallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, user.id))
      .execute();

    const expectedBalance = 15.33 + 0.99;
    expect(parseFloat(updatedWallets[0].balance)).toEqual(expectedBalance);
  });

  it('should throw error when user wallet not found', async () => {
    // Create user without wallet
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Attempt to create deposit for user without wallet
    await expect(createDeposit(user.id, testDepositInput))
      .rejects.toThrow(/user wallet not found/i);
  });

  it('should throw error when user does not exist', async () => {
    // Attempt to create deposit for non-existent user
    const nonExistentUserId = 99999;

    await expect(createDeposit(nonExistentUserId, testDepositInput))
      .rejects.toThrow(/user wallet not found/i);
  });
});