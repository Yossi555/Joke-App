// Small helpers shared by the functions in api/.

const DEFAULT_MAX_BYTES = 4096;

// Every answer depends on who is asking, so nothing may be cached.
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function authRequired(message = "צריך להתחבר שוב.") {
  return json({ error: message, code: "auth_required" }, 401);
}

// Returns the parsed body, or null when it is missing, too large or not JSON.
export async function readJson(request, maxBytes = DEFAULT_MAX_BYTES) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
