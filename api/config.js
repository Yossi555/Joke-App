import { json } from "../lib/http.js";

const MESSAGES = {
  notGet: "אפשר לשלוח רק בקשת GET.",
  notConfigured: "הכניסה עוד לא מוגדרת בשרת.",
};

// Only a publishable key, or a legacy JWT whose role is anon, may reach the browser.
function isPublicKey(key) {
  if (key.startsWith("sb_publishable_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload?.role === "anon";
  } catch {
    return false;
  }
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: MESSAGES.notGet }, 405);
    }

    const url = process.env.SUPABASE_URL?.trim();
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!url || !publishableKey || !isPublicKey(publishableKey)) {
      // Never log the value itself: it might be a secret key put in the wrong variable.
      console.error(
        `config error: url=${url ? "set" : "missing"} key=${!publishableKey ? "missing" : "not a publishable key"}`
      );
      return json({ error: MESSAGES.notConfigured, code: "auth_not_configured" }, 500);
    }

    return json({ url, publishableKey });
  },
};
