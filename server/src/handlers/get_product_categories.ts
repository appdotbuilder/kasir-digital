import { db } from '../db';
import { productCategoriesTable } from '../db/schema';
import { type ProductCategory } from '../schema';
import { eq } from 'drizzle-orm';

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  try {
    // Fetch all active product categories from database
    const results = await db.select()
      .from(productCategoriesTable)
      .where(eq(productCategoriesTable.is_active, true))
      .execute();

    // Return categories - no numeric conversion needed as all fields are strings/booleans/dates
    return results;
  } catch (error) {
    console.error('Failed to fetch product categories:', error);
    throw error;
  }
};