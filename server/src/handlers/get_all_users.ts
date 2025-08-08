import { type User } from '../schema';

export async function getAllUsers(): Promise<Omit<User, 'password'>[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to:
    // 1. Fetch all users from database (admin only)
    // 2. Exclude password field for security
    // 3. Include wallet information using relations
    // 4. Return user list for admin management
    
    return Promise.resolve([]);
}