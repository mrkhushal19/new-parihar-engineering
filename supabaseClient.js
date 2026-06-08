const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

let supabase = null;
let online = false;
let initPromise = null;
let initError = null;

async function initSupabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    if (!url || !key || url.includes('your-project-id') || key.includes('your-anon-key')) {
      const warnMsg = 'Credentials not configured or contain placeholder text';
      console.warn(`\n⚠️  [Supabase] ${warnMsg} — running in OFFLINE mode (local JSON files)`);
      initError = warnMsg;
      return;
    }

    try {
      supabase = createClient(url, key, {
        realtime: {
          transport: ws
        }
      });
      online = true;
      initError = null;
      console.log(`✅ [Supabase] Client initialized successfully — ONLINE mode: ${url}`);
    } catch (error) {
      supabase = null;
      online = false;
      initPromise = null; // Clear promise to allow connection retry on next request
      initError = error.message;
      console.warn(`\n⚠️  [Supabase] Client initialization failed: ${error.message} — falling back to OFFLINE mode\n`);
    }
  })();

  return initPromise;
}

module.exports = {
  initSupabase,
  getSupabase: () => supabase,
  isOnline: () => online,
  getInitError: () => initError
};
