// Zero-dependency static server for local development: `npm start`.
//
// Three sites live in this repo, and the Host header picks between them:
//   morso     -> repo root          http://localhost:3000
//   stepone   -> ./stepone          http://stepone.localhost:3000
//   gzyjason  -> ./gzyjason         http://gzyjason.localhost:3000
//
// Browsers resolve *.localhost to the loopback address, so the subdomain works
// with no /etc/hosts entry. The `/stepone/` and `/gzyjason/` paths also serve
// the same files, so each page still works on hosts without subdomain routing.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

const SITES = {
  stepone: path.join(ROOT, 'stepone'),
  gzyjason: path.join(ROOT, 'gzyjason'),
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** Repo root, unless the Host names a subdomain we serve from its own directory. */
function siteRoot(hostHeader) {
  const sub = String(hostHeader || '').split(':')[0].split('.')[0].toLowerCase();
  return SITES[sub] || ROOT;
}

http
  .createServer((req, res) => {
    const root = siteRoot(req.headers.host);
    const url = new URL(req.url, `http://${req.headers.host}`);
    let rel = decodeURIComponent(url.pathname).slice(1);
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';

    let file = path.resolve(root, rel);

    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    // Bare directory request (no trailing slash), e.g. /stepone
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }

    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    });
  })
  .listen(PORT, () => {
    console.log(`MorSo    → http://localhost:${PORT}`);
    console.log(`StepOne  → http://stepone.localhost:${PORT}`);
    console.log(`gzyjason → http://gzyjason.localhost:${PORT}`);
  });
