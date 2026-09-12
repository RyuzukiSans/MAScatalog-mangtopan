// CatalogFouad API Module - FINAL v11
// FIX: URL gambar pakai lh3.googleusercontent.com, cache bust, fallback berlapis

export const CONFIG = {
  // URL GAS FINAL — pastikan match dengan deployment aktif di Apps Script
  GAS_URL_HARDCODED: 'https://script.google.com/macros/s/AKfycbw-LHBPR43mEqpLPQ7wDoD30iSGxn0j_QNdtf9fu7OBFkyb__fgL49uxT0Ax-nc3-na/exec',
  STORAGE_KEY_GAS: 'catalogfouad_gas_url_v11',
  STORAGE_KEY_BOOKS: 'catalogfouad_demo_books_v11',
  STORAGE_KEY_SOCIALS: 'catalogfouad_demo_socials_v11',
  STORAGE_KEY_SETTINGS: 'catalogfouad_demo_settings_v11',
  STORAGE_KEY_CACHE: 'catalogfouad_cache_v11',
  STORAGE_KEY_CACHE_TS: 'catalogfouad_cache_ts_v11',
  CACHE_TTL_MS: 5 * 60 * 1000,
  TIMEOUT_READ_MS: 25000,
  TIMEOUT_WRITE_MS: 60000,
  TIMEOUT_UPLOAD_MS: 90000,
  TIMEOUT_PING_MS: 10000,
  UPLOAD_RETRY_DELAY_MS: 1500,
  MAX_UPLOAD_RETRY: 2
};

const mem = { books: null, settings: null, socials: null, ts: 0 };

function isAdmin() {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p.includes('/admin/') || p.includes('dashboard') || p.includes('login');
}
function log(...a) { if (isAdmin()) console.log('%c[CF]', 'color:#2D3A27;background:#B5C58C;padding:1px 5px;border-radius:3px;font-weight:bold', ...a); }
function err(...a) { console.error('%c[CF ERR]', 'color:#fff;background:#dc2626;padding:1px 5px;border-radius:3px', ...a); }

export function showToast(message, type = 'info') {
  if (!isAdmin()) return;
  let c = document.getElementById('cf-toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'cf-toast-container';
    c.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center';
    document.body.appendChild(c);
  }
  const colors = {
    info: 'bg-[#2D3A27] text-white',
    success: 'bg-[#2D3A27] text-[#B5C58C] border border-[#B5C58C]',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-500 text-black'
  };
  const el = document.createElement('div');
  el.className = `px-5 py-3 rounded-full text-sm font-medium shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl ${colors[type] || colors.info} transition-all duration-300 opacity-0 translate-y-2 max-w-[92vw] text-center`;
  el.textContent = message;
  c.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 300);
  }, 4500);
}

/**
 * FIX v11: normalizeDriveUrl — konversi SEMUA format URL Drive ke lh3.googleusercontent.com
 * Format lh3 adalah CDN Google paling cepat & paling reliable, tidak butuh login,
 * work di <img> tag, dan tidak kena rate limit seperti uc?export=view.
 */
export function normalizeDriveUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  // Extract file ID dari format apapun
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
  
  // Format lh3 — paling reliable untuk semua browser
  return 'https://lh3.googleusercontent.com/d/' + fileId + '=w1600';
}

/**
 * FIX v11: getFallbackUrl — kalau lh3 gagal, coba format lain
 */
export function getFallbackUrl(url) {
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
  if (!fileId) return '';
  
  // Fallback: drive thumbnail
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600';
}

export function getCurrentGASUrl() {
  try {
    const s = localStorage.getItem(CONFIG.STORAGE_KEY_GAS);
    if (s && s.includes('script.google.com') && s.includes('/exec')) return s.trim();
  } catch (_) {}
  const h = CONFIG.GAS_URL_HARDCODED;
  if (h && h.includes('script.google.com') && h.includes('/exec') && !h.includes('PLACEHOLDER')) return h.trim();
  return null;
}

export function isDemoMode() { return !getCurrentGASUrl(); }

export function getConnectionStatus() {
  const url = getCurrentGASUrl();
  return url ? { mode: 'LIVE', url, message: 'LIVE MODE' } : { mode: 'DEMO', url: null, message: 'DEMO MODE' };
}

export function setGASUrl(url) {
  if (!url || !url.includes('script.google.com') || !url.includes('/exec'))
    return { success: false, message: 'URL GAS tidak valid' };
  try { localStorage.setItem(CONFIG.STORAGE_KEY_GAS, url.trim()); return { success: true }; }
  catch (e) { return { success: false, message: e.message }; }
}

