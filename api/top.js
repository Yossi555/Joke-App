import { getSupabase } from "../lib/supabase.js";

const TOP_SIZE = 5;
const TIMEOUT_MS = 5000;

const MESSAGES = {
  notGet: "אפשר לשלוח רק בקשת GET.",
  general: "לא הצלחנו לטעון את הרשימה.",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: MESSAGES.notGet }, 405);
    }

    try {
      const { data, error } = await getSupabase()
        .from("jokes")
        .select("id, topic, text, laughs")
        .gte("laughs", 1)
        .order("laughs", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(TOP_SIZE)
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) throw error;
      return json({ top: data });
    } catch (err) {
      console.error(`top error: code=${err?.code ?? "-"} message=${err?.message ?? "unknown"}`);
      return json({ error: MESSAGES.general }, 500);
    }
  },
};
