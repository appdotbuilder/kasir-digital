import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productCategoriesTable } from '../db/schema';
import { getProductCategories } from '../handlers/get_product_categories';

describe('getProductCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getProductCategories();
    expect(result).toEqual([]);
  });

  it('should return all active categories', async () => {
    // Create test categories - some active, some inactive
    await db.insert(productCategoriesTable)
      .values([
        {
          name: 'Mobile Recharge',
          description: 'Mobile phone top-up services',
          is_active: true
        },
        {
          name: 'Data Packages',
          description: 'Internet data bundles',
          is_active: true
        },
        {
          name: 'Utility Bills',
          description: 'Electricity and water bill payments',
          is_active: false // This should not be returned
        }
      ])
      .execute();

    const result = await getProductCategories();

    // Should only return active categories
    expect(result).toHaveLength(2);
    
    // Verify returned categories
    const categoryNames = result.map(cat => cat.name).sort();
    expect(categoryNames).toEqual(['Data Packages', 'Mobile Recharge']);

    // Verify all returned categories are active
    result.forEach(category => {
      expect(category.is_active).toBe(true);
      expect(category.id).toBeDefined();
      expect(category.created_at).toBeInstanceOf(Date);
      expect(typeof category.name).toBe('string');
    });
  });

  it('should return categories with correct field types', async () => {
    // Create a test category with all fields
    await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test description for validation',
        is_active: true
      })
      .execute();

    const result = await getProductCategories();

    expect(result).toHaveLength(1);
    const category = result[0];

    // Verify field types
    expect(typeof category.id).toBe('number');
    expect(typeof category.name).toBe('string');
    expect(typeof category.description).toBe('string');
    expect(typeof category.is_active).toBe('boolean');
    expect(category.created_at).toBeInstanceOf(Date);

    // Verify field values
    expect(category.name).toBe('Test Category');
    expect(category.description).toBe('Test description for validation');
    expect(category.is_active).toBe(true);
  });

  it('should handle categories with null description', async () => {
    // Create category with null description
    await db.insert(productCategoriesTable)
      .values({
        name: 'Category with null description',
        description: null,
        is_active: true
      })
      .execute();

    const result = await getProductCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Category with null description');
    expect(result[0].description).toBeNull();
    expect(result[0].is_active).toBe(true);
  });

  it('should not return inactive categories', async () => {
    // Create only inactive categories
    await db.insert(productCategoriesTable)
      .values([
        {
          name: 'Inactive Category 1',
          description: 'This should not appear',
          is_active: false
        },
        {
          name: 'Inactive Category 2',
          description: 'This should also not appear',
          is_active: false
        }
      ])
      .execute();

    const result = await getProductCategories();

    // Should return empty array since all categories are inactive
    expect(result).toEqual([]);
  });

  it('should return categories ordered by database default order', async () => {
    // Create multiple categories to test ordering
    const categoryData = [
      { name: 'Zebra Category', description: 'Last alphabetically', is_active: true },
      { name: 'Alpha Category', description: 'First alphabetically', is_active: true },
      { name: 'Beta Category', description: 'Middle alphabetically', is_active: true }
    ];

    // Insert categories in a specific order
    for (const category of categoryData) {
      await db.insert(productCategoriesTable)
        .values(category)
        .execute();
    }

    const result = await getProductCategories();

    expect(result).toHaveLength(3);
    // Categories should be returned in insertion order (by id) since no ORDER BY is specified
    expect(result[0].name).toBe('Zebra Category');
    expect(result[1].name).toBe('Alpha Category');
    expect(result[2].name).toBe('Beta Category');
  });
});