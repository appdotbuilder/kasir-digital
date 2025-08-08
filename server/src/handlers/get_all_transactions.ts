import { db } from '../db';
import { transactionsTable, usersTable, digitalProductsTable } from '../db/schema';
import { type GetTransactionsInput, type TransactionListResponse } from '../schema';
import { eq, and, desc, count } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getAllTransactions(input: GetTransactionsInput): Promise<TransactionListResponse> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (input.status) {
      conditions.push(eq(transactionsTable.status, input.status));
    }

    if (input.user_id) {
      conditions.push(eq(transactionsTable.user_id, input.user_id));
    }

    // Calculate offset for pagination
    const offset = (input.page - 1) * input.limit;

    // Build and execute main query in one chain
    const baseQuery = db.select({
      id: transactionsTable.id,
      user_id: transactionsTable.user_id,
      product_id: transactionsTable.product_id,
      wallet_id: transactionsTable.wallet_id,
      amount: transactionsTable.amount,
      customer_number: transactionsTable.customer_number,
      status: transactionsTable.status,
      transaction_code: transactionsTable.transaction_code,
      provider_reference: transactionsTable.provider_reference,
      created_at: transactionsTable.created_at,
      updated_at: transactionsTable.updated_at,
      user_full_name: usersTable.full_name,
      user_email: usersTable.email,
      product_name: digitalProductsTable.name,
      product_provider: digitalProductsTable.provider
    })
    .from(transactionsTable)
    .innerJoin(usersTable, eq(transactionsTable.user_id, usersTable.id))
    .innerJoin(digitalProductsTable, eq(transactionsTable.product_id, digitalProductsTable.id));

    // Execute query with conditional where clause
    const results = conditions.length > 0
      ? await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(transactionsTable.created_at))
          .limit(input.limit)
          .offset(offset)
          .execute()
      : await baseQuery
          .orderBy(desc(transactionsTable.created_at))
          .limit(input.limit)
          .offset(offset)
          .execute();

    // Build and execute count query
    const countBaseQuery = db.select({ count: count() })
      .from(transactionsTable);

    const [{ count: totalCount }] = conditions.length > 0
      ? await countBaseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await countBaseQuery.execute();

    // Transform results to match Transaction schema
    const transactions = results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      product_id: result.product_id,
      wallet_id: result.wallet_id,
      amount: parseFloat(result.amount), // Convert numeric string to number
      customer_number: result.customer_number,
      status: result.status,
      transaction_code: result.transaction_code,
      provider_reference: result.provider_reference,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));

    return {
      transactions,
      total_count: totalCount,
      page: input.page,
      limit: input.limit
    };
  } catch (error) {
    console.error('Get all transactions failed:', error);
    throw error;
  }
}