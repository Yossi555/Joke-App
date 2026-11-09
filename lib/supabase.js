import { createClient } from "@supabase/supabase-js";

let client = null;

// Created on first use, so a missing variable fails inside the caller's try
// and cannot stop api/joke.js from returning the joke.
export function getSupabase() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
