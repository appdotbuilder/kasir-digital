import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  registerUserInputSchema,
  loginInputSchema,
  createDepositInputSchema,
  createTransactionInputSchema,
  getTransactionsInputSchema,
  updateUserInputSchema
} from './schema';

// Import all handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { logoutUser } from './handlers/logout_user';
import { getWalletBalance } from './handlers/get_wallet_balance';
import { createDeposit } from './handlers/create_deposit';
import { getDigitalProducts } from './handlers/get_digital_products';
import { getProductCategories } from './handlers/get_product_categories';
import { createTransaction } from './handlers/create_transaction';
import { getUserTransactions } from './handlers/get_user_transactions';
import { getAdminStats } from './handlers/get_admin_stats';
import { getAllUsers } from './handlers/get_all_users';
import { updateUser } from './handlers/update_user';
import { getAllTransactions } from './handlers/get_all_transactions';
import { validateSession } from './handlers/validate_session';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Middleware for authentication
const authenticatedProcedure = publicProcedure.use(async ({ next, ctx }) => {
  // For now, this is a placeholder middleware
  // In real implementation, this would validate session from headers/cookies
  const sessionId = 'placeholder-session'; // Extract from request headers
  const user = await validateSession(sessionId);
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return next({
    ctx: {
      ...ctx,
      user,
      sessionId
    }
  });
});

// Middleware for admin authentication
const adminProcedure = authenticatedProcedure.use(async ({ next, ctx }) => {
  if (ctx.user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return next();
});

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  logout: authenticatedProcedure
    .mutation(({ ctx }) => logoutUser(ctx.sessionId)),

  // Wallet routes
  getWalletBalance: authenticatedProcedure
    .query(({ ctx }) => getWalletBalance(ctx.user.id)),

  createDeposit: authenticatedProcedure
    .input(createDepositInputSchema)
    .mutation(({ input, ctx }) => createDeposit(ctx.user.id, input)),

  // Product routes
  getProductCategories: publicProcedure
    .query(() => getProductCategories()),

  getDigitalProducts: publicProcedure
    .input(z.object({ categoryId: z.number().optional() }))
    .query(({ input }) => getDigitalProducts(input.categoryId)),

  // Transaction routes
  createTransaction: authenticatedProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input, ctx }) => createTransaction(ctx.user.id, input)),

  getUserTransactions: authenticatedProcedure
    .input(getTransactionsInputSchema)
    .query(({ input, ctx }) => getUserTransactions(ctx.user.id, input)),

  // Admin routes
  getAdminStats: adminProcedure
    .query(() => getAdminStats()),

  getAllUsers: adminProcedure
    .query(() => getAllUsers()),

  updateUser: adminProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  getAllTransactions: adminProcedure
    .input(getTransactionsInputSchema)
    .query(({ input }) => getAllTransactions(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors({
        origin: process.env['CLIENT_URL'] || 'http://localhost:3000',
        credentials: true
      })(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log('Available routes:');
  console.log('- Public: healthcheck, register, login, getProductCategories, getDigitalProducts');
  console.log('- Authenticated: logout, getWalletBalance, createDeposit, createTransaction, getUserTransactions');
  console.log('- Admin: getAdminStats, getAllUsers, updateUser, getAllTransactions');
}

start();