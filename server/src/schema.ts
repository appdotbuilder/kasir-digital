import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password: z.string(),
  full_name: z.string(),
  phone_number: z.string().nullable(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for user registration
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  phone_number: z.string().nullable().optional()
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// Input schema for user login
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Digital wallet schema
export const walletSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  balance: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Wallet = z.infer<typeof walletSchema>;

// Deposit transaction schema
export const depositSchema = z.object({
  id: z.number(),
  wallet_id: z.number(),
  amount: z.number().positive(),
  status: z.enum(['pending', 'completed', 'failed']),
  payment_method: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Deposit = z.infer<typeof depositSchema>;

// Input schema for deposit
export const createDepositInputSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.string()
});

export type CreateDepositInput = z.infer<typeof createDepositInputSchema>;

// Digital product category schema
export const productCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type ProductCategory = z.infer<typeof productCategorySchema>;

// Digital product schema
export const digitalProductSchema = z.object({
  id: z.number(),
  category_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().positive(),
  provider: z.string(),
  product_code: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type DigitalProduct = z.infer<typeof digitalProductSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  product_id: z.number(),
  wallet_id: z.number(),
  amount: z.number().positive(),
  customer_number: z.string(),
  status: z.enum(['pending', 'processing', 'success', 'failed']),
  transaction_code: z.string(),
  provider_reference: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schema for creating transaction
export const createTransactionInputSchema = z.object({
  product_id: z.number(),
  customer_number: z.string().min(1),
  amount: z.number().positive()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Session schema for authentication
export const sessionSchema = z.object({
  id: z.string(),
  user_id: z.number(),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Session = z.infer<typeof sessionSchema>;

// Response schemas
export const authResponseSchema = z.object({
  user: userSchema.omit({ password: true }),
  session_id: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const walletBalanceResponseSchema = z.object({
  balance: z.number(),
  wallet_id: z.number()
});

export type WalletBalanceResponse = z.infer<typeof walletBalanceResponseSchema>;

// Admin dashboard stats schema
export const adminStatsSchema = z.object({
  total_users: z.number(),
  total_transactions: z.number(),
  total_revenue: z.number(),
  active_users: z.number()
});

export type AdminStats = z.infer<typeof adminStatsSchema>;

// Input schema for admin user management
export const updateUserInputSchema = z.object({
  id: z.number(),
  full_name: z.string().optional(),
  phone_number: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  role: userRoleSchema.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Transaction list response with pagination
export const transactionListResponseSchema = z.object({
  transactions: z.array(transactionSchema),
  total_count: z.number(),
  page: z.number(),
  limit: z.number()
});

export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;

// Input schema for transaction queries
export const getTransactionsInputSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'processing', 'success', 'failed']).optional(),
  user_id: z.number().optional()
});

export type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;