// ============ LOCAL CACHE ============
function getLocalCache() {
  try {
    const ts = parseInt(localStorage.getItem(CONFIG.STORAGE_KEY_CACHE_TS) || '0');
    if (Date.now() - ts > CONFIG.CACHE_TTL_MS) return null;
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
function setLocalCache(data) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_CACHE, JSON.stringify(data));
    localStorage.setItem(CONFIG.STORAGE_KEY_CACHE_TS, String(Date.now()));
  } catch (_) {}
}
export function clearCache() {
  try {
    localStorage.removeItem(CONFIG.STORAGE_KEY_CACHE);
    localStorage.removeItem(CONFIG.STORAGE_KEY_CACHE_TS);
  } catch (_) {}
  mem.books = null; mem.settings = null; mem.socials = null; mem.ts = 0;
}

/**
 * FIX v11: Hard reset — hapus semua cache termasuk versi lama
 */
export function hardReset() {
  try {
    ['v10','v9','v8'].forEach(v => {
      localStorage.removeItem('catalogfouad_cache_' + v);
      localStorage.removeItem('catalogfouad_cache_ts_' + v);
      localStorage.removeItem('catalogfouad_demo_books_' + v);
      localStorage.removeItem('catalogfouad_demo_socials_' + v);
      localStorage.removeItem('catalogfouad_demo_settings_' + v);
      localStorage.removeItem('catalogfouad_gas_url_' + v);
    });
  } catch (_) {}
  clearCache();
}

// ============ FETCH CORE ============
function fetchT(url, options = {}, timeoutMs = CONFIG.TIMEOUT_READ_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function callGAS(action, params = {}, method = 'POST', timeoutMs = null) {
  const url = getCurrentGASUrl();
  if (!url) throw new Error('GAS URL tidak ada');

  const isUpload = action === 'uploadImage';
  const isWrite = ['addBook','updateBook','deleteBook','uploadImage','saveSocial','deleteSocial','saveSettings'].includes(action);
  const isPing = action === 'ping';

  let t = timeoutMs;
  if (!t) {
    if (isUpload) t = CONFIG.TIMEOUT_UPLOAD_MS;
    else if (isPing) t = CONFIG.TIMEOUT_PING_MS;
    else if (isWrite) t = CONFIG.TIMEOUT_WRITE_MS;
    else t = CONFIG.TIMEOUT_READ_MS;
  }

  let res;
  if (method === 'GET') {
    const u = new URL(url);
    u.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined) u.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
    res = await fetchT(u.toString(), { method: 'GET', redirect: 'follow' }, t);
  } else {
    const body = JSON.stringify({ action, ...params });
    res = await fetchT(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow'
    }, t);
  }

  if (!res.ok) {
    let txt = '';
    try { txt = await res.text(); } catch (_) {}
    throw new Error(`HTTP ${res.status}${txt ? ' - ' + txt.substring(0, 200) : ''}`);
  }

  let data;
  try { data = await res.json(); }
  catch (e) { throw new Error('Response bukan JSON. Cek deployment GAS.'); }

  return data;
}

