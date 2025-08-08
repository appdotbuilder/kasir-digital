import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletsTable, sessionsTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'testpassword123',
  full_name: 'Test User',
  phone_number: '+1234567890'
};

const testInputWithoutPhone: RegisterUserInput = {
  email: 'nophone@example.com',
  password: 'password123',
  full_name: 'No Phone User'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user successfully', async () => {
    const result = await registerUser(testInput);

    // Verify response structure
    expect(result.user).toBeDefined();
    expect(result.session_id).toBeDefined();
    expect(typeof result.session_id).toBe('string');

    // Verify user data
    expect(result.user.email).toEqual(testInput.email);
    expect(result.user.full_name).toEqual(testInput.full_name);
    expect(result.user.phone_number).toEqual(testInput.phone_number || null);
    expect(result.user.role).toEqual('user');
    expect(result.user.is_active).toEqual(true);
    expect(result.user.id).toBeGreaterThan(0);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify password is not returned
    expect((result.user as any).password).toBeUndefined();
  });

  it('should handle optional phone_number field', async () => {
    const result = await registerUser(testInputWithoutPhone);

    expect(result.user.phone_number).toBeNull();
    expect(result.user.email).toEqual(testInputWithoutPhone.email);
    expect(result.user.full_name).toEqual(testInputWithoutPhone.full_name);
  });

  it('should save user to database with hashed password', async () => {
    const result = await registerUser(testInput);

    // Query user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.email).toEqual(testInput.email);
    expect(savedUser.full_name).toEqual(testInput.full_name);
    expect(savedUser.phone_number).toEqual(testInput.phone_number || null);
    expect(savedUser.role).toEqual('user');
    expect(savedUser.is_active).toEqual(true);
    
    // Verify password is hashed (not plain text)
    expect(savedUser.password).not.toEqual(testInput.password);
    expect(savedUser.password).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
  });

  it('should create wallet for new user with zero balance', async () => {
    const result = await registerUser(testInput);

    // Query wallet from database
    const wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, result.user.id))
      .execute();

    expect(wallets).toHaveLength(1);
    const wallet = wallets[0];
    
    expect(wallet.user_id).toEqual(result.user.id);
    expect(parseFloat(wallet.balance)).toEqual(0.00);
    expect(wallet.created_at).toBeInstanceOf(Date);
    expect(wallet.updated_at).toBeInstanceOf(Date);
  });

  it('should create session for new user', async () => {
    const result = await registerUser(testInput);

    // Query session from database
    const sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, result.session_id))
      .execute();

    expect(sessions).toHaveLength(1);
    const session = sessions[0];
    
    expect(session.user_id).toEqual(result.user.id);
    expect(session.expires_at).toBeInstanceOf(Date);
    expect(session.created_at).toBeInstanceOf(Date);
    
    // Verify session expires in the future (approximately 30 days)
    const now = new Date();
    const daysDiff = Math.floor((session.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBeGreaterThanOrEqual(29);
    expect(daysDiff).toBeLessThanOrEqual(30);
  });

  it('should reject duplicate email registration', async () => {
    // Register first user
    await registerUser(testInput);

    // Attempt to register with same email
    const duplicateInput: RegisterUserInput = {
      email: testInput.email,
      password: 'differentpassword',
      full_name: 'Different User',
      phone_number: '+9876543210'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should handle case-sensitive email uniqueness', async () => {
    await registerUser(testInput);

    // Attempt to register with different case email
    const caseInput: RegisterUserInput = {
      ...testInput,
      email: testInput.email.toUpperCase()
    };

    // This should succeed since emails are case-sensitive in our implementation
    const result = await registerUser(caseInput);
    expect(result.user.email).toEqual(caseInput.email);
  });

  it('should generate unique session IDs for different registrations', async () => {
    const input1: RegisterUserInput = {
      email: 'user1@example.com',
      password: 'password123',
      full_name: 'User One'
    };

    const input2: RegisterUserInput = {
      email: 'user2@example.com',
      password: 'password456',
      full_name: 'User Two'
    };

    const result1 = await registerUser(input1);
    const result2 = await registerUser(input2);

    expect(result1.session_id).not.toEqual(result2.session_id);
    expect(result1.user.id).not.toEqual(result2.user.id);
  });

  it('should set default user role and active status', async () => {
    const result = await registerUser(testInput);

    expect(result.user.role).toEqual('user');
    expect(result.user.is_active).toEqual(true);

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users[0].role).toEqual('user');
    expect(users[0].is_active).toEqual(true);
  });
});