// api/detail.js - Vercel Serverless Function
// Menghasilkan HTML dengan OG tags dinamis untuk crawler sosmed

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

export default async function handler(req, res) {
  const slug = req.query.slug || '';
  
  // Kalau tidak ada slug, redirect ke index
  if (!slug) {
    return res.redirect(302, '/');
  }

  try {
    // Fetch data dari GAS
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getAll' })
    });
    
    const data = await gasRes.json();
    const books = (data && data.books) || [];
    const book = books.find(b => b.slug === slug);

    if (!book) {
      // Buku tidak ditemukan - tetap serve HTML asli (biar JS handle)
      return res.redirect(302, `/detail.html?slug=${encodeURIComponent(slug)}`);
    }

    const coverUrl = normalizeDriveUrl(book.cover_url);
    const title = escapeHtml(book.title || 'Detail Buku');
    const description = escapeHtml(book.short_desc || 'Katalog buku MAScatalog');
    const canonicalUrl = `https://fouad-books.vercel.app/detail.html?slug=${encodeURIComponent(slug)}`;

    // Baca file detail.html asli dan inject meta tag dinamis
    // Cara paling aman: kirim HTML minimal dengan meta tag + redirect ke detail.html
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - MAScatalog</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph (Facebook, WhatsApp, Telegram, LinkedIn) -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title} - MAScatalog">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${coverUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1600">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="MAScatalog">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} - MAScatalog">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${coverUrl}">
  
  <!-- Redirect ke halaman asli setelah crawler baca meta -->
  <meta http-equiv="refresh" content="0;url=/detail.html?slug=${encodeURIComponent(slug)}">
  <link rel="canonical" href="${canonicalUrl}">
</head>
<body>
  <p>Mengalihkan ke <a href="/detail.html?slug=${encodeURIComponent(slug)}">halaman detail</a>...</p>
  <script>window.location.replace("/detail.html?slug=${encodeURIComponent(slug)}");</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).send(html);

  } catch (err) {
    console.error('Error:', err);
    // Fallback: redirect ke detail.html
    return res.redirect(302, `/detail.html?slug=${encodeURIComponent(slug)}`);
  }
}
