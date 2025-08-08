import { db } from '../db';
import { sessionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function logoutUser(sessionId: string): Promise<{ success: boolean }> {
  try {
    // Delete session from database
    const result = await db.delete(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .execute();

    // Return success status
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}