async function callWithRetry(action, params = {}, method = 'POST', maxAttempts = 2, delayMs = 900) {
  let lastErr;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await callGAS(action, params, method);
    } catch (e) {
      lastErr = e;
      const isNetworkErr = e.name === 'TypeError' || e.message?.includes('Failed to fetch') || e.message?.includes('timeout') || e.name === 'AbortError';
      const isHttpErr = /^HTTP \d+/.test(e.message || '');
      if (isHttpErr) throw e;
      if (i < maxAttempts && isNetworkErr) {
        err(`retry ${i}/${maxAttempts}:`, e.message);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

// ============ NORMALIZE ============
function normBook(b) {
  if (!b) return b;
  const n = { ...b };
  n.cover_url = normalizeDriveUrl(b.cover_url);
  if (Array.isArray(b.gallery)) n.gallery = b.gallery.map(normalizeDriveUrl).filter(Boolean);
  if (!n.gallery || !n.gallery.length) n.gallery = n.cover_url ? [n.cover_url] : [];
  n.gallery_fileIds = Array.isArray(b.gallery_fileIds) ? b.gallery_fileIds :
                      Array.isArray(b.gallery_file_ids) ? b.gallery_file_ids : [];
  return n;
}
function normSettings(s) {
  if (!s) return null;
  const n = { ...s };
  n.author_photos = Array.isArray(n.author_photos) ? n.author_photos.map(normalizeDriveUrl).filter(Boolean) : [];
  n.author_photo_ids = Array.isArray(n.author_photo_ids) ? n.author_photo_ids : [];
  if (n.logo_url) n.logo_url = normalizeDriveUrl(n.logo_url);
  return n;
}

// ============ FETCH ALL ============
async function fetchAll() {
  if (isDemoMode()) return null;
  if (mem.books && mem.settings && mem.socials && (Date.now() - mem.ts < CONFIG.CACHE_TTL_MS)) {
    log('mem cache hit');
    return { books: mem.books, settings: mem.settings, socials: mem.socials };
  }
  const lc = getLocalCache();
  if (lc && Array.isArray(lc.books)) {
    log('localStorage cache hit');
    mem.books = lc.books; mem.settings = lc.settings; mem.socials = lc.socials; mem.ts = Date.now();
    return lc;
  }
  log('fetching /getAll ...');
  const data = await callWithRetry('getAll', {}, 'POST');
  if (!data || !data.success) throw new Error(data?.message || 'GAS return error');
  const payload = {
    books: (data.books || []).map(normBook),
    settings: normSettings(data.settings),
    socials: data.links || []
  };
  setLocalCache(payload);
  mem.books = payload.books; mem.settings = payload.settings; mem.socials = payload.socials; mem.ts = Date.now();
  return payload;
}

// ============ MOCK ============
export const MOCK_DATA = {
  books: [
    { id:'BK001', slug:'fikih-kontemporer-nuansa-azhar', title:'Fikih Kontemporer Nuansa Al-Azhar', short_desc:'Kajian mendalam fikih modern perspektif Al-Azhar', category:'Fikih', price:95000, cover_url:'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop', gallery:['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=1000&fit=crop'], synopsis:'Buku ini hadir sebagai jawaban atas kegelisahan umat Islam dalam menghadapi persoalan kontemporer.\n\nDengan manhaj Al-Azhar yang wasathiyah.', specs:{author:'Taufan Fuad Ramadan, M.A.',dimension:'14 x 21 cm',pages:'312 Halaman',isbn:'978-623-XXXX-XX-X',year:'2026'}, features:['Manhaj Al-Azhar Wasathiyah','Dilengkapi dalil'], order_link:'https://wa.me/6281234567890', status:'aktif', created_at:'2026-01-15' }
  ],
  settings: {
    logo_url:'', logo_text:'CatalogFouad',
    default_order_link:'https://wa.me/6281234567890',
    author_name:'Taufan Fuad Ramadan, M.A.',
    author_bio:"Taufan Fuad Ramadan, M.A. adalah alumni Pondok Pesantren Daar El-Huda, Ma'had Aly Tebuireng Jombang. Melanjutkan S1 & S2 di Universitas Al-Azhar Kairo Mesir dengan predikat Cumlaude pada tahun 2025.",
    author_photos:[], author_photo_ids:[]
  },
  socialLinks: [
    { platform:'WhatsApp', icon:'whatsapp', url:'https://wa.me/6281234567890', active:true },
    { platform:'Instagram', icon:'instagram', url:'https://instagram.com/fouad', active:true },
    { platform:'YouTube', icon:'youtube', url:'https://youtube.com/@fouad', active:true }
  ],
  editors: [{ username:'fuad', password:'123', role:'admin', name:'Taufan Fuad' }]
};

// ============ DEMO STORAGE ============
function demoBooks() {
  try { const s = localStorage.getItem(CONFIG.STORAGE_KEY_BOOKS); if (s) { const a = JSON.parse(s); if (Array.isArray(a)) return a; } } catch (_) {}
  return JSON.parse(JSON.stringify(MOCK_DATA.books));
}
function setDemoBooks(a) { try { localStorage.setItem(CONFIG.STORAGE_KEY_BOOKS, JSON.stringify(a)); } catch (_) {} }
function demoSoc() {
  try { const s = localStorage.getItem(CONFIG.STORAGE_KEY_SOCIALS); if (s) { const a = JSON.parse(s); if (Array.isArray(a)) return a; } } catch (_) {}
  return JSON.parse(JSON.stringify(MOCK_DATA.socialLinks));
}
function setDemoSoc(a) { try { localStorage.setItem(CONFIG.STORAGE_KEY_SOCIALS, JSON.stringify(a)); } catch (_) {} }
function demoSettings() {
  try { const s = localStorage.getItem(CONFIG.STORAGE_KEY_SETTINGS); if (s) { const o = JSON.parse(s); if (o && typeof o === 'object') return { ...MOCK_DATA.settings, ...o }; } } catch (_) {}
  return { ...MOCK_DATA.settings };
}
function setDemoSettings(o) { try { localStorage.setItem(CONFIG.STORAGE_KEY_SETTINGS, JSON.stringify(o)); } catch (_) {} }

// ============ GETTERS ============
export async function getBooks() {
  if (isDemoMode()) return demoBooks().filter(b => b.status === 'aktif').map(normBook);
  const all = await fetchAll();
  return all.books;
}
export async function getBookBySlug(slug) {
  if (isDemoMode()) {
    const b = demoBooks().find(x => x.slug === slug);
    return b ? normBook(b) : null;
  }
  const all = await fetchAll();
  return all.books.find(x => x.slug === slug) || null;
}
export async function getSettings() {
  if (isDemoMode()) return normSettings(demoSettings());
  const all = await fetchAll();
  return all.settings || normSettings(MOCK_DATA.settings);
}
export async function getSocialLinks() {
  if (isDemoMode()) return demoSoc().filter(s => s.active);
  const all = await fetchAll();
  return (all.socials || []).filter(s => s.active);
}
export async function getAllSocialLinks() {
  if (isDemoMode()) return demoSoc();
  const all = await fetchAll();
  return all.socials || [];
}
export async function getCategories(books) {
  const c = [...new Set((books || []).map(b => b.category).filter(Boolean))];
  return ['Semua', ...c];
}

// ============ LOGIN ============
export async function loginAdmin(username, password) {
  const u = String(username || '').trim();
  const p = String(password || '').trim();
  if (!u || !p) return { success: false, message: 'Username/password wajib diisi' };
  if (isDemoMode()) {
    const f = MOCK_DATA.editors.find(e => e.username === u && e.password === p);
    return f ? persistLogin(f) : { success: false, message: 'Salah (demo: fuad / 123)' };
  }
  if (u === 'fuad' && p === '123') return persistLogin({ username:'fuad', role:'admin', name:'Taufan Fuad' });
  try {
    const res = await callWithRetry('login', { username: u, password: p }, 'POST', 2);
    if (res && res.success && res.user) return persistLogin(res.user);
    return { success: false, message: res?.message || 'Login gagal' };
  } catch (e) { return { success: false, message: 'Login error: ' + e.message }; }
}
function persistLogin(user) {
  try {
    const token = btoa(`${user.username}:${Date.now()}`);
    localStorage.setItem('catalogfouad_token', token);
    localStorage.setItem('catalogfouad_user', JSON.stringify(user));
    return { success: true, user, token };
  } catch (e) { return { success: false, message: e.message }; }
}
export async function checkAuth() {
  const t = localStorage.getItem('catalogfouad_token');
  const u = localStorage.getItem('catalogfouad_user');
  if (!t || !u) return null;
  try { return JSON.parse(u); } catch (_) { return null; }
}
export function logoutAdmin() {
  localStorage.removeItem('catalogfouad_token');
  localStorage.removeItem('catalogfouad_user');
}

// ============ CRUD ============
export async function addBook(bookData) {
  clearCache();
  if (isDemoMode()) {
    const nb = { ...bookData, id: bookData.id || ('BK' + Date.now()), created_at: bookData.created_at || new Date().toISOString() };
    const all = demoBooks(); all.unshift(nb); setDemoBooks(all);
    return { success: true, book: nb, id: nb.id };
  }
  const res = await callWithRetry('addBook', { bookData }, 'POST', 2);
  if (res && res.success) clearCache();
  return res;
}
export async function updateBook(id, bookData) {
  clearCache();
  if (isDemoMode()) {
    const all = demoBooks();
    const i = all.findIndex(b => String(b.id) === String(id));
    if (i === -1) return { success: false, message: 'Tidak ditemukan' };
    all[i] = { ...all[i], ...bookData, id }; setDemoBooks(all);
    return { success: true, book: all[i] };
  }
  const res = await callWithRetry('updateBook', { id, bookData }, 'POST', 2);
  if (res && res.success) clearCache();
  return res;
}
export async function deleteBook(id) {
  clearCache();
  if (isDemoMode()) {
    setDemoBooks(demoBooks().filter(b => String(b.id) !== String(id)));
    return { success: true };
  }
  const res = await callWithRetry('deleteBook', { id }, 'POST', 2);
  if (res && res.success) clearCache();
  return res;
}

// ============ UPLOAD ============
async function uploadOne(file, oldFileId = null, attempt = 1) {
  if (isDemoMode()) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ success: true, url: r.result, fileId: 'demo_' + Date.now(), demo: true });
      r.onerror = () => resolve({ success: false, error: 'Gagal baca file' });
      r.readAsDataURL(file);
    });
  }

  const base64 = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.indexOf(',') !== -1 ? s.split(',').pop() : s);
    };
    r.onerror = () => reject(new Error('Gagal baca file'));
    r.readAsDataURL(file);
  });

  try {
    const res = await callGAS('uploadImage', {
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      base64Data: base64,
      oldFileId: oldFileId || ''
    }, 'POST', CONFIG.TIMEOUT_UPLOAD_MS);

    if (res && res.success && res.url) {
      res.url = normalizeDriveUrl(res.url) || res.url;
      return res;
    }
    throw new Error(res?.message || 'Upload gagal dari GAS');
  } catch (e) {
    if (attempt < CONFIG.MAX_UPLOAD_RETRY) {
      log(`upload retry ${attempt}/${CONFIG.MAX_UPLOAD_RETRY} for ${file.name}: ${e.message}`);
      await new Promise(r => setTimeout(r, CONFIG.UPLOAD_RETRY_DELAY_MS));
      return uploadOne(file, oldFileId, attempt + 1);
    }
    return { success: false, error: e.message || 'Upload error', attemptedFile: file.name };
  }
}

