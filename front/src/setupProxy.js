// Custom dev-server proxy for the CareerAI backend.
// The default package.json `proxy` string silently strips the Set-Cookie
// response header when the app is reached through a tunneled/non-localhost
// Host (e.g. the Hoplite preview), which breaks login persistence there.
// This setup preserves cookies and forwards every backend route explicitly.
const { createProxyMiddleware } = require("http-proxy-middleware");

const TARGET = process.env.REACT_APP_API_URL || "http://localhost:8000";

const proxy = createProxyMiddleware({
  target: TARGET,
  changeOrigin: true, // rewrite Host to the backend so it can set cookies
  logLevel: "warn",
});

// Match every backend route the frontend calls: /api/* plus legacy mounts and
// /uploads/* (served resume files).
const PATH_PREFIXES = [
  "/api",
  "/uploads",
  "/user",
  "/resume",
  "/jobs",
  "/roadmap",
  "/test",
  "/chat",
  "/recommendations",
  "/debug",
];

module.exports = function setupProxy(app) {
  const matcher = (req) =>
    PATH_PREFIXES.some((p) => req.path === p || req.path.startsWith(p + "/"));

  app.use((req, res, next) => {
    if (matcher(req)) {
      return proxy(req, res, next);
    }
    return next();
  });
};
