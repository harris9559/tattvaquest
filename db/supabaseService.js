const { createClient } = require("@supabase/supabase-js");

let cachedServiceClient;

function getSupabaseServiceClient() {
  if (cachedServiceClient) return cachedServiceClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  cachedServiceClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedServiceClient;
}

module.exports = { getSupabaseServiceClient };
