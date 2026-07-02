const http = require("node:http");
const { handleHttpRequest } = require("./index");

const port = Number(process.env.PORT || 9000);
const host = "0.0.0.0";

const server = http.createServer(async (req, res) => {
  try {
    await handleHttpRequest(req, res);
  } catch (error) {
    res.writeHead(500, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify({ ok: false, error: error.message || "server_error" }));
  }
});

server.listen(port, host, () => {
  console.log(`daily-ledger-api listening on ${host}:${port}`);
});
