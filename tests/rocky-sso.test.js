"use strict";

const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const test = require("node:test");

const { handleHttpRequest } = require("../cloudfunctions/dailyLedgerApi/index.js");

function identityResponse(rockyUserId, status = 200) {
  const values = new Map([
    ["x-rocky-user-id", rockyUserId],
    ["x-rocky-app-id", "money"],
    ["x-rocky-scopes", "session:read"],
  ]);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => values.get(String(name).toLowerCase()) || null },
  };
}

function invoke(method, url, options = {}) {
  const body = options.body === undefined ? "" : JSON.stringify(options.body);
  const req = Readable.from(body ? [body] : []);
  req.method = method;
  req.url = url;
  req.headers = { cookie: "__Host-rocky_session=synthetic", ...(options.headers || {}) };

  return new Promise((resolve) => {
    const headers = {};
    const chunks = [];
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
      end(chunk) {
        if (chunk) chunks.push(Buffer.from(String(chunk)));
        resolve({ status: this.statusCode, headers, body: JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") });
      },
    };
    handleHttpRequest(req, res);
  });
}

test("central rockyUserId is the only ledger owner and A/B remain isolated", async (t) => {
  const originalFetch = global.fetch;
  let currentUser = "ru_synthetic_a_12345678";
  global.fetch = async () => identityResponse(currentUser);
  t.after(() => { global.fetch = originalFetch; });

  const writeA = await invoke("POST", "/records", {
    headers: { origin: "https://rocky4ai.com" },
    body: { id: "same-record", type: "expense", amount: 12, category: "餐饮", date: "2026-07-22", note: "A" },
  });
  assert.equal(writeA.status, 200);
  const readA = await invoke("GET", "/ledger");
  assert.equal(readA.body.data.records.length, 1);
  assert.equal(readA.body.data.records[0].note, "A");

  currentUser = "ru_synthetic_b_12345678";
  const readB = await invoke("GET", "/ledger");
  assert.equal(readB.body.data.records.length, 0);
  const writeB = await invoke("POST", "/records", {
    headers: { origin: "https://rocky4ai.com" },
    body: { id: "same-record", type: "expense", amount: 34, category: "交通", date: "2026-07-22", note: "B" },
  });
  assert.equal(writeB.status, 200);

  currentUser = "ru_synthetic_a_12345678";
  const rereadA = await invoke("GET", "/ledger");
  assert.equal(rereadA.body.data.records.length, 1);
  assert.equal(rereadA.body.data.records[0].note, "A");
});

test("missing central cookie and foreign writes fail closed", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => identityResponse("ru_synthetic_a_12345678");
  t.after(() => { global.fetch = originalFetch; });

  const noCookie = await invoke("GET", "/ledger", { headers: { cookie: "", "x-daily-ledger-session": "legacy" } });
  assert.equal(noCookie.status, 401);

  const foreignWrite = await invoke("POST", "/records", {
    headers: { origin: "https://evil.example" },
    body: { id: "blocked", type: "expense", amount: 1, category: "其他", date: "2026-07-22" },
  });
  assert.equal(foreignWrite.status, 403);
});
