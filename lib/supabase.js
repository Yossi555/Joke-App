import { createClient } from "@supabase/supabase-js";

const AUTH_TIMEOUT_MS = 5000;
const MAX_NAME = 30;

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

function readToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export function hasToken(request) {
  return readToken(request) !== null;
}

// The user behind the token, or null when Supabase does not accept it.
// Throws when Supabase cannot answer (network, timeout, 5xx, missing config),
// so the caller can tell "bad token" apart from "Supabase is down".
export async function getUserFromRequest(request, supabase) {
  const token = readToken(request);
  if (!token) return null;

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("auth timeout")), AUTH_TIMEOUT_MS);
  });
  try {
    const { data, error } = await Promise.race([supabase.auth.getUser(token), timeout]);
    if (error) {
      const status = Number(error.status);
      if (status >= 400 && status < 500) return null;
      throw error;
    }
    return data?.user ?? null;
  } finally {
    clearTimeout(timer);
  }
}

// user_metadata.full_name, trimmed and cut to 30 characters. Empty: null.
export function displayName(user) {
  const raw = user?.user_metadata?.full_name;
  if (typeof raw !== "string") return null;
  const name = Array.from(raw.trim()).slice(0, MAX_NAME).join("").trim();
  return name || null;
}
