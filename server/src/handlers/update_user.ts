import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateUser(input: UpdateUserInput): Promise<Omit<User, 'password'>> {
  try {
    // First check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }

    if (input.phone_number !== undefined) {
      updateData.phone_number = input.phone_number;
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    if (input.role !== undefined) {
      updateData.role = input.role;
    }

    // Update the user
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    const updatedUser = result[0];

    // Return user without password
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      phone_number: updatedUser.phone_number,
      role: updatedUser.role,
      is_active: updatedUser.is_active,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}