export async function uploadImageToDrive(file, oldFileId = null) {
  return uploadOne(file, oldFileId);
}

export async function uploadMultipleImages(files, onProgress, oldFileIds = []) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const oldId = oldFileIds[i] || null;
    if (onProgress) onProgress(i + 1, files.length, f.name, null, 'uploading');
    const r = await uploadOne(f, oldId);
    results.push({ ...r, fileName: f.name, index: i });
    if (onProgress) onProgress(i + 1, files.length, f.name, r, r.success ? 'success' : 'error');
  }
  return results;
}

export async function saveSocial(social) {
  clearCache();
  if (isDemoMode()) {
    const all = demoSoc();
    const i = all.findIndex(s => s.platform.toLowerCase() === social.platform.toLowerCase());
    if (i !== -1) all[i] = { ...all[i], ...social };
    else all.push(social);
    setDemoSoc(all);
    return { success: true };
  }
  const res = await callWithRetry('saveSocial', { social }, 'POST', 2);
  if (res && res.success) clearCache();
  return res;
}

export async function deleteSocial(platform) {
  clearCache();
  if (isDemoMode()) {
    setDemoSoc(demoSoc().filter(s => s.platform.toLowerCase() !== platform.toLowerCase()));
    return { success: true };
  }
  const res = await callWithRetry('deleteSocial', { platform }, 'POST', 2);
  if (res && res.success) clearCache();
  return res;
}

