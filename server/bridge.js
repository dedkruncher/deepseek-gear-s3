// Temporary local bridge for development. Run on the Android phone with Node.js.
const http = require("node:http");

const API_KEY = process.env.DEEPSEEK_API_KEY;
const PORT = Number(process.env.PORT || 8787);

if (!API_KEY) {
  console.error("Set DEEPSEEK_API_KEY before starting the bridge.");
  process.exit(1);
}

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
    return res.end(JSON.stringify({ ok: true }));
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

      const upstream = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: message }],
          stream: false
        })
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        console.error("DeepSeek API error:", upstream.status, data);
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "DeepSeek API request failed (" + upstream.status + ")." }));
      }

      const reply = data && data.choices && data.choices[0] &&
        data.choices[0].message && data.choices[0].message.content;
      if (typeof reply !== "string") throw new Error("Unexpected DeepSeek response");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ reply }));
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Bridge error." }));
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("DeepSeek bridge listening on port " + PORT);
  console.log("Keep this phone and the watch on the same trusted Wi-Fi network.");
});