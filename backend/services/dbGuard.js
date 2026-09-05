// Distinguishes "database temporarily unreachable" from real auth failures.
// Used by check-login / auth middleware: a Mongo blip (restart, network) must
// never be reported to the client as "logged out" — the frontend treats a 503
// here as transient and keeps the cached session.
function isDbConnectionError(err) {
  if (!err || !err.message) return false;
  const msg = `${err.name || ""} ${err.message}`;
  return /buffering timed out|MongoNetworkError|MongoServerSelectionError|ECONNREFUSED|MongooseError|Topology was destroyed|pool destroyed|before initial connection/i.test(
    msg
  );
}

module.exports = { isDbConnectionError };
