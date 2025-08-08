import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { digitalProductsTable, productCategoriesTable } from '../db/schema';
import { getDigitalProducts } from '../handlers/get_digital_products';

describe('getDigitalProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getDigitalProducts();
    expect(result).toEqual([]);
  });

  it('should return all active products when no category filter provided', async () => {
    // Create test category
    const category = await db.insert(productCategoriesTable)
      .values({
        name: 'Mobile Data',
        description: 'Mobile data packages',
        is_active: true
      })
      .returning()
      .execute();

    // Create test products
    const products = await db.insert(digitalProductsTable)
      .values([
        {
          category_id: category[0].id,
          name: '1GB Data Pack',
          description: '1GB mobile data',
          price: '10.00',
          provider: 'Provider A',
          product_code: 'DATA_1GB',
          is_active: true
        },
        {
          category_id: category[0].id,
          name: '5GB Data Pack',
          description: '5GB mobile data',
          price: '25.50',
          provider: 'Provider A',
          product_code: 'DATA_5GB',
          is_active: true
        }
      ])
      .returning()
      .execute();

    const result = await getDigitalProducts();

    expect(result).toHaveLength(2);
    
    // Results are ordered by ID, so first product should be the first inserted
    const productNames = result.map(p => p.name).sort();
    expect(productNames).toContain('1GB Data Pack');
    expect(productNames).toContain('5GB Data Pack');
    
    // Check first result (ordered by id)
    expect(result[0].name).toEqual('1GB Data Pack');
    expect(result[0].price).toEqual(10.00);
    expect(typeof result[0].price).toEqual('number');
    expect(result[0].category_id).toEqual(category[0].id);
    
    // Check second result
    expect(result[1].name).toEqual('5GB Data Pack');
    expect(result[1].price).toEqual(25.50);
    expect(typeof result[1].price).toEqual('number');
  });

  it('should filter products by category when categoryId provided', async () => {
    // Create test categories
    const categories = await db.insert(productCategoriesTable)
      .values([
        {
          name: 'Mobile Data',
          description: 'Mobile data packages',
          is_active: true
        },
        {
          name: 'Airtime',
          description: 'Mobile airtime',
          is_active: true
        }
      ])
      .returning()
      .execute();

    // Create products in different categories
    await db.insert(digitalProductsTable)
      .values([
        {
          category_id: categories[0].id,
          name: '1GB Data Pack',
          description: '1GB mobile data',
          price: '10.00',
          provider: 'Provider A',
          product_code: 'DATA_1GB',
          is_active: true
        },
        {
          category_id: categories[1].id,
          name: '$5 Airtime',
          description: '$5 mobile airtime',
          price: '5.00',
          provider: 'Provider B',
          product_code: 'AIRTIME_5',
          is_active: true
        },
        {
          category_id: categories[0].id,
          name: '5GB Data Pack',
          description: '5GB mobile data',
          price: '25.00',
          provider: 'Provider A',
          product_code: 'DATA_5GB',
          is_active: true
        }
      ])
      .execute();

    // Filter by data category
    const dataProducts = await getDigitalProducts(categories[0].id);
    expect(dataProducts).toHaveLength(2);
    expect(dataProducts.every(p => p.category_id === categories[0].id)).toBe(true);
    
    // Check products are ordered by ID
    const dataProductNames = dataProducts.map(p => p.name);
    expect(dataProductNames).toContain('1GB Data Pack');
    expect(dataProductNames).toContain('5GB Data Pack');
    expect(dataProducts[0].name).toEqual('1GB Data Pack'); // First inserted, so lowest ID
    expect(dataProducts[1].name).toEqual('5GB Data Pack');

    // Filter by airtime category
    const airtimeProducts = await getDigitalProducts(categories[1].id);
    expect(airtimeProducts).toHaveLength(1);
    expect(airtimeProducts[0].category_id).toEqual(categories[1].id);
    expect(airtimeProducts[0].name).toEqual('$5 Airtime');
    expect(airtimeProducts[0].price).toEqual(5.00);
  });

  it('should exclude inactive products', async () => {
    // Create test category
    const category = await db.insert(productCategoriesTable)
      .values({
        name: 'Mobile Data',
        description: 'Mobile data packages',
        is_active: true
      })
      .returning()
      .execute();

    // Create active and inactive products
    await db.insert(digitalProductsTable)
      .values([
        {
          category_id: category[0].id,
          name: 'Active Product',
          description: 'This product is active',
          price: '10.00',
          provider: 'Provider A',
          product_code: 'ACTIVE_PROD',
          is_active: true
        },
        {
          category_id: category[0].id,
          name: 'Inactive Product',
          description: 'This product is inactive',
          price: '15.00',
          provider: 'Provider A',
          product_code: 'INACTIVE_PROD',
          is_active: false
        }
      ])
      .execute();

    const result = await getDigitalProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Active Product');
    expect(result[0].is_active).toBe(true);
  });

  it('should exclude products from inactive categories', async () => {
    // Create active and inactive categories
    const categories = await db.insert(productCategoriesTable)
      .values([
        {
          name: 'Active Category',
          description: 'This category is active',
          is_active: true
        },
        {
          name: 'Inactive Category',
          description: 'This category is inactive',
          is_active: false
        }
      ])
      .returning()
      .execute();

    // Create products in both categories
    await db.insert(digitalProductsTable)
      .values([
        {
          category_id: categories[0].id,
          name: 'Product in Active Category',
          description: 'Product description',
          price: '10.00',
          provider: 'Provider A',
          product_code: 'ACTIVE_CAT_PROD',
          is_active: true
        },
        {
          category_id: categories[1].id,
          name: 'Product in Inactive Category',
          description: 'Product description',
          price: '15.00',
          provider: 'Provider A',
          product_code: 'INACTIVE_CAT_PROD',
          is_active: true
        }
      ])
      .execute();

    const result = await getDigitalProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Product in Active Category');
    expect(result[0].category_id).toEqual(categories[0].id);
  });

  it('should return empty array when filtering by non-existent category', async () => {
    // Create test category and product
    const category = await db.insert(productCategoriesTable)
      .values({
        name: 'Mobile Data',
        description: 'Mobile data packages',
        is_active: true
      })
      .returning()
      .execute();

    await db.insert(digitalProductsTable)
      .values({
        category_id: category[0].id,
        name: '1GB Data Pack',
        description: '1GB mobile data',
        price: '10.00',
        provider: 'Provider A',
        product_code: 'DATA_1GB',
        is_active: true
      })
      .execute();

    // Filter by non-existent category
    const result = await getDigitalProducts(999);
    expect(result).toEqual([]);
  });

  it('should handle numeric price conversion correctly', async () => {
    // Create test category
    const category = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Products',
        description: 'Products for testing numeric conversion',
        is_active: true
      })
      .returning()
      .execute();

    // Create product with decimal price
    await db.insert(digitalProductsTable)
      .values({
        category_id: category[0].id,
        name: 'Decimal Price Product',
        description: 'Product with decimal price',
        price: '19.99',
        provider: 'Provider A',
        product_code: 'DECIMAL_PRICE',
        is_active: true
      })
      .execute();

    const result = await getDigitalProducts();

    expect(result).toHaveLength(1);
    expect(result[0].price).toEqual(19.99);
    expect(typeof result[0].price).toEqual('number');
  });

  it('should return products with all required fields', async () => {
    // Create test category
    const category = await db.insert(productCategoriesTable)
      .values({
        name: 'Mobile Data',
        description: 'Mobile data packages',
        is_active: true
      })
      .returning()
      .execute();

    // Create test product
    await db.insert(digitalProductsTable)
      .values({
        category_id: category[0].id,
        name: 'Complete Product',
        description: 'Product with all fields',
        price: '10.00',
        provider: 'Test Provider',
        product_code: 'COMPLETE_PROD',
        is_active: true
      })
      .execute();

    const result = await getDigitalProducts();

    expect(result).toHaveLength(1);
    const product = result[0];
    
    // Verify all required fields are present
    expect(product.id).toBeDefined();
    expect(product.category_id).toEqual(category[0].id);
    expect(product.name).toEqual('Complete Product');
    expect(product.description).toEqual('Product with all fields');
    expect(product.price).toEqual(10.00);
    expect(product.provider).toEqual('Test Provider');
    expect(product.product_code).toEqual('COMPLETE_PROD');
    expect(product.is_active).toBe(true);
    expect(product.created_at).toBeInstanceOf(Date);
    expect(product.updated_at).toBeInstanceOf(Date);
  });
});