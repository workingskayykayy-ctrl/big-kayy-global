
const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "GET" && req.url === "/api/health") {
    res.writeHead(200);

    res.end(JSON.stringify({
      success: true,
      message: "BKG backend is running!",
      business: "BIG KAYY GLOBAL",
      status: "online"
    }));

    return;
  }

  res.writeHead(404);

  res.end(JSON.stringify({
    success: false,
    message: "Endpoint not found"
  }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`BKG backend is running on port ${PORT}`);
});
