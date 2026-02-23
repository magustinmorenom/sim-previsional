#!/usr/bin/env node

const path = require("node:path");
const jsonServer = require("json-server");
const { simulatePrestamo } = require("./amortization");

const DEFAULT_PORT = 4010;

const server = jsonServer.create();
const middlewares = jsonServer.defaults({
  logger: true,
  readOnly: false
});

const dbPath = path.join(__dirname, "db.json");
const router = jsonServer.router(dbPath);
const API_BASE = "/api/v1/public/prestamos";

function getPort() {
  const raw = process.env.PRESTAMOS_MOCK_PORT;
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return Math.floor(parsed);
}

function isApiKeyAuthorized(req) {
  const configuredApiKey = process.env.PRESTAMOS_MOCK_API_KEY;
  if (!configuredApiKey) {
    return true;
  }

  const headerValue = req.get("x-api-key") || "";
  return headerValue.trim() === configuredApiKey.trim();
}

function apiKeyGuard(req, res, next) {
  if (!isApiKeyAuthorized(req)) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "API Key ausente o inválida"
      }
    });
    return;
  }

  next();
}

function resolveLineasPayload() {
  const dbState = router.db.getState();
  return Array.isArray(dbState.lineas) ? dbState.lineas : [];
}

function mountSimulation(pathname) {
  server.post(pathname, apiKeyGuard, (req, res) => {
    const lineas = resolveLineasPayload();
    const result = simulatePrestamo(lineas, req.body || {});
    res.status(result.status).json(result.body);
  });
}

server.use(middlewares);
server.use(jsonServer.bodyParser);

server.use(apiKeyGuard);

server.use(
  jsonServer.rewriter({
    [`${API_BASE}/lineas`]: "/lineas"
  })
);

mountSimulation("/simulate");
mountSimulation(`${API_BASE}/simulate`);
mountSimulation("/simular");
mountSimulation(`${API_BASE}/simular`);

server.use(router);

const port = getPort();
server.listen(port, () => {
  console.log(`[prestamos-mock] JSON server escuchando en http://127.0.0.1:${port}${API_BASE}`);
});
