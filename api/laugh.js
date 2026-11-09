import { getSupabase } from "../lib/supabase.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMEOUT_MS = 5000;

const MESSAGES = {
  notPost: "אפשר לשלוח רק בקשת POST.",
  badId: "הבדיחה לא זוהתה.",
  notFound: "הבדיחה לא נמצאה.",
  general: "לא הצלחנו לספור את הצחוק. נסו שוב.",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: MESSAGES.notPost }, 405);
    }

    let id = null;
    try {
      id = (await request.json())?.id;
    } catch {
      id = null;
    }
    if (typeof id !== "string" || !UUID.test(id)) {
      return json({ error: MESSAGES.badId }, 400);
    }

    try {
      const { data, error } = await getSupabase()
        .rpc("add_laugh", { joke_id: id })
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) throw error;
      if (data === null) return json({ error: MESSAGES.notFound }, 404);
      return json({ laughs: data });
    } catch (err) {
      console.error(`laugh error: code=${err?.code ?? "-"} message=${err?.message ?? "unknown"}`);
      return json({ error: MESSAGES.general }, 500);
    }
  },
};
