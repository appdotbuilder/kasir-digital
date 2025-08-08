import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync, randomBytes } from 'crypto';

// Password hashing utility for tests (matching handler implementation)
const hashPassword = (password: string, salt: string): string => {
  return pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
};

const createHashedPassword = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
};

// Test input
const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'testpassword123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async (overrides: any = {}) => {
    const hashedPassword = createHashedPassword('testpassword123');
    
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: hashedPassword,
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'user',
        is_active: true,
        ...overrides
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should login user with valid credentials', async () => {
    // Create test user
    const testUser = await createTestUser();

    const result = await loginUser(testLoginInput);

    // Verify user data (without password)
    expect(result.user.id).toEqual(testUser.id);
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.full_name).toEqual('Test User');
    expect(result.user.phone_number).toEqual('+1234567890');
    expect(result.user.role).toEqual('user');
    expect(result.user.is_active).toEqual(true);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify session ID is returned
    expect(result.session_id).toBeDefined();
    expect(typeof result.session_id).toBe('string');
    expect(result.session_id.length).toBeGreaterThan(0);
  });

  it('should create a session in database', async () => {
    // Create test user
    const testUser = await createTestUser();

    const result = await loginUser(testLoginInput);

    // Check session was created in database
    const sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, result.session_id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual(testUser.id);
    expect(sessions[0].expires_at).toBeInstanceOf(Date);
    expect(sessions[0].created_at).toBeInstanceOf(Date);
    
    // Verify session expires in the future (approximately 24 hours)
    const now = new Date();
    const sessionExpiry = sessions[0].expires_at;
    const hoursUntilExpiry = (sessionExpiry.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(hoursUntilExpiry).toBeGreaterThan(23); // Should be close to 24 hours
    expect(hoursUntilExpiry).toBeLessThan(25); // But not more than 25 hours
  });

  it('should reject login with invalid email', async () => {
    // Create test user but try to login with different email
    await createTestUser();

    const invalidEmailInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'testpassword123'
    };

    await expect(loginUser(invalidEmailInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login with invalid password', async () => {
    // Create test user
    await createTestUser();

    const invalidPasswordInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidPasswordInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login for inactive user', async () => {
    // Create inactive test user
    await createTestUser({ is_active: false });

    await expect(loginUser(testLoginInput)).rejects.toThrow(/account is inactive/i);
  });

  it('should handle admin role correctly', async () => {
    // Create admin user
    const adminUser = await createTestUser({ 
      role: 'admin',
      email: 'admin@example.com'
    });

    const adminLoginInput: LoginInput = {
      email: 'admin@example.com',
      password: 'testpassword123'
    };

    const result = await loginUser(adminLoginInput);

    expect(result.user.role).toEqual('admin');
    expect(result.user.id).toEqual(adminUser.id);
    expect(result.session_id).toBeDefined();
  });

  it('should handle user with null phone number', async () => {
    // Create user with null phone number
    const userWithoutPhone = await createTestUser({ phone_number: null });

    const result = await loginUser(testLoginInput);

    expect(result.user.phone_number).toBeNull();
    expect(result.user.id).toEqual(userWithoutPhone.id);
  });

  it('should generate unique session IDs', async () => {
    // Create test user
    await createTestUser();

    // Login multiple times
    const result1 = await loginUser(testLoginInput);
    const result2 = await loginUser(testLoginInput);

    // Session IDs should be different
    expect(result1.session_id).not.toEqual(result2.session_id);

    // Both sessions should exist in database
    const sessions = await db.select()
      .from(sessionsTable)
      .execute();

    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });

  it('should not return password in response', async () => {
    // Create test user
    await createTestUser();

    const result = await loginUser(testLoginInput);

    // Ensure password is not included in response
    expect(result.user).not.toHaveProperty('password');
    expect(Object.keys(result.user)).not.toContain('password');
  });

  it('should handle password with invalid format', async () => {
    // Create user with malformed password hash (missing salt separator)
    await createTestUser({ password: 'invalidhashformat' });

    await expect(loginUser(testLoginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle empty password hash parts', async () => {
    // Create user with empty salt or hash
    await createTestUser({ password: ':emptysalt' });

    await expect(loginUser(testLoginInput)).rejects.toThrow(/invalid email or password/i);
  });
});