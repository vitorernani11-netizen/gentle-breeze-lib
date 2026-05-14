const createMockSupabase = () => {
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

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => chainable,
  } as any;
};

export const supabase = createMockSupabase();
