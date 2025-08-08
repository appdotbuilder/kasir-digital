import { db } from '../db';
import { walletsTable, depositsTable } from '../db/schema';
import { type CreateDepositInput, type Deposit } from '../schema';
import { eq } from 'drizzle-orm';

export async function createDeposit(userId: number, input: CreateDepositInput): Promise<Deposit> {
  try {
    // 1. Find user's wallet
    const userWallets = await db.select()
      .from(walletsTable)
      .where(eq(walletsTable.user_id, userId))
      .execute();

    if (userWallets.length === 0) {
      throw new Error('User wallet not found');
    }

    const wallet = userWallets[0];

    // 2. Create deposit record with pending status
    const depositResult = await db.insert(depositsTable)
      .values({
        wallet_id: wallet.id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        status: 'pending',
        payment_method: input.payment_method
      })
      .returning()
      .execute();

    const deposit = depositResult[0];

    // 3. Simulate payment processing (for now, auto-complete)
    // 4. Update deposit status to completed and update wallet balance
    await db.update(depositsTable)
      .set({ 
        status: 'completed',
        updated_at: new Date()
      })
      .where(eq(depositsTable.id, deposit.id))
      .execute();

    // Update wallet balance
    const currentBalance = parseFloat(wallet.balance);
    const newBalance = currentBalance + input.amount;
    
    await db.update(walletsTable)
      .set({ 
        balance: newBalance.toString(),
        updated_at: new Date()
      })
      .where(eq(walletsTable.id, wallet.id))
      .execute();

    // 5. Return completed deposit record
    const completedDepositResult = await db.select()
      .from(depositsTable)
      .where(eq(depositsTable.id, deposit.id))
      .execute();

    const completedDeposit = completedDepositResult[0];

    return {
      ...completedDeposit,
      amount: parseFloat(completedDeposit.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Deposit creation failed:', error);
    throw error;
  }
}