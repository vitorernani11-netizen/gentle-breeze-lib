import { createMiddleware } from '@tanstack/react-router';

// This is now a no-op for local-only operation
export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    return next({
      context: {
        supabase: {} as any,
        userId: 'local-user',
        claims: { sub: 'local-user' },
      },
    });
  },
);
