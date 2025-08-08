import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletsTable } from '../db/schema';
import { getAllUsers } from '../handlers/get_all_users';

describe('getAllUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getAllUsers();
    
    expect(result).toEqual([]);
  });

  it('should return all users without password field', async () => {
    // Create test users
    const testUsers = [
      {
        email: 'user1@test.com',
        password: 'password123',
        full_name: 'User One',
        phone_number: '1234567890',
        role: 'user' as const,
        is_active: true
      },
      {
        email: 'admin@test.com',
        password: 'adminpass123',
        full_name: 'Admin User',
        phone_number: null,
        role: 'admin' as const,
        is_active: true
      },
      {
        email: 'inactive@test.com',
        password: 'inactivepass123',
        full_name: 'Inactive User',
        phone_number: '9876543210',
        role: 'user' as const,
        is_active: false
      }
    ];

    await db.insert(usersTable).values(testUsers).execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(3);
    
    // Verify all expected fields are present and password is excluded
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.full_name).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.is_active).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
      expect(user).not.toHaveProperty('password');
    });

    // Verify specific user data
    const user1 = result.find(u => u.email === 'user1@test.com');
    expect(user1).toBeDefined();
    expect(user1!.full_name).toBe('User One');
    expect(user1!.phone_number).toBe('1234567890');
    expect(user1!.role).toBe('user');
    expect(user1!.is_active).toBe(true);

    const adminUser = result.find(u => u.email === 'admin@test.com');
    expect(adminUser).toBeDefined();
    expect(adminUser!.full_name).toBe('Admin User');
    expect(adminUser!.phone_number).toBeNull();
    expect(adminUser!.role).toBe('admin');
    expect(adminUser!.is_active).toBe(true);

    const inactiveUser = result.find(u => u.email === 'inactive@test.com');
    expect(inactiveUser).toBeDefined();
    expect(inactiveUser!.full_name).toBe('Inactive User');
    expect(inactiveUser!.role).toBe('user');
    expect(inactiveUser!.is_active).toBe(false);
  });

  it('should return users in correct order (by id)', async () => {
    // Create users in specific order
    const user1Data = {
      email: 'first@test.com',
      password: 'password123',
      full_name: 'First User',
      phone_number: null,
      role: 'user' as const
    };

    const user2Data = {
      email: 'second@test.com',
      password: 'password123',
      full_name: 'Second User',
      phone_number: null,
      role: 'admin' as const
    };

    // Insert first user
    await db.insert(usersTable).values(user1Data).execute();
    // Insert second user
    await db.insert(usersTable).values(user2Data).execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(2);
    // Users should be returned in the order they were inserted (by id)
    expect(result[0].email).toBe('first@test.com');
    expect(result[1].email).toBe('second@test.com');
    expect(result[0].id).toBeLessThan(result[1].id);
  });

  it('should handle users with different role types correctly', async () => {
    const testUsers = [
      {
        email: 'regular@test.com',
        password: 'password123',
        full_name: 'Regular User',
        phone_number: '1111111111',
        role: 'user' as const,
        is_active: true
      },
      {
        email: 'superadmin@test.com',
        password: 'adminpass123',
        full_name: 'Super Admin',
        phone_number: '2222222222',
        role: 'admin' as const,
        is_active: true
      }
    ];

    await db.insert(usersTable).values(testUsers).execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(2);
    
    const regularUser = result.find(u => u.role === 'user');
    const adminUser = result.find(u => u.role === 'admin');

    expect(regularUser).toBeDefined();
    expect(regularUser!.email).toBe('regular@test.com');
    expect(regularUser!.role).toBe('user');

    expect(adminUser).toBeDefined();
    expect(adminUser!.email).toBe('superadmin@test.com');
    expect(adminUser!.role).toBe('admin');
  });

  it('should handle users with and without phone numbers', async () => {
    const testUsers = [
      {
        email: 'withphone@test.com',
        password: 'password123',
        full_name: 'User With Phone',
        phone_number: '+1234567890',
        role: 'user' as const,
        is_active: true
      },
      {
        email: 'withoutphone@test.com',
        password: 'password123',
        full_name: 'User Without Phone',
        phone_number: null,
        role: 'user' as const,
        is_active: true
      }
    ];

    await db.insert(usersTable).values(testUsers).execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(2);
    
    const userWithPhone = result.find(u => u.email === 'withphone@test.com');
    const userWithoutPhone = result.find(u => u.email === 'withoutphone@test.com');

    expect(userWithPhone!.phone_number).toBe('+1234567890');
    expect(userWithoutPhone!.phone_number).toBeNull();
  });

  it('should return users even when they have associated wallets', async () => {
    // Create a user first
    const userResults = await db.insert(usersTable).values({
      email: 'userwithwallet@test.com',
      password: 'password123',
      full_name: 'User With Wallet',
      phone_number: null,
      role: 'user' as const,
      is_active: true
    }).returning().execute();

    const userId = userResults[0].id;

    // Create a wallet for the user
    await db.insert(walletsTable).values({
      user_id: userId,
      balance: '100.50'
    }).execute();

    const result = await getAllUsers();

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('userwithwallet@test.com');
    expect(result[0].full_name).toBe('User With Wallet');
    // Handler should not include wallet information in the response
    expect(result[0]).not.toHaveProperty('wallet_balance');
  });
});