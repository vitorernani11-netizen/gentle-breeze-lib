// Better mock for Supabase Client to satisfy TypeScript and provide local-user identity
export const supabase = {
  auth: {
    getSession: async () => ({ 
      data: { 
        session: { 
          user: { id: 'local-user', email: 'unico@usuario.app' },
          access_token: 'local-mock-token'
        } 
      }, 
      error: null 
    }),
    getUser: async () => ({ 
      data: { user: { id: 'local-user', email: 'unico@usuario.app' } }, 
      error: null 
    }),
    onAuthStateChange: (callback: any) => {
      // Simulate an initial auth event
      setTimeout(() => {
        callback('SIGNED_IN', { user: { id: 'local-user', email: 'unico@usuario.app' } });
      }, 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async () => ({ data: { session: {} }, error: null }),
    signUp: async () => ({ data: { user: {}, session: {} }, error: null }),
    signOut: async () => ({ error: null }),
  },
  from: (table: string) => {
    const chainable = {
      select: () => chainable,
      insert: () => chainable,
      update: () => chainable,
      upsert: () => chainable,
      delete: () => chainable,
      eq: () => chainable,
      gte: () => chainable,
      lte: () => chainable,
      lt: () => chainable,
      order: () => chainable,
      limit: () => chainable,
      single: () => Promise.resolve({ data: null, error: null, count: 0 }),
      then: (resolve: any) => resolve({ data: [], error: null, count: 0 }),
    };
    return chainable as any;
  },
} as any;
