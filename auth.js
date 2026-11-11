// All sign-in in the browser. The Supabase library is used here only for auth
// (/auth/v1): it never reads or writes a table. The project URL and the
// publishable key come from /api/config, never from the page source.
(function () {
  const MAX_NAME = 30;
  const MIN_PASSWORD = 6;

  const MESSAGES = {
    unavailable: "הכניסה לא זמינה כרגע. נסו שוב בעוד רגע.",
    noName: "איך לקרוא לך? כתבו שם.",
    longName: "השם יכול להיות עד 30 תווים.",
    noEmail: "כתבו כתובת מייל.",
    badEmail: "כתובת המייל לא נראית תקינה.",
    noPassword: "כתבו סיסמה.",
    shortPassword: "הסיסמה צריכה 6 תווים לפחות.",
    wrongPassword: "המייל או הסיסמה לא נכונים.",
    emailTaken: "המייל הזה כבר רשום. נסו להתחבר.",
    signupDisabled: "ההרשמה סגורה כרגע.",
    confirmEmail: "ההרשמה הצליחה, אבל צריך לאשר את המייל לפני הכניסה.",
    tooMany: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.",
    network: "אין חיבור. בדקו את האינטרנט ונסו שוב.",
    general: "משהו השתבש בכניסה. נסו שוב.",
  };

  let client = null;
  let initPromise = null;
  let current = null;
  const listeners = new Set();

  async function init() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("supabase library not loaded");
    }
    const res = await fetch("/api/config", { cache: "no-store" });
    const config = await res.json();
    if (!res.ok || typeof config.url !== "string" || typeof config.publishableKey !== "string") {
      throw new Error(`config ${res.status} ${config?.code ?? ""}`);
    }

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    const { data } = await client.auth.getSession();
    current = data.session ?? null;

    client.auth.onAuthStateChange((event, session) => {
      current = session ?? null;
      // Leave the library's callback first: listeners may call back into Auth.
      setTimeout(() => listeners.forEach((fn) => fn(current, event)), 0);
    });
  }

  // Loads the config once. After a failure the next call tries again.
  function ready() {
    if (!initPromise) {
      initPromise = init().catch((err) => {
        initPromise = null;
        client = null;
        throw err;
      });
    }
    return initPromise;
  }

  function isReady() {
    return client !== null;
  }

  function messageFor(error) {
    const code = error?.code;
    const status = Number(error?.status);
    if (code === "invalid_credentials") return MESSAGES.wrongPassword;
    if (code === "user_already_exists" || code === "email_exists") return MESSAGES.emailTaken;
    if (code === "weak_password") return MESSAGES.shortPassword;
    if (code === "email_address_invalid" || code === "validation_failed") return MESSAGES.badEmail;
    if (code === "signup_disabled") return MESSAGES.signupDisabled;
    if (code === "email_not_confirmed") return MESSAGES.confirmEmail;
    if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429) {
      return MESSAGES.tooMany;
    }
    if (error?.name === "AuthRetryableFetchError" || status === 0) return MESSAGES.network;
    return MESSAGES.general;
  }

  function cleanName(name) {
    return Array.from(String(name ?? "").trim());
  }

  function checkEmail(email) {
    if (!email) return MESSAGES.noEmail;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return MESSAGES.badEmail;
    return null;
  }

  function checkPassword(password) {
    if (!password) return MESSAGES.noPassword;
    if (password.length < MIN_PASSWORD) return MESSAGES.shortPassword;
    return null;
  }

  async function connected() {
    try {
      await ready();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // Every action returns { ok: true } or { error: "Hebrew message" }.
  async function signUp(name, email, password) {
    const letters = cleanName(name);
    email = String(email ?? "").trim();
    if (letters.length === 0) return { error: MESSAGES.noName };
    if (letters.length > MAX_NAME) return { error: MESSAGES.longName };
    const problem = checkEmail(email) || checkPassword(password);
    if (problem) return { error: problem };
    if (!(await connected())) return { error: MESSAGES.unavailable };

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: letters.join("") } },
      });
      if (error) return { error: messageFor(error) };
      if (!data.session) return { error: MESSAGES.confirmEmail };
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { error: messageFor(err) };
    }
  }

  async function signIn(email, password) {
    email = String(email ?? "").trim();
    const problem = checkEmail(email) || (password ? null : MESSAGES.noPassword);
    if (problem) return { error: problem };
    if (!(await connected())) return { error: MESSAGES.unavailable };

    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      // An older Auth server may answer a wrong password with a bare 400 and no code.
      if (error && !error.code && Number(error.status) === 400) return { error: MESSAGES.wrongPassword };
      if (error) return { error: messageFor(error) };
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { error: messageFor(err) };
    }
  }

  // Local scope: only this browser is signed out. The session is cleared even offline.
  async function signOut() {
    if (!client) return { ok: true };
    try {
      await client.auth.signOut({ scope: "local" });
    } catch (err) {
      console.error(err);
    }
    current = null;
    return { ok: true };
  }

  function session() {
    return current;
  }

  // A fresh access token, refreshed by the library when needed. Guest: null.
  async function token() {
    if (initPromise) {
      try {
        await initPromise;
      } catch {
        return null;
      }
    }
    if (!client) return null;
    try {
      const { data } = await client.auth.getSession();
      return data.session?.access_token ?? null;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  function onChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  window.Auth = Object.freeze({
    ready,
    isReady,
    signUp,
    signIn,
    signOut,
    session,
    token,
    onChange,
    MAX_NAME,
    MIN_PASSWORD,
  });
})();
