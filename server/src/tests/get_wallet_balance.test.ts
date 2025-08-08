import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletsTable } from '../db/schema';
import { getWalletBalance } from '../handlers/get_wallet_balance';
import { eq } from 'drizzle-orm';

describe('getWalletBalance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return existing wallet balance', async () => {
    // Create a test user first
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'hashedpassword123',
        full_name: 'Test User',
        phone_number: '1234567890'
      })
      .returning()
      .execute();

    const userId = user[0].id;

    // Create a wallet with a specific balance
    await db.insert(walletsTable)
      .values({
        user_id: userId,
        balance: '150.75' // Convert to string for numeric column
      })
      .execute();

    // Get wallet balance
    const result = await getWalletBalance(userId);

    // Verify the response
    expect(result.balance).toEqual(150.75);
    expect(typeof result.balance).toBe('number');
    expect(result.wallet_id).toBeDefined();
    expect(typeof result.wallet_id).toBe('number');
  });

  it('should create a new wallet when user has no wallet', async () => {
    // Create a test user without a wallet
    const user = await db.insert(usersTable)
      .values({
        email: 'newuser@example.com',
        password: 'hashedpassword123',
        full_name: 'New User',
        phone_number: '9876543210'
      })
      .returning()
      .execute();

    const userId = user[0].id;

    // Get wallet balance (should create new wallet)
    const result = await getWalletBalance(userId);

    // Verify a new wallet was created with zero balance
    expect(result.balance).toEqual(0);
    expect(typeof result.balance).toBe('number');
    expect(result.wallet_id).toBeDefined();
    expect(typeof result.wallet_id).toBe('number');

    // Verify wallet was actually created in database
    const wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, userId))
      .execute();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].user_id).toEqual(userId);
    expect(parseFloat(wallets[0].balance)).toEqual(0);
  });

  it('should handle wallet with zero balance correctly', async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        email: 'zerobalance@example.com',
        password: 'hashedpassword123',
        full_name: 'Zero Balance User',
        phone_number: '1111111111'
      })
      .returning()
      .execute();

    const userId = user[0].id;

    // Create a wallet with zero balance
    await db.insert(walletsTable)
      .values({
        user_id: userId,
        balance: '0.00'
      })
      .execute();

    // Get wallet balance
    const result = await getWalletBalance(userId);

    // Verify zero balance is handled correctly
    expect(result.balance).toEqual(0);
    expect(typeof result.balance).toBe('number');
    expect(result.wallet_id).toBeDefined();
  });

  it('should handle decimal precision correctly', async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        email: 'decimal@example.com',
        password: 'hashedpassword123',
        full_name: 'Decimal User',
        phone_number: '2222222222'
      })
      .returning()
      .execute();

    const userId = user[0].id;

    // Create a wallet with precise decimal balance
    await db.insert(walletsTable)
      .values({
        user_id: userId,
        balance: '99.99'
      })
      .execute();

    // Get wallet balance
    const result = await getWalletBalance(userId);

    // Verify decimal precision is maintained
    expect(result.balance).toEqual(99.99);
    expect(typeof result.balance).toBe('number');
  });

  it('should not create multiple wallets for same user', async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        email: 'single@example.com',
        password: 'hashedpassword123',
        full_name: 'Single Wallet User',
        phone_number: '3333333333'
      })
      .returning()
      .execute();

    const userId = user[0].id;

    // Call getWalletBalance twice (first should create wallet)
    const result1 = await getWalletBalance(userId);
    const result2 = await getWalletBalance(userId);

    // Both calls should return same wallet
    expect(result1.wallet_id).toEqual(result2.wallet_id);
    expect(result1.balance).toEqual(result2.balance);

    // Verify only one wallet exists in database
    const wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, userId))
      .execute();

    expect(wallets).toHaveLength(1);
  });
});