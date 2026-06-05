const serverless = require('serverless-http');
const { initSupabase } = require('../supabaseClient');
const app = require('../server');

const handler = serverless(app);

// Ensure Supabase is initialized before handling any requests
module.exports.handler = async (event, context) => {
  await initSupabase();
  return handler(event, context);
};
