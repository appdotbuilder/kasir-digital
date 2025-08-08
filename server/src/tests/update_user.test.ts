import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'hashedpassword123',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();
    
    testUserId = result[0].id;
  });

  it('should update user full name', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      full_name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(testUserId);
    expect(result.full_name).toEqual('Updated Name');
    expect(result.email).toEqual('test@example.com');
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.role).toEqual('user');
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect('password' in result).toBe(false);
  });

  it('should update user phone number', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      phone_number: '+9876543210'
    };

    const result = await updateUser(updateInput);

    expect(result.phone_number).toEqual('+9876543210');
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
  });

  it('should update user phone number to null', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      phone_number: null
    };

    const result = await updateUser(updateInput);

    expect(result.phone_number).toBeNull();
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
  });

  it('should update user status', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.is_active).toEqual(false);
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
  });

  it('should update user role', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      role: 'admin'
    };

    const result = await updateUser(updateInput);

    expect(result.role).toEqual('admin');
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      full_name: 'Admin User',
      role: 'admin',
      is_active: false,
      phone_number: '+5555555555'
    };

    const result = await updateUser(updateInput);

    expect(result.full_name).toEqual('Admin User');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(false);
    expect(result.phone_number).toEqual('+5555555555');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
  });

  it('should update updated_at timestamp', async () => {
    // Get original user data
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const originalUpdatedAt = originalUser[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: testUserId,
      full_name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should save changes to database', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      full_name: 'Database Updated Name',
      role: 'admin'
    };

    await updateUser(updateInput);

    // Verify changes were saved to database
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].full_name).toEqual('Database Updated Name');
    expect(updatedUser[0].role).toEqual('admin');
    expect(updatedUser[0].email).toEqual('test@example.com'); // Unchanged
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      full_name: 'Non-existent User'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Only update one field
    const updateInput: UpdateUserInput = {
      id: testUserId,
      is_active: false
    };

    const result = await updateUser(updateInput);

    // Only is_active should change, everything else should remain the same
    expect(result.is_active).toEqual(false);
    expect(result.full_name).toEqual('Test User');
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.role).toEqual('user');
    expect(result.email).toEqual('test@example.com');
  });

  it('should not return password field', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      full_name: 'Security Test'
    };

    const result = await updateUser(updateInput);

    expect('password' in result).toBe(false);
    expect(Object.keys(result)).not.toContain('password');
  });

  it('should preserve created_at timestamp', async () => {
    // Get original created_at
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const originalCreatedAt = originalUser[0].created_at;

    const updateInput: UpdateUserInput = {
      id: testUserId,
      full_name: 'Timestamp Test'
    };

    const result = await updateUser(updateInput);

    expect(result.created_at.getTime()).toEqual(originalCreatedAt.getTime());
  });
});