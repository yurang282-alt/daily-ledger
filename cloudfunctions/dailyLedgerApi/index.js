const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { URL, URLSearchParams } = require("node:url");

const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_BODY_LENGTH = 2 * 1024 * 1024;
const PAGE_SIZE = 100;

const COLLECTIONS = {
  users: "daily_ledger_users",
  records: "daily_ledger_records",
  categories: "daily_ledger_categories",
  settings: "daily_ledger_settings",
};

const DEFAULT_CATEGORIES = {
  expense: ["餐饮", "交通", "购物", "住房", "娱乐", "医疗", "学习", "其他"],
  income: ["工资", "副业", "投资", "红包", "其他"],
};

const memoryStore = {
  users: [],
  records: [],
  categories: [],
  settings: [],
};

let cloudSdk = null;
let cloudInitDone = false;

function getCloud() {
  if (cloudSdk !== null) return cloudSdk;
  try {
    cloudSdk = require("wx-server-sdk");
  } catch {
    cloudSdk = false;
  }
  return cloudSdk;
}

function getDb() {
  const cloud = getCloud();
  if (!cloud) return null;
  if (!cloudInitDone) {
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
    cloudInitDone = true;
  }
  return cloud.database();
}

function applyCorsHeaders(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type, authorization, x-daily-ledger-session");
  res.setHeader("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  applyCorsHeaders(res);
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY_LENGTH) {
      throw new Error("请求太大，请先减少导入记录数量");
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function sanitizeText(value, maxLength = 120) {
  return `${value || ""}`.trim().slice(0, maxLength);
}

function normalizeAccountName(value) {
  return sanitizeText(value, 40);
}

function normalizeAccountKey(value) {
  return normalizeAccountName(value).toLowerCase();
}

function isValidAccountName(value) {
  const account = normalizeAccountName(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account) || /^[\p{L}\p{N}_-]{2,32}$/u.test(account);
}

function hash(value) {
  return crypto.createHash("sha256").update(`${value || ""}`).digest("hex");
}

function shortHash(value) {
  return hash(value).slice(0, 24);
}

function ownerIdForAccount(accountName) {
  return `ledger_${shortHash(normalizeAccountKey(accountName))}`;
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(`${a || ""}`);
  const right = Buffer.from(`${b || ""}`);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto.pbkdf2Sync(`${password || ""}`, salt, 120000, 32, "sha256").toString("hex");
  return { salt, passwordHash };
}

function verifyPassword(password, user) {
  if (!user?.passwordSalt || !user?.passwordHash) return false;
  const { passwordHash } = createPasswordHash(password, user.passwordSalt);
  return timingSafeEqualString(passwordHash, user.passwordHash);
}

function getSessionSecret() {
  const secret = process.env.DAILY_LEDGER_SESSION_SECRET || process.env.APP_SESSION_SECRET || "";
  if (secret) return secret;
  if (getDb()) {
    throw new Error("服务端未配置会话密钥");
  }
  return "daily-ledger-local-dev-session";
}

function assertSessionSecretReady(db) {
  if (db && !(process.env.DAILY_LEDGER_SESSION_SECRET || process.env.APP_SESSION_SECRET)) {
    throw new Error("服务端未配置会话密钥");
  }
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSession(payload) {
  const encoded = base64UrlEncode(JSON.stringify({ ...payload, exp: Date.now() + SESSION_TTL_MS }));
  const signature = crypto.createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySessionToken(token) {
  const [encoded, signature] = `${token || ""}`.split(".");
  if (!encoded || !signature) throw newAuthError("请先登录");
  const expected = crypto.createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url");
  if (!timingSafeEqualString(expected, signature)) throw newAuthError("登录已失效，请重新登录");
  const payload = JSON.parse(base64UrlDecode(encoded));
  if (!payload.ownerId || Number(payload.exp || 0) < Date.now()) {
    throw newAuthError("登录已过期，请重新登录");
  }
  return payload;
}

function getSessionFromRequest(req) {
  const headerToken = req.headers["x-daily-ledger-session"] || req.headers.authorization;
  const token = `${headerToken || ""}`.replace(/^Bearer\s+/i, "").trim();
  return verifySessionToken(token);
}

function newAuthError(message) {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function normalizeCategories(categories = {}) {
  return {
    expense: mergeLists(DEFAULT_CATEGORIES.expense, categories.expense || []),
    income: mergeLists(DEFAULT_CATEGORIES.income, categories.income || []),
  };
}

function normalizeRecord(record) {
  if (!record || !["income", "expense"].includes(record.type)) throw new Error("记录类型不正确");
  const amount = roundMoney(record.amount);
  const date = sanitizeText(record.date, 20);
  const category = sanitizeText(record.category, 40);
  if (amount <= 0) throw new Error("金额必须大于 0");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("日期格式不正确");
  if (!category) throw new Error("分类不能为空");
  return {
    id: sanitizeText(record.id, 80) || createId("record"),
    type: record.type,
    amount,
    category,
    date,
    note: sanitizeText(record.note, 120),
  };
}

function normalizeLedgerData(data = {}) {
  return {
    records: Array.isArray(data.records) ? data.records.map(normalizeRecord) : [],
    categories: normalizeCategories(data.categories || {}),
    budget: Math.max(0, roundMoney(data.budget || 0)),
  };
}

function mergeLists(first = [], second = []) {
  return [...new Set([...first, ...second].map((item) => sanitizeText(item, 40)).filter(Boolean))];
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function withoutCloudId(input) {
  const output = { ...input };
  delete output._id;
  return output;
}

function toClientRecord(doc) {
  return {
    id: doc.id,
    type: doc.type,
    amount: Number(doc.amount),
    category: doc.category,
    date: doc.date,
    note: doc.note || "",
  };
}

async function memoryFindOne(name, query) {
  return memoryStore[name].find((item) => matchesQuery(item, query)) || null;
}

async function memoryFindMany(name, query, sortField = "createdAt") {
  return memoryStore[name]
    .filter((item) => matchesQuery(item, query))
    .sort((a, b) => new Date(b[sortField] || 0) - new Date(a[sortField] || 0));
}

async function memoryUpsert(name, query, data) {
  const existing = await memoryFindOne(name, query);
  if (existing) {
    Object.assign(existing, data);
    return existing;
  }
  const doc = { ...data, _id: createId("doc") };
  memoryStore[name].push(doc);
  return doc;
}

async function memoryRemove(name, query) {
  const indexes = memoryStore[name].reduce((acc, item, index) => (matchesQuery(item, query) ? [...acc, index] : acc), []);
  indexes.reverse().forEach((index) => memoryStore[name].splice(index, 1));
}

function matchesQuery(item, query) {
  return Object.entries(query).every(([key, value]) => item[key] === value);
}

async function dbFindOne(db, collectionName, query) {
  if (!db) return memoryFindOne(collectionName, query);
  const result = await db.collection(COLLECTIONS[collectionName]).where(query).limit(1).get();
  return result.data && result.data[0] ? result.data[0] : null;
}

async function dbFindMany(db, collectionName, query, sortField = "createdAt") {
  if (!db) return memoryFindMany(collectionName, query, sortField);
  const collection = db.collection(COLLECTIONS[collectionName]);
  const rows = [];
  let skip = 0;
  let hasMore = true;
  while (hasMore) {
    const result = await collection.where(query).orderBy(sortField, "desc").skip(skip).limit(PAGE_SIZE).get();
    const page = Array.isArray(result.data) ? result.data : [];
    rows.push(...page);
    hasMore = page.length === PAGE_SIZE;
    skip += PAGE_SIZE;
  }
  return rows;
}

async function dbUpsert(db, collectionName, query, data) {
  const cleanData = withoutCloudId(data);
  if (!db) return memoryUpsert(collectionName, query, cleanData);
  const existing = await dbFindOne(db, collectionName, query);
  if (existing && existing._id) {
    await db.collection(COLLECTIONS[collectionName]).doc(existing._id).update({ data: cleanData });
    return { ...existing, ...cleanData };
  }
  const addResult = await db.collection(COLLECTIONS[collectionName]).add({ data: cleanData });
  return { ...cleanData, _id: addResult._id };
}

async function dbRemove(db, collectionName, query) {
  if (!db) return memoryRemove(collectionName, query);
  const rows = await dbFindMany(db, collectionName, query);
  await Promise.all(rows.filter((row) => row._id).map((row) => db.collection(COLLECTIONS[collectionName]).doc(row._id).remove()));
}

async function getUserByAccount(db, accountName) {
  return dbFindOne(db, "users", { accountKey: normalizeAccountKey(accountName) });
}

async function createUser(db, accountName, password) {
  if (!isValidAccountName(accountName)) throw new Error("账号名格式不正确");
  if (!password || `${password}`.length < 6) throw new Error("密码至少 6 位");
  const existing = await getUserByAccount(db, accountName);
  if (existing) throw new Error("这个账号已经注册过，请直接登录");
  const now = new Date().toISOString();
  const ownerId = ownerIdForAccount(accountName);
  const { salt, passwordHash } = createPasswordHash(password);
  const user = await dbUpsert(db, "users", { ownerId }, {
    ownerId,
    accountName: normalizeAccountName(accountName),
    accountKey: normalizeAccountKey(accountName),
    passwordSalt: salt,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  });
  return user;
}

async function loginUser(db, accountName, password) {
  const user = await getUserByAccount(db, accountName);
  if (!user || !verifyPassword(password, user)) throw newAuthError("账号名或密码不对");
  const now = new Date().toISOString();
  await dbUpsert(db, "users", { ownerId: user.ownerId }, {
    ...user,
    lastLoginAt: now,
    updatedAt: now,
  });
  return { ...user, lastLoginAt: now, updatedAt: now };
}

async function updatePassword(db, session, password) {
  if (!password || `${password}`.length < 6) throw new Error("密码至少 6 位");
  const user = await dbFindOne(db, "users", { ownerId: session.ownerId });
  if (!user) throw newAuthError("请先登录");
  const { salt, passwordHash } = createPasswordHash(password);
  await dbUpsert(db, "users", { ownerId: session.ownerId }, {
    ...user,
    passwordSalt: salt,
    passwordHash,
    updatedAt: new Date().toISOString(),
  });
}

function createSessionForUser(user) {
  const session = {
    ownerId: user.ownerId,
    accountName: user.accountName,
  };
  return {
    token: signSession(session),
    ownerId: user.ownerId,
    accountName: user.accountName,
  };
}

async function readLedger(db, ownerId) {
  const [records, categories, settings] = await Promise.all([
    dbFindMany(db, "records", { ownerId }, "date"),
    dbFindMany(db, "categories", { ownerId }, "createdAt"),
    dbFindOne(db, "settings", { ownerId }),
  ]);
  const categoryShape = categories.reduce(
    (result, row) => {
      if (["income", "expense"].includes(row.kind)) {
        result[row.kind] = mergeLists(result[row.kind], [row.name]);
      }
      return result;
    },
    { expense: [], income: [] },
  );

  return normalizeLedgerData({
    records: records.map(toClientRecord),
    categories: categoryShape,
    budget: Number(settings?.budget || 0),
  });
}

async function saveRecord(db, ownerId, input) {
  const record = normalizeRecord(input);
  const now = new Date().toISOString();
  const existing = await dbFindOne(db, "records", { ownerId, id: record.id });
  await dbUpsert(db, "records", { ownerId, id: record.id }, {
    ...record,
    ownerId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });
  await saveCategory(db, ownerId, record.type, record.category);
  return record;
}

async function saveAll(db, ownerId, input) {
  const ledger = normalizeLedgerData(input);
  await Promise.all(ledger.records.map((record) => saveRecord(db, ownerId, record)));
  await Promise.all(["expense", "income"].flatMap((kind) => ledger.categories[kind].map((name) => saveCategory(db, ownerId, kind, name))));
  await saveBudget(db, ownerId, ledger.budget);
  return readLedger(db, ownerId);
}

async function deleteRecord(db, ownerId, id) {
  await dbRemove(db, "records", { ownerId, id: sanitizeText(id, 80) });
}

async function clearMonth(db, ownerId, month) {
  const normalizedMonth = sanitizeText(month, 7);
  if (!/^\d{4}-\d{2}$/.test(normalizedMonth)) throw new Error("月份格式不正确");
  const rows = await dbFindMany(db, "records", { ownerId }, "date");
  await Promise.all(rows.filter((row) => `${row.date || ""}`.startsWith(normalizedMonth)).map((row) => dbRemove(db, "records", { ownerId, id: row.id })));
}

async function saveCategory(db, ownerId, kind, name) {
  if (!["income", "expense"].includes(kind)) throw new Error("分类类型不正确");
  const cleanName = sanitizeText(name, 40);
  if (!cleanName) throw new Error("分类不能为空");
  const now = new Date().toISOString();
  const existing = await dbFindOne(db, "categories", { ownerId, kind, name: cleanName });
  await dbUpsert(db, "categories", { ownerId, kind, name: cleanName }, {
    ownerId,
    kind,
    name: cleanName,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });
  return cleanName;
}

async function saveBudget(db, ownerId, budget) {
  const value = Math.max(0, roundMoney(budget || 0));
  const now = new Date().toISOString();
  const existing = await dbFindOne(db, "settings", { ownerId });
  await dbUpsert(db, "settings", { ownerId }, {
    ownerId,
    budget: value,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });
  return value;
}

function normalizePath(rawPath = "/") {
  const path = `/${String(rawPath || "/").replace(/^\/+/g, "")}`;
  return path
    .replace(/^\/apps\/ledger\/api(?=\/|$)/, "")
    .replace(/^\/daily-ledger-api(?=\/|$)/, "")
    .replace(/^\/api(?=\/|$)/, "") || "/";
}

async function routeRequest(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    applyCorsHeaders(res);
    res.end();
    return;
  }

  const db = getDb();
  const parsedUrl = new URL(req.url, "http://localhost");
  const path = normalizePath(parsedUrl.pathname);

  try {
    if (req.method === "GET" && path === "/health") {
      sendJson(res, 200, { ok: true, mode: db ? "cloudbase" : "local-memory" });
      return;
    }

    if (req.method === "POST" && path === "/register") {
      assertSessionSecretReady(db);
      const body = await readJsonBody(req);
      const user = await createUser(db, body.accountName, body.password);
      sendJson(res, 200, { ok: true, session: createSessionForUser(user) });
      return;
    }

    if (req.method === "POST" && path === "/login") {
      assertSessionSecretReady(db);
      const body = await readJsonBody(req);
      const user = await loginUser(db, body.accountName, body.password);
      sendJson(res, 200, { ok: true, session: createSessionForUser(user) });
      return;
    }

    const session = getSessionFromRequest(req);

    if (req.method === "GET" && path === "/me") {
      sendJson(res, 200, { ok: true, user: { accountName: session.accountName, ownerId: session.ownerId } });
      return;
    }

    if (req.method === "POST" && path === "/password") {
      const body = await readJsonBody(req);
      await updatePassword(db, session, body.password);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && path === "/ledger") {
      sendJson(res, 200, { ok: true, data: await readLedger(db, session.ownerId) });
      return;
    }

    if (req.method === "PUT" && path === "/ledger") {
      const body = await readJsonBody(req);
      sendJson(res, 200, { ok: true, data: await saveAll(db, session.ownerId, body.ledger || body.data || body) });
      return;
    }

    if (req.method === "POST" && path === "/records") {
      const body = await readJsonBody(req);
      sendJson(res, 200, { ok: true, data: await saveRecord(db, session.ownerId, body.record || body) });
      return;
    }

    if (req.method === "DELETE" && path === "/records") {
      await clearMonth(db, session.ownerId, parsedUrl.searchParams.get("month") || "");
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "DELETE" && path.startsWith("/records/")) {
      await deleteRecord(db, session.ownerId, decodeURIComponent(path.replace(/^\/records\//, "")));
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && path === "/categories") {
      const body = await readJsonBody(req);
      sendJson(res, 200, { ok: true, data: await saveCategory(db, session.ownerId, body.kind || body.type, body.name) });
      return;
    }

    if (req.method === "PUT" && path === "/settings/budget") {
      const body = await readJsonBody(req);
      sendJson(res, 200, { ok: true, data: await saveBudget(db, session.ownerId, body.budget) });
      return;
    }

    sendJson(res, 404, { ok: false, error: "not_found" });
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      ok: false,
      error: error.message || "请求失败",
    });
  }
}

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [String(key).toLowerCase(), value]));
}

function queryStringFromEvent(event = {}) {
  if (event.rawQueryString) return String(event.rawQueryString);
  if (event.queryString) return String(event.queryString).replace(/^\?/g, "");
  if (event.queryStringParameters && typeof event.queryStringParameters === "object") {
    const params = new URLSearchParams();
    Object.entries(event.queryStringParameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.append(key, String(value));
    });
    return params.toString();
  }
  return "";
}

function requestFromEvent(event = {}) {
  const headers = normalizeHeaders(event.headers || event.headerParameters);
  const method = event.httpMethod || event.requestContext?.httpMethod || event.method || "GET";
  const rawPath = event.path || event.Path || event.requestContext?.path || event.requestContext?.http?.path || "/";
  const query = queryStringFromEvent(event);
  const body = event.isBase64Encoded
    ? Buffer.from(String(event.body || ""), "base64")
    : Buffer.from(typeof event.body === "string" ? event.body : event.body ? JSON.stringify(event.body) : "");
  const req = Readable.from(body.length ? [body] : []);
  req.method = String(method).toUpperCase();
  req.url = `${rawPath}${query ? `?${query}` : ""}`;
  req.headers = headers;
  return req;
}

function responseForHandler() {
  const chunks = [];
  const headers = {};
  let done;
  const finished = new Promise((resolve) => {
    done = resolve;
  });

  const res = {
    statusCode: 200,
    setHeader(key, value) {
      headers[String(key).toLowerCase()] = value;
    },
    getHeader(key) {
      return headers[String(key).toLowerCase()];
    },
    writeHead(statusCode, nextHeaders = {}) {
      this.statusCode = statusCode;
      Object.entries(nextHeaders).forEach(([key, value]) => this.setHeader(key, value));
    },
    write(chunk) {
      if (chunk !== undefined) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    },
    end(chunk) {
      if (chunk !== undefined) this.write(chunk);
      done({
        statusCode: this.statusCode,
        headers,
        body: Buffer.concat(chunks).toString("utf8"),
        isBase64Encoded: false,
      });
    },
  };

  return { res, finished };
}

async function main(event = {}) {
  const req = requestFromEvent(event);
  const { res, finished } = responseForHandler();
  await routeRequest(req, res);
  return finished;
}

module.exports = {
  handleHttpRequest: routeRequest,
  main,
};
