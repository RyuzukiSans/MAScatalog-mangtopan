// api/detail.js - Vercel Serverless Function
// v2: Baca detail.html asli + inject OG meta tags dinamis (thumbnail besar)
// Tidak ada redirect - user langsung lihat halaman detail

import { readFileSync } from 'fs';
import { join } from 'path';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbw-LHBPR43mEqpLPQ7wDoD30iSGxn0j_QNdtf9fu7OBFkyb__fgL49uxT0Ax-nc3-na/exec';

// ==================== HELPERS ====================

function escapeHtml(str) {
  if (str == null) return '';
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
  // Format lh3 — paling reliable untuk <img> dan crawler
  return 'https://lh3.googleusercontent.com/d/' + fileId + '=w1600';
}

// Cache detail.html di memory (di-load sekali per cold start)
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

// ==================== META INJECTION ====================
// Hapus meta OG/Twitter/description/title lama, lalu inject yang baru
function injectMeta(html, { title, description, image, url }) {
  // Hapus meta lama (title, description, og:*, twitter:*)
  let out = html
    .replace(/<title>[^<]*<\/title>\s*/gi, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '');

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);

  // Meta block lengkap untuk preview besar di semua platform
  const metaBlock = `
  <title>${safeTitle} - MAScatalog</title>
  <meta name="description" content="${safeDesc}">

  <!-- Open Graph (WhatsApp, Facebook, Telegram, LinkedIn) -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="MAScatalog">
  <meta property="og:title" content="${safeTitle} - MAScatalog">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1600">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:locale" content="id_ID">

  <!-- Twitter / X — summary_large_image = preview BESAR -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle} - MAScatalog">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  <meta name="twitter:image:alt" content="${safeTitle}">
  `;

  // Inject tepat setelah <head> supaya terbaca duluan oleh crawler
  if (out.includes('<head>')) {
    out = out.replace('<head>', '<head>' + metaBlock);
  } else {
    out = out.replace('</head>', metaBlock + '</head>');
  }
  return out;
}

// ==================== HANDLER ====================

export default async function handler(req, res) {
  const slug = req.query.slug || '';

  // Tanpa slug → redirect ke index (bukan ke detail)
  if (!slug) {
    return res.redirect(302, '/');
  }

  // Ambil HTML asli dari disk
  const html = getDetailHtml();
  if (!html) {
    // Fallback: kalau detail.html tidak terbaca, redirect ke versi statis
    return res.redirect(302, `/detail.html?slug=${encodeURIComponent(slug)}`);
  }

  // Detect proto & host untuk canonical URL
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'fouad-books.vercel.app';
  const canonicalUrl = `${proto}://${host}/detail.html?slug=${encodeURIComponent(slug)}`;

  try {
    // Fetch data buku dari Google Apps Script
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getAll' })
    });

    if (!gasRes.ok) {
      throw new Error(`GAS HTTP ${gasRes.status}`);
    }

    const data = await gasRes.json();
    const books = (data && data.books) || [];
    const book = books.find(b => b.slug === slug);

    // Buku tidak ditemukan → tetap serve HTML asli (JS akan handle "not found")
    if (!book) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
      return res.status(200).send(html);
    }

    // Normalize cover URL → pastikan format lh3 (paling reliable)
    const coverUrl = normalizeDriveUrl(book.cover_url) || '';

    // Kalau cover kosong, pakai placeholder biar thumbnail tetap muncul
    const finalImage = coverUrl || `${proto}://${host}/og-default.jpg`;

    // Inject meta tag dinamis ke HTML
    const finalHtml = injectMeta(html, {
      title: book.title || 'Detail Buku',
      description: book.short_desc || 'Katalog buku karya Taufan Fuad Ramadan, M.A.',
      image: finalImage,
      url: canonicalUrl
    });

    // Cache 5 menit di browser, 10 menit di CDN Vercel
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
    return res.status(200).send(finalHtml);

  } catch (err) {
    console.error('[api/detail] Error:', err && err.message ? err.message : err);

    // Fallback: kirim HTML asli tanpa meta dinamis
    // (user tetap bisa lihat halaman, hanya thumbnail yang generik)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(html);
  }
}
