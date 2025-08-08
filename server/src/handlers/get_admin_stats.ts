import { db } from '../db';
import { usersTable, transactionsTable, sessionsTable } from '../db/schema';
import { type AdminStats } from '../schema';
import { sql, count, sum, eq, gte, and } from 'drizzle-orm';

export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    // Count total registered users
    const totalUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .execute();

    // Count total transactions
    const totalTransactionsResult = await db.select({ count: count() })
      .from(transactionsTable)
      .execute();

    // Calculate total revenue from successful transactions
    const totalRevenueResult = await db.select({ 
      revenue: sum(transactionsTable.amount)
    })
      .from(transactionsTable)
      .where(eq(transactionsTable.status, 'success'))
      .execute();

    // Count active users (users with sessions in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .innerJoin(sessionsTable, eq(usersTable.id, sessionsTable.user_id))
      .where(
        and(
          gte(sessionsTable.created_at, thirtyDaysAgo),
          eq(usersTable.is_active, true)
        )
      )
      .execute();

    return {
      total_users: totalUsersResult[0].count,
      total_transactions: totalTransactionsResult[0].count,
      total_revenue: totalRevenueResult[0].revenue ? parseFloat(totalRevenueResult[0].revenue) : 0,
      active_users: activeUsersResult[0].count
    };
  } catch (error) {
    console.error('Failed to get admin stats:', error);
    throw error;
  }
};