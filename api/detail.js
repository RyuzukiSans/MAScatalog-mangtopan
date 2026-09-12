// api/detail.js - Vercel Serverless Function
// Serve detail.html asli + inject OG meta tags dinamis

import { readFileSync } from 'fs';
import { join } from 'path';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbw-LHBPR43mEqpLPQ7wDoD30iSGxn0j_QNdtf9fu7OBFkyb__fgL49uxT0Ax-nc3-na/exec';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeDriveUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  let fileId = null;
  const pats = [
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/
  ];
  for (const re of pats) {
    const m = url.match(re);
    if (m && m[1]) { fileId = m[1]; break; }
  }
  if (!fileId) return url;
  return 'https://lh3.googleusercontent.com/d/' + fileId + '=w1600';
}

let detailHtmlCache = null;
function getDetailHtml() {
  if (detailHtmlCache) return detailHtmlCache;
  try {
    const path = join(process.cwd(), 'detail.html');
    detailHtmlCache = readFileSync(path, 'utf-8');
    return detailHtmlCache;
  } catch (e) {
    console.error('Gagal baca detail.html:', e);
    return null;
  }
}

function injectMeta(html, { title, description, image, url }) {
  let out = html
    .replace(/<title>[^<]*<\/title>\s*/gi, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '');

  const metaBlock = `
  <title>${escapeHtml(title)} - MAScatalog</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="MAScatalog">
  <meta property="og:title" content="${escapeHtml(title)} - MAScatalog">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1600">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)} - MAScatalog">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  `;

  if (out.includes('<head>')) {
    out = out.replace('<head>', '<head>' + metaBlock);
  } else {
    out = out.replace('</head>', metaBlock + '</head>');
  }
  return out;
}

export default async function handler(req, res) {
  const slug = req.query.slug || '';

  if (!slug) return res.redirect(302, '/');

  const html = getDetailHtml();
  if (!html) return res.redirect(302, `/detail.html?slug=${encodeURIComponent(slug)}`);

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'fouad-books.vercel.app';
  const canonicalUrl = `${proto}://${host}/api/detail?slug=${encodeURIComponent(slug)}`;

  try {
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getAll' })
    });

    const data = await gasRes.json();
    const books = (data && data.books) || [];
    const book = books.find(b => b.slug === slug);

    if (!book) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.status(200).send(html);
    }

    const coverUrl = normalizeDriveUrl(book.cover_url) || '';

    const finalHtml = injectMeta(html, {
      title: book.title || 'Detail Buku',
      description: book.short_desc || 'Katalog buku MAScatalog',
      image: coverUrl,
      url: canonicalUrl
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).send(finalHtml);

  } catch (err) {
    console.error('Error:', err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(html);
  }
}
