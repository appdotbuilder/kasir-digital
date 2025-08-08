import { db } from '../db';
import { usersTable, walletsTable, sessionsTable } from '../db/schema';
import { type RegisterUserInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

export async function registerUser(input: RegisterUserInput): Promise<AuthResponse> {
  try {
    // 1. Check if email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .limit(1)
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Email already exists');
    }

    // 2. Hash the password (simple hash for demo - use bcrypt in production)
    const hashedPassword = crypto
      .createHash('sha256')
      .update(input.password)
      .digest('hex');

    // 3. Create user record
    const userResult = await db.insert(usersTable)
      .values({
        email: input.email,
        password: hashedPassword,
        full_name: input.full_name,
        phone_number: input.phone_number || null,
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const newUser = userResult[0];

    // 4. Create associated wallet with zero balance
    await db.insert(walletsTable)
      .values({
        user_id: newUser.id,
        balance: '0.00'
      })
      .execute();

    // 5. Generate session token
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    await db.insert(sessionsTable)
      .values({
        id: sessionId,
        user_id: newUser.id,
        expires_at: expiresAt
      })
      .execute();

    // 6. Return user data (without password) and session
    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        phone_number: newUser.phone_number,
        role: newUser.role,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      },
      session_id: sessionId
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}