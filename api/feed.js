import { authRequired, json } from "../lib/http.js";
import { getSupabase, getUserFromRequest, hasToken } from "../lib/supabase.js";

const ROWS = { new: 20, top: 10, liked: 50 };
const TIMEOUT_MS = 5000;

const MESSAGES = {
  notGet: "אפשר לשלוח רק בקשת GET.",
  badMode: "הרשימה לא מוכרת.",
  needAccount: "כדי לראות את מה שאהבתם צריך חשבון.",
  unavailable: "הרשימה לא זמינה כרגע. נסו שוב בעוד רגע.",
  general: "לא הצלחנו לטעון את הרשימה.",
};

// Only these fields leave the server. user_id is never one of them.
function publicJoke(row) {
  return {
    id: row.id,
    topic: row.topic ?? null,
    text: row.text,
    author_name: row.author_name ?? null,
    likes: Number(row.likes) || 0,
    dislikes: Number(row.dislikes) || 0,
    my_vote: Number(row.my_vote) || 0,
    created_at: row.created_at ?? null,
  };
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: MESSAGES.notGet }, 405);
    }

    const mode = new URL(request.url, "http://localhost").searchParams.get("mode");
    if (!Object.hasOwn(ROWS, mode ?? "")) {
      return json({ error: MESSAGES.badMode }, 400);
    }
    if (mode === "liked" && !hasToken(request)) return authRequired(MESSAGES.needAccount);

    let supabase;
    let user = null;
    try {
      supabase = getSupabase();
      if (hasToken(request)) {
        user = await getUserFromRequest(request, supabase);
        // A token Supabase does not know: tell the page, so it signs out.
        if (!user) return authRequired();
      }
    } catch (err) {
      console.error(`feed error: auth unavailable (${err?.message ?? "unknown"})`);
      return json({ error: MESSAGES.unavailable }, 503);
    }

    try {
      const { data, error } = await supabase
        .rpc("joke_feed", { viewer: user?.id ?? null, mode, max_rows: ROWS[mode] })
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) throw error;
      return json({ jokes: (Array.isArray(data) ? data : []).map(publicJoke) });
    } catch (err) {
      console.error(`feed error: mode=${mode} code=${err?.code ?? "-"} message=${err?.message ?? "unknown"}`);
      return json({ error: MESSAGES.general }, 500);
    }
  },
};
