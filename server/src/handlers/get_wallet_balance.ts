import { db } from '../db';
import { walletsTable } from '../db/schema';
import { type WalletBalanceResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function getWalletBalance(userId: number): Promise<WalletBalanceResponse> {
  try {
    // Find existing wallet by user ID
    const existingWallet = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, userId))
      .limit(1)
      .execute();

    // If wallet exists, return its balance
    if (existingWallet.length > 0) {
      const wallet = existingWallet[0];
      return {
        balance: parseFloat(wallet.balance), // Convert numeric string to number
        wallet_id: wallet.id
      };
    }

    // If no wallet exists, create one with default balance of 0
    const newWallet = await db.insert(walletsTable)
      .values({
        user_id: userId,
        balance: '0.00' // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const createdWallet = newWallet[0];
    return {
      balance: parseFloat(createdWallet.balance), // Convert numeric string to number
      wallet_id: createdWallet.id
    };
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    throw error;
  }
}