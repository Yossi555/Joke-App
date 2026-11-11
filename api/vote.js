import { authRequired, json, readJson } from "../lib/http.js";
import { getSupabase, getUserFromRequest, hasToken } from "../lib/supabase.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALUES = new Set([1, -1, 0]);
const TIMEOUT_MS = 5000;

const MESSAGES = {
  notPost: "אפשר לשלוח רק בקשת POST.",
  needAccount: "כדי לדרג בדיחות צריך חשבון.",
  badId: "הבדיחה לא זוהתה.",
  badValue: "הדירוג לא תקין.",
  notFound: "הבדיחה לא נמצאה.",
  unavailable: "הדירוג לא זמין כרגע. נסו שוב בעוד רגע.",
  general: "לא הצלחנו לשמור את הדירוג. נסו שוב.",
};

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: MESSAGES.notPost }, 405);
    }
    if (!hasToken(request)) return authRequired(MESSAGES.needAccount);

    let supabase;
    let user;
    try {
      supabase = getSupabase();
      user = await getUserFromRequest(request, supabase);
    } catch (err) {
      console.error(`vote error: auth unavailable (${err?.message ?? "unknown"})`);
      return json({ error: MESSAGES.unavailable }, 503);
    }
    if (!user) return authRequired();

    // Only id and value are read. Anything else in the body, like user_id, is ignored.
    const body = await readJson(request);
    const id = body?.id;
    const value = body?.value;
    if (typeof id !== "string" || !UUID.test(id)) {
      return json({ error: MESSAGES.badId }, 400);
    }
    if (typeof value !== "number" || !VALUES.has(value)) {
      return json({ error: MESSAGES.badValue }, 400);
    }

    try {
      const { data, error } = await supabase
        .rpc("cast_vote", { voter: user.id, target: id, new_value: value })
        .single()
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) throw error;
      return json({
        likes: Number(data.likes) || 0,
        dislikes: Number(data.dislikes) || 0,
        my_vote: Number(data.my_vote) || 0,
      });
    } catch (err) {
      if (err?.code === "P0002") return json({ error: MESSAGES.notFound }, 404);
      if (err?.code === "22023") return json({ error: MESSAGES.badValue }, 400);
      console.error(`vote error: code=${err?.code ?? "-"} message=${err?.message ?? "unknown"}`);
      return json({ error: MESSAGES.general }, 500);
    }
  },
};
