import { authRequired, json } from "../lib/http.js";
import { getSupabase, getUserFromRequest, hasToken } from "../lib/supabase.js";

const TIMEOUT_MS = 5000;

const MESSAGES = {
  notPost: "אפשר לשלוח רק בקשת POST.",
  unavailable: "החשבון לא זמין כרגע. נסו שוב בעוד רגע.",
  general: "לא הצלחנו למחוק את החשבון. נסו שוב.",
};

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: MESSAGES.notPost }, 405);
    }
    if (!hasToken(request)) return authRequired("צריך להתחבר כדי למחוק את החשבון.");

    let supabase;
    let user;
    try {
      supabase = getSupabase();
      user = await getUserFromRequest(request, supabase);
    } catch (err) {
      console.error(`delete-account error: auth unavailable (${err?.message ?? "unknown"})`);
      return json({ error: MESSAGES.unavailable }, 503);
    }
    if (!user) return authRequired();

    // First remove the name from the user's jokes. If that fails, the user is kept,
    // so no joke is left showing the name of an account that no longer exists.
    try {
      const { error } = await supabase
        .from("jokes")
        .update({ author_name: null })
        .eq("user_id", user.id)
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) throw error;
    } catch (err) {
      console.error(`delete-account error: clear names code=${err?.code ?? "-"} message=${err?.message ?? "unknown"}`);
      return json({ error: MESSAGES.general }, 500);
    }

    // jokes.user_id is cleared by "on delete set null".
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;
    } catch (err) {
      console.error(`delete-account error: delete user status=${err?.status ?? "-"} message=${err?.message ?? "unknown"}`);
      return json({ error: MESSAGES.general }, 500);
    }

    console.log(`account deleted: ${user.id}`);
    return json({ deleted: true });
  },
};
