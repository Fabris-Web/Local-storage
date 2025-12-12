const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

let supabase;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} else {
  // lightweight stub to avoid runtime crashes when env vars are missing
  supabase = {
    from: () => ({ data: null, error: new Error('Supabase not configured') }),
    rpc: async () => ({ data: null, error: new Error('Supabase not configured') })
  };
}

module.exports = supabase;
