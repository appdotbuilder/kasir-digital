import { db } from '../db';
import { digitalProductsTable, productCategoriesTable } from '../db/schema';
import { type DigitalProduct } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export const getDigitalProducts = async (categoryId?: number): Promise<DigitalProduct[]> => {
  try {
    // Build conditions array
    const conditions = [
      eq(digitalProductsTable.is_active, true),
      eq(productCategoriesTable.is_active, true)
    ];

    // Add category filter if provided
    if (categoryId !== undefined) {
      conditions.push(eq(digitalProductsTable.category_id, categoryId));
    }

    // Build query with proper method chaining
    const query = db.select()
      .from(digitalProductsTable)
      .innerJoin(
        productCategoriesTable,
        eq(digitalProductsTable.category_id, productCategoriesTable.id)
      )
      .where(and(...conditions))
      .orderBy(asc(digitalProductsTable.id));

    const results = await query.execute();

    // Transform joined results back to DigitalProduct format
    return results.map(result => {
      const product = result.digital_products;
      return {
        ...product,
        price: parseFloat(product.price) // Convert numeric field back to number
      };
    });
  } catch (error) {
    console.error('Failed to fetch digital products:', error);
    throw error;
  }
};