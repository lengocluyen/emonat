import app from '../server/index.js';

export default function handler(req, res) {
  // When we rewrite `/api/*` to this function, some adapters may strip the `/api` prefix.
  // Normalize so our Express routes (`/api/...`) always match.
  if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}

