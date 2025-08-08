import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sessionsTable, usersTable, walletsTable } from '../db/schema';
import { logoutUser } from '../handlers/logout_user';
import { eq } from 'drizzle-orm';

describe('logoutUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete an existing session', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'hashedpassword',
        full_name: 'Test User',
        phone_number: null,
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a session for the user
    const sessionId = 'test-session-id-123';
    await db.insert(sessionsTable)
      .values({
        id: sessionId,
        user_id: user.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      })
      .execute();

    // Verify session exists before logout
    const sessionsBefore = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .execute();

    expect(sessionsBefore).toHaveLength(1);

    // Perform logout
    const result = await logoutUser(sessionId);

    // Verify result
    expect(result.success).toBe(true);

    // Verify session was deleted
    const sessionsAfter = await db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .execute();

    expect(sessionsAfter).toHaveLength(0);
  });

  it('should return success even if session does not exist', async () => {
    // Try to logout with non-existent session ID
    const result = await logoutUser('non-existent-session-id');

    // Should still return success (idempotent operation)
    expect(result.success).toBe(true);
  });

  it('should not affect other sessions when deleting one', async () => {
    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password: 'hashedpassword1',
          full_name: 'Test User 1',
          phone_number: null,
          role: 'user',
          is_active: true
        },
        {
          email: 'user2@example.com',
          password: 'hashedpassword2',
          full_name: 'Test User 2',
          phone_number: null,
          role: 'user',
          is_active: true
        }
      ])
      .returning()
      .execute();

    const [user1, user2] = userResults;

    // Create multiple sessions
    const session1Id = 'session-1';
    const session2Id = 'session-2';
    const session3Id = 'session-3';

    await db.insert(sessionsTable)
      .values([
        {
          id: session1Id,
          user_id: user1.id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        {
          id: session2Id,
          user_id: user1.id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        {
          id: session3Id,
          user_id: user2.id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      ])
      .execute();

    // Verify all sessions exist
    const allSessionsBefore = await db.select()
      .from(sessionsTable)
      .execute();
    expect(allSessionsBefore).toHaveLength(3);

    // Logout from session1
    const result = await logoutUser(session1Id);
    expect(result.success).toBe(true);

    // Verify only session1 was deleted
    const remainingSessions = await db.select()
      .from(sessionsTable)
      .execute();

    expect(remainingSessions).toHaveLength(2);
    
    const remainingSessionIds = remainingSessions.map(s => s.id);
    expect(remainingSessionIds).toContain(session2Id);
    expect(remainingSessionIds).toContain(session3Id);
    expect(remainingSessionIds).not.toContain(session1Id);
  });

  it('should handle empty string session ID', async () => {
    const result = await logoutUser('');
    expect(result.success).toBe(true);
  });

  it('should handle very long session ID', async () => {
    const longSessionId = 'a'.repeat(300);
    const result = await logoutUser(longSessionId);
    expect(result.success).toBe(true);
  });
});