const MAX_TOPIC = 100;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר לשלוח רק בקשת POST." }, 405);
    }

    let topic = "";
    try {
      const body = await request.json();
      if (typeof body?.topic === "string") {
        topic = body.topic.trim().slice(0, MAX_TOPIC);
      }
    } catch {
      topic = "";
    }

    const keyFound = Boolean(process.env.OPENAI_API_KEY);
    console.log(`joke request: topic="${topic}" key=${keyFound ? "found" : "missing"}`);

    return json({
      joke: `בדיחה זמנית מהשרת: ${topic}. המפתח: ${keyFound ? "נמצא" : "חסר"}`,
    });
  },
};
