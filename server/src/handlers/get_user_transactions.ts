import { db } from '../db';
import { transactionsTable, digitalProductsTable } from '../db/schema';
import { type GetTransactionsInput, type TransactionListResponse } from '../schema';
import { eq, and, desc, count } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getUserTransactions(userId: number, input: GetTransactionsInput): Promise<TransactionListResponse> {
  try {
    // Calculate offset for pagination
    const offset = (input.page - 1) * input.limit;

    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(transactionsTable.user_id, userId)
    ];

    // Add optional status filter
    if (input.status) {
      conditions.push(eq(transactionsTable.status, input.status));
    }

    // Build and execute main query with join
    const results = await db.select()
      .from(transactionsTable)
      .innerJoin(
        digitalProductsTable,
        eq(transactionsTable.product_id, digitalProductsTable.id)
      )
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.created_at))
      .limit(input.limit)
      .offset(offset)
      .execute();

    // Get total count for pagination
    const [{ count: totalCount }] = await db.select({ count: count() })
      .from(transactionsTable)
      .where(and(...conditions))
      .execute();

    // Transform results - join results have nested structure
    const transactions = results.map(result => {
      const transaction = result.transactions;
      return {
        ...transaction,
        amount: parseFloat(transaction.amount) // Convert numeric field to number
      };
    });

    return {
      transactions,
      total_count: totalCount,
      page: input.page,
      limit: input.limit
    };
  } catch (error) {
    console.error('Get user transactions failed:', error);
    throw error;
  }
}