import { db } from '../db';
import { usersTable, sessionsTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

// Simple password hashing utility using Node.js crypto
const hashPassword = (password: string, salt: string): string => {
  return pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
};

const verifyPassword = (password: string, hashedPassword: string): boolean => {
  // Extract salt from stored hash (format: salt:hash)
  const [salt, hash] = hashedPassword.split(':');
  if (!salt || !hash) return false;
  
  const hashedInput = hashPassword(password, salt);
  return hashedInput === hash;
};

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    // Verify password
    const isPasswordValid = verifyPassword(input.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate session ID
    const sessionId = randomBytes(32).toString('hex');

    // Create session (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.insert(sessionsTable)
      .values({
        id: sessionId,
        user_id: user.id,
        expires_at: expiresAt
      })
      .execute();

    // Return user data without password and session ID
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      session_id: sessionId
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}