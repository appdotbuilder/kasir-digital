import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export async function getAllUsers(): Promise<Omit<User, 'password'>[]> {
  try {
    // Query all users, excluding the password field for security
    const results = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      full_name: usersTable.full_name,
      phone_number: usersTable.phone_number,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get all users:', error);
    throw error;
  }
}