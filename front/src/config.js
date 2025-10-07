// Configuration util to build backend URLs that work in dev and prod

const computeBackendHttpBase = () => {
  const env = process.env.REACT_APP_BACKEND_URL;
  if (env && typeof env === 'string') return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // Dev default: CRA at 3000, backend at 8000
    if (port === '3000') {
      const p = protocol === 'https:' ? 'https:' : 'http:';
      return `${p}//${hostname}:8000`;
    }
    // Same-origin default (reverse-proxy, prod)
    return window.location.origin;
  }
  return 'http://localhost:8000';
};

export const BACKEND_HTTP_BASE = computeBackendHttpBase();

export const BACKEND_WS_BASE = (() => {
  const url = BACKEND_HTTP_BASE;
  if (url.startsWith('https://')) return url.replace('https://', 'wss://');
  if (url.startsWith('http://')) return url.replace('http://', 'ws://');
  return url;
})();

export const imageUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || /^wss?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_HTTP_BASE}${normalized}`;
};