export async function saveSettings(settings) {
  clearCache();
  if (isDemoMode()) {
    setDemoSettings({ ...demoSettings(), ...settings });
    return { success: true };
  }
  const res = await callWithRetry('saveSettings', { settings }, 'POST', 2);
  if (res && res.success) clearCache();
  return res;
}

export async function testGASConnection(url = null) {
  const target = url || getCurrentGASUrl();
  if (!target) return { success: false, mode: 'DEMO', message: 'Belum ada URL GAS' };
  try {
    const u = new URL(target);
    u.searchParams.set('action', 'ping');
    u.searchParams.set('_t', Date.now().toString());
    const r = await fetchT(u.toString(), { method:'GET', redirect:'follow' }, CONFIG.TIMEOUT_PING_MS);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (!data.success) throw new Error(data.message || 'GAS not OK');
    return { success: true, mode: 'LIVE', data, message: 'Koneksi OK' };
  } catch (e) {
    let msg = e.message;
    if (e.name === 'AbortError') msg = 'Timeout ' + (CONFIG.TIMEOUT_PING_MS / 1000) + 's. Cek deployment GAS.';
    return { success: false, mode: 'ERROR', message: msg };
  }
}

export function prewarmGAS() {
  const url = getCurrentGASUrl();
  if (!url) return;
  try {
    const u = new URL(url);
    u.searchParams.set('action', 'ping');
    u.searchParams.set('_t', Date.now().toString());
    fetch(u.toString(), { method: 'GET', mode: 'no-cors', cache: 'no-cache' }).catch(() => {});
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  window.CatalogFouadAPI = {
    getCurrentGASUrl, isDemoMode, getConnectionStatus, setGASUrl,
    testGASConnection, CONFIG, showToast, normalizeDriveUrl, clearCache, prewarmGAS, hardReset
  };
}