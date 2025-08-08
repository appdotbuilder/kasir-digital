import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { validateSession } from '../handlers/validate_session';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'hashedpassword123',
  full_name: 'Test User',
  phone_number: '1234567890',
  role: 'user' as const,
  is_active: true
};

const inactiveUser = {
  email: 'inactive@example.com',
  password: 'hashedpassword123',
  full_name: 'Inactive User',
  phone_number: '9876543210',
  role: 'user' as const,
  is_active: false
};

describe('validateSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user data for valid session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create valid session (expires in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    const sessionResult = await db.insert(sessionsTable)
      .values({
        id: 'valid-session-123',
        user_id: user.id,
        expires_at: expiresAt
      })
      .returning()
      .execute();
    const session = sessionResult[0];

    const result = await validateSession(session.id);

    // Should return user data without password
    expect(result).toBeDefined();
    expect(result!.id).toEqual(user.id);
    expect(result!.email).toEqual(testUser.email);
    expect(result!.full_name).toEqual(testUser.full_name);
    expect(result!.phone_number).toEqual(testUser.phone_number);
    expect(result!.role).toEqual(testUser.role);
    expect(result!.is_active).toEqual(testUser.is_active);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Should not include password
    expect(result).not.toHaveProperty('password');
  });

  it('should return null for non-existent session', async () => {
    const result = await validateSession('non-existent-session');

    expect(result).toBeNull();
  });

  it('should return null for expired session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create expired session (expired 1 hour ago)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() - 1);
    
    const sessionResult = await db.insert(sessionsTable)
      .values({
        id: 'expired-session-123',
        user_id: user.id,
        expires_at: expiresAt
      })
      .returning()
      .execute();
    const session = sessionResult[0];

    const result = await validateSession(session.id);

    expect(result).toBeNull();
  });

  it('should return null for inactive user', async () => {
    // Create inactive user
    const userResult = await db.insert(usersTable)
      .values(inactiveUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create valid session for inactive user
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    const sessionResult = await db.insert(sessionsTable)
      .values({
        id: 'inactive-user-session',
        user_id: user.id,
        expires_at: expiresAt
      })
      .returning()
      .execute();
    const session = sessionResult[0];

    const result = await validateSession(session.id);

    expect(result).toBeNull();
  });

  it('should return null for session at exact expiry time', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create session that expires right now
    const expiresAt = new Date();
    
    const sessionResult = await db.insert(sessionsTable)
      .values({
        id: 'expires-now-session',
        user_id: user.id,
        expires_at: expiresAt
      })
      .returning()
      .execute();
    const session = sessionResult[0];

    // Wait a moment to ensure the session is expired
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await validateSession(session.id);

    expect(result).toBeNull();
  });

  it('should handle valid admin user session', async () => {
    // Create admin user
    const adminUser = {
      ...testUser,
      email: 'admin@example.com',
      role: 'admin' as const
    };

    const userResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create valid session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    const sessionResult = await db.insert(sessionsTable)
      .values({
        id: 'admin-session-123',
        user_id: user.id,
        expires_at: expiresAt
      })
      .returning()
      .execute();
    const session = sessionResult[0];

    const result = await validateSession(session.id);

    expect(result).toBeDefined();
    expect(result!.role).toEqual('admin');
    expect(result!.email).toEqual(adminUser.email);
    expect(result).not.toHaveProperty('password');
  });

  it('should verify session is saved correctly in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create valid session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    const sessionResult = await db.insert(sessionsTable)
      .values({
        id: 'db-verify-session',
        user_id: user.id,
        expires_at: expiresAt
      })
      .returning()
      .execute();
    const session = sessionResult[0];

    // Validate session
    await validateSession(session.id);

    // Verify session still exists in database
    const sessions = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, session.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toEqual(session.id);
    expect(sessions[0].user_id).toEqual(user.id);
    expect(sessions[0].expires_at).toEqual(expiresAt);
    expect(sessions[0].created_at).toBeInstanceOf(Date);
  });
});