const { createClient } = require('@supabase/supabase-js');

let supabase = null;
let online = false;
let initPromise = null;

async function initSupabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    if (!url || !key || url.includes('your-project-id') || key.includes('your-anon-key')) {
      console.warn('\n⚠️  [Supabase] Credentials not configured — running in OFFLINE mode (local JSON files)');
      return;
    }

    try {
      supabase = createClient(url, key, {
        global: {
          fetch: (fetchUrl, options = {}) => {
            return fetch(fetchUrl, {
              ...options,
              signal: AbortSignal.timeout(15000)
            });
          }
        }
      });
      const { error } = await supabase.from('products').select('id').limit(1);
      if (error) throw error;
      online = true;
      console.log(`✅ [Supabase] Connected successfully — ONLINE mode: ${url}`);
    } catch (error) {
      supabase = null;
      online = false;
      initPromise = null; // Clear promise to allow connection retry on next request
      console.warn(`\n⚠️  [Supabase] Connection failed: ${error.message} — falling back to OFFLINE mode\n`);
    }
  })();

  return initPromise;
}

module.exports = {
  initSupabase,
  getSupabase: () => supabase,
  isOnline: () => online
};
