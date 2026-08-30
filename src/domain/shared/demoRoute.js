const DETAIL_ROUTE_BASES = Object.freeze([
  "/medications",
  "/account/orders",
  "/checkout/confirmation",
]);

function routeCandidate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "/";
  const hashIndex = raw.indexOf("#");
  if (hashIndex < 0) return raw;
  const fragment = raw.slice(hashIndex + 1);
  return fragment.startsWith("/") ? fragment : raw.slice(0, hashIndex);
}

function routePath(value) {
  const candidate = routeCandidate(value);
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    try { return new URL(candidate).pathname || "/"; }
    catch { return "/"; }
  }
  return candidate.split("?")[0].split("#")[0] || "/";
}

export function normalizeDemoRoute(value) {
  const path = routePath(value);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return DETAIL_ROUTE_BASES.find((base) => normalized === base || normalized.startsWith(`${base}/`)) ?? normalized;
}
