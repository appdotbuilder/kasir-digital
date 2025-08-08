import { db } from '../db';
import { sessionsTable, usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function validateSession(sessionId: string): Promise<Omit<User, 'password'> | null> {
  try {
    // Find session by ID with associated user data
    const result = await db.select({
      session: sessionsTable,
      user: usersTable
    })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.user_id, usersTable.id))
      .where(eq(sessionsTable.id, sessionId))
      .execute();

    // No session found
    if (result.length === 0) {
      return null;
    }

    const { session, user } = result[0];

    // Check if session is expired
    const now = new Date();
    if (session.expires_at <= now) {
      return null;
    }

    // Check if user is still active
    if (!user.is_active) {
      return null;
    }

    // Return user data without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Session validation failed:', error);
    throw error;
  }
}