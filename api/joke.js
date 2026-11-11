import { authRequired, json, readJson } from "../lib/http.js";
import { displayName, getSupabase, getUserFromRequest, hasToken } from "../lib/supabase.js";

const MAX_TOPIC = 100;
const SAVE_TIMEOUT_MS = 5000;
const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5";
const TIMEOUT_MS = 30000;

const INSTRUCTIONS =
  "אתה כותב בדיחות קצרות בעברית. כתוב בדיחה אחת בלבד, עד ארבעה משפטים, נקייה ומתאימה לכל גיל. בלי הקדמה, בלי הסבר ובלי אימוג׳י. רק הבדיחה.";

const SPEND_LIMIT_CODES = new Set([
  "organization_spend_limit_exceeded",
  "project_spend_limit_exceeded",
  "organization_usage_limit_exceeded",
]);

const MESSAGES = {
  notPost: "אפשר לשלוח רק בקשת POST.",
  noKey: "השרת לא מוגדר עדיין. נסו מאוחר יותר.",
  badKey: "יש בעיה במפתח של השרת.",
  noCredit: "נגמר הקרדיט ב-OpenAI.",
  spendLimit: "הגענו למגבלת ההוצאה החודשית.",
  rateLimit: "יותר מדי בקשות. נסו שוב בעוד רגע.",
  noModel: "המודל שהוגדר לא נמצא.",
  timeout: "הבדיחה מתעכבת. נסו שוב.",
  general: "לא הצלחנו להביא בדיחה. נסו שוב.",
};

function messageFor(status, error) {
  const code = error?.code;
  if (status === 401) return MESSAGES.badKey;
  if (status === 404 || code === "model_not_found") return MESSAGES.noModel;
  if (status === 429) {
    // Spend-limit errors can also carry type "insufficient_quota", so check their codes first.
    if (SPEND_LIMIT_CODES.has(code)) return MESSAGES.spendLimit;
    if (code === "credit_balance_exhausted" || code === "insufficient_quota" || error?.type === "insufficient_quota") {
      return MESSAGES.noCredit;
    }
    return MESSAGES.rateLimit;
  }
  return MESSAGES.general;
}

function extractText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
    }
  }
  return parts.join("").trim();
}

// A failed save must never cost the user the joke, so this always resolves.
async function saveJoke(topic, text, user, authorName) {
  try {
    const { data, error } = await getSupabase()
      .from("jokes")
      .insert({
        topic: topic || null,
        text,
        user_id: user?.id ?? null,
        author_name: user ? authorName : null,
      })
      .select("id")
      .single()
      .abortSignal(AbortSignal.timeout(SAVE_TIMEOUT_MS));
    if (error) throw error;
    return data.id;
  } catch (err) {
    console.error(`joke save error: code=${err?.code ?? "-"} message=${err?.message ?? "unknown"}`);
    return null;
  }
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: MESSAGES.notPost }, 405);
    }

    const body = await readJson(request);
    const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, MAX_TOPIC) : "";

    // Who is asking is settled before OpenAI is called, so a bad token costs nothing.
    let user = null;
    let canSave = true;
    if (hasToken(request)) {
      try {
        user = await getUserFromRequest(request, getSupabase());
      } catch (err) {
        // Supabase is down: the joke still comes, without saving.
        console.error(`joke auth error: ${err?.message ?? "unknown"}`);
        canSave = false;
      }
      if (canSave && !user) return authRequired();
    }
    const authorName = user ? displayName(user) : null;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("joke error: missing OPENAI_API_KEY");
      return json({ error: MESSAGES.noKey }, 500);
    }

    const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
    console.log(`joke request: topic="${topic}" model=${model} user=${user ? "yes" : "guest"}`);

    let res;
    try {
      res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          instructions: INSTRUCTIONS,
          input: topic ? `נושא הבדיחה: ${topic}` : "אין נושא. ספר בדיחה כללית על החיים.",
          reasoning: { effort: "low" },
          max_output_tokens: 2000,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const timedOut = err?.name === "TimeoutError";
      console.error(`joke error: fetch failed (${timedOut ? "timeout" : err?.name || "unknown"})`);
      return json({ error: timedOut ? MESSAGES.timeout : MESSAGES.general }, 502);
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      // Never log error.message: on 401 it quotes part of the key.
      const error = data?.error;
      console.error(
        `joke error: openai status=${res.status} type=${error?.type ?? "-"} code=${error?.code ?? "-"} param=${error?.param ?? "-"}`
      );
      return json({ error: messageFor(res.status, error) }, 502);
    }

    const joke = extractText(data);
    if (!joke) {
      console.error(
        `joke error: no text status=${data?.status ?? "-"} reason=${data?.incomplete_details?.reason ?? "-"}`
      );
      return json({ error: MESSAGES.general }, 502);
    }

    const id = canSave ? await saveJoke(topic, joke, user, authorName) : null;
    return json({ joke, id, author_name: authorName });
  },
};
