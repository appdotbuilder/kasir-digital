import { db } from '../db';
import { digitalProductsTable, walletsTable, transactionsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createTransaction(userId: number, input: CreateTransactionInput): Promise<Transaction> {
  try {
    // 1. Validate product exists and is active
    const products = await db.select()
      .from(digitalProductsTable)
      .where(and(
        eq(digitalProductsTable.id, input.product_id),
        eq(digitalProductsTable.is_active, true)
      ))
      .execute();

    if (products.length === 0) {
      throw new Error('Product not found or inactive');
    }

    const product = products[0];

    // 2. Get user wallet and check balance
    const wallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, userId))
      .execute();

    if (wallets.length === 0) {
      throw new Error('User wallet not found');
    }

    const wallet = wallets[0];
    const currentBalance = parseFloat(wallet.balance);
    const transactionAmount = input.amount;

    if (currentBalance < transactionAmount) {
      throw new Error('Insufficient wallet balance');
    }

    // 3. Generate unique transaction code
    const transactionCode = `TXN-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 4. Create transaction record with pending status
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        product_id: input.product_id,
        wallet_id: wallet.id,
        amount: transactionAmount.toString(), // Convert to string for numeric column
        customer_number: input.customer_number,
        status: 'pending',
        transaction_code: transactionCode,
        provider_reference: null
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // 5. Deduct amount from wallet balance
    const newBalance = (currentBalance - transactionAmount).toString();
    await db.update(walletsTable)
      .set({ 
        balance: newBalance,
        updated_at: new Date()
      })
      .where(eq(walletsTable.id, wallet.id))
      .execute();

    // 6. Simulate external API call to provider
    const providerResponse = await simulateProviderAPI(product.provider, input.customer_number, transactionAmount);

    // 7. Update transaction status based on provider response
    const finalStatus = providerResponse.success ? 'success' : 'failed';
    const providerReference = providerResponse.reference;

    // If transaction failed, refund the wallet
    if (!providerResponse.success) {
      const refundBalance = (parseFloat(newBalance) + transactionAmount).toString();
      await db.update(walletsTable)
        .set({ 
          balance: refundBalance,
          updated_at: new Date()
        })
        .where(eq(walletsTable.id, wallet.id))
        .execute();
    }

    // Update transaction with final status and provider reference
    const updatedTransactionResult = await db.update(transactionsTable)
      .set({
        status: finalStatus,
        provider_reference: providerReference,
        updated_at: new Date()
      })
      .where(eq(transactionsTable.id, transaction.id))
      .returning()
      .execute();

    const finalTransaction = updatedTransactionResult[0];

    // 8. Return transaction record with proper numeric conversion
    return {
      ...finalTransaction,
      amount: parseFloat(finalTransaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}

// Simulate external provider API call
async function simulateProviderAPI(provider: string, customerNumber: string, amount: number): Promise<{success: boolean, reference: string | null}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Simulate different success rates based on provider
  const successRate = provider.toLowerCase().includes('test') ? 0.5 : 0.9;
  const isSuccess = Math.random() < successRate;

  return {
    success: isSuccess,
    reference: isSuccess ? `${provider.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` : null
  };
}