// Local AI bridge for Samsung Gear S3 via an Android phone.
// Run on the phone with Node.js. Kilo's tested free model needs no API key.
const http = require("node:http");

const PORT = Number(process.env.PORT || 8787);
const API_URL = "https://ai-gateway.kilo.ai/api/v1/chat/completions";
const MODEL = process.env.KILO_MODEL || "baidu/ernie-5.5-flash-preview:free";

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, provider: "Kilo", model: MODEL }));
  }

  if (req.method !== "POST" || req.url !== "/chat") {
    res.writeHead(404);
    return res.end("Not found");
  }

  let raw = "";
  req.on("data", chunk => {
    raw += chunk;
    if (raw.length > 20000) req.destroy();
  });

  req.on("end", async () => {
    try {
      const body = JSON.parse(raw || "{}");
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message || message.length > 4000) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Message must contain 1–4000 characters." }));
      }

      const upstream = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: message }],
          max_tokens: 500,
          stream: false
        }),
        signal: AbortSignal.timeout(60000)
      });

      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const upstreamMessage = data?.error?.message || data?.error || "Unknown upstream error";
        console.error("Kilo API error:", upstream.status, upstreamMessage);
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          error: "AI provider request failed (" + upstream.status + ").",
          detail: String(upstreamMessage).slice(0, 300)
        }));
      }

      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== "string") throw new Error("Unexpected Kilo response");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ reply }));
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        const status = error.name === "TimeoutError" ? 504 : 500;
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: status === 504 ? "AI request timed out." : "Bridge error." }));
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Kilo AI bridge listening on port " + PORT);
  console.log("Model: " + MODEL);
  console.log("Keep this phone and the watch on the same trusted Wi-Fi network.");
});
