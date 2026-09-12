// CatalogFouad Admin - FINAL v11
import {
  loginAdmin, checkAuth, logoutAdmin, getBooks, getSettings, getSocialLinks, getAllSocialLinks,
  addBook, updateBook, deleteBook, uploadImageToDrive, uploadMultipleImages,
  getCurrentGASUrl, getConnectionStatus, isDemoMode, testGASConnection,
  CONFIG, MOCK_DATA, normalizeDriveUrl, getFallbackUrl, saveSocial, deleteSocial,
  saveSettings, clearCache, hardReset, showToast
} from './api.js';

let booksCache = [];
let socialsCache = [];

function icons() { try { if (window.lucide?.createIcons) lucide.createIcons(); } catch (_) {} }
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function safeImgAttr(url, placeholder = 'https://via.placeholder.com/40x56') {
  const primary = normalizeDriveUrl(url);
  const fallback = getFallbackUrl(url);
  if (!primary) return `src="${placeholder}"`;
  return `src="${primary}" data-fallback="${fallback}" data-placeholder="${placeholder}" onerror="(function(img){var fb=img.dataset.fallback;var ph=img.dataset.placeholder;if(fb&&img.src!==fb){img.src=fb;}else{img.src=ph;img.onerror=null;}})(this)"`;
}

function pbar(show) {
  let b = document.getElementById('cf-progress');
  if (!b) {
    b = document.createElement('div');
    b.id = 'cf-progress';
    b.className = 'progress-bar';
    b.style.width = '0%';
    document.body.appendChild(b);
  }
  if (show) {
    b.style.width = '0%'; b.style.opacity = '1';
    requestAnimationFrame(() => { b.style.width = '70%'; });
  } else {
    b.style.width = '100%';
    setTimeout(() => { b.style.opacity = '0'; setTimeout(() => b.remove(), 300); }, 250);
  }
}

function btnLoad(btn, text = 'Proses...') {
  if (!btn) return () => {};
  const orig = btn.innerHTML; const origDis = btn.disabled;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${text}`;
  return () => { btn.innerHTML = orig; btn.disabled = origDis; };
}

function alertBox(el, msg, type = 'error') {
  if (!el) return;
  const colors = {
    error: 'bg-red-500/10 border border-red-500/20 text-red-700',
    info: 'bg-blue-500/10 border border-blue-500/20 text-blue-700',
    success: 'bg-green-500/10 border border-green-500/20 text-green-700'
  };
  el.className = `mb-5 p-3 rounded-xl text-sm font-medium fade-in-up ${colors[type]}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showUploadProgress(title, total) {
  let panel = document.getElementById('cf-upload-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'cf-upload-panel';
    panel.className = 'fixed bottom-5 right-5 z-[9998] w-[340px] max-w-[92vw] rounded-2xl bg-[#1a2517] text-white border border-white/10 shadow-2xl p-4 fade-in-up';
    document.body.appendChild(panel);
  }
  panel.innerHTML = `
    <div class="flex items-center gap-2 mb-3">
      <span class="w-6 h-6 rounded-full bg-[#B5C58C] text-[#2D3A27] flex items-center justify-center font-bold text-xs">↑</span>
      <p class="font-bold text-sm">${esc(title)}</p>
    </div>
    <div class="space-y-2" id="cf-upload-list"></div>
  `;
  panel.style.display = 'block';
  return panel;
}

function updateUploadProgress(index, total, fileName, status) {
  const list = document.getElementById('cf-upload-list');
  if (!list) return;
  let row = document.getElementById('cf-up-' + index);
  if (!row) {
    row = document.createElement('div');
    row.id = 'cf-up-' + index;
    row.className = 'flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-white/5';
    list.appendChild(row);
  }
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '<span class="spinner" style="width:12px;height:12px;border-width:2px"></span>';
  row.innerHTML = `<span class="w-4 flex-shrink-0">${icon}</span><span class="flex-1 truncate">${index}/${total} ${esc(fileName)}</span>`;
}

function hideUploadProgress(delay = 2500) {
  const panel = document.getElementById('cf-upload-panel');
  if (!panel) return;
  setTimeout(() => {
    panel.style.transition = 'opacity .3s, transform .3s';
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(10px)';
    setTimeout(() => { panel.style.display = 'none'; panel.style.opacity = ''; panel.style.transform = ''; panel.innerHTML = ''; }, 300);
  }, delay);
}

// ============ BOOT ============
document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;
  const isLogin = path.includes('login.html');
  const isDash = path.includes('dashboard.html');

  if (isLogin) {
    const user = await checkAuth();
    if (user) { window.location.replace('dashboard.html'); return; }
    initLogin();
  } else if (isDash) {
    pbar(true);
    const user = await checkAuth();
    if (!user) { pbar(false); window.location.replace('login.html'); return; }
    await initDash(user);
    pbar(false);
  }
});

function initLogin() {
  const form = document.getElementById('login-form');
  const al = document.getElementById('login-alert');
  if (!form) return;
  if (isDemoMode()) document.getElementById('demo-info')?.classList.remove('hidden');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    if (!u || !p) { alertBox(al, 'Username/password wajib diisi'); return; }
    const btn = form.querySelector('button[type="submit"]');
    const restore = btnLoad(btn, 'Memeriksa...');
    pbar(true); al?.classList.add('hidden');
    try {
      const res = await loginAdmin(u, p);
      if (res.success) {
        alertBox(al, 'Login berhasil!', 'success');
        pbar(false);
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 300);
      } else {
        pbar(false); alertBox(al, res.message || 'Login gagal'); restore();
      }
    } catch (e) {
      pbar(false); alertBox(al, 'Error: ' + e.message); restore();
    }
  });
}

async function initDash(user) {
  document.getElementById('admin-name').textContent = user.name || user.username;
  document.getElementById('admin-role').textContent = user.role || 'admin';

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Keluar?')) { logoutAdmin(); window.location.href = 'login.html'; }
  });

  document.querySelectorAll('[data-section]').forEach(b => {
    b.addEventListener('click', () => switchSec(b.dataset.section));
  });

  bindBookForm();
  bindSettingsForm();
  bindAuthorPhotos();
  bindSocialsForm();
  bindConfig();

  try { await Promise.all([loadBooks(), loadSettings(), loadSocials()]); }
  catch (e) { console.error(e); }
  icons();
}

function switchSec(sec) {
  document.querySelectorAll('[data-section]').forEach(b => {
    b.classList.remove('bg-[#B5C58C]', 'text-[#2D3A27]', 'font-bold');
    b.classList.add('text-white/70');
  });
  const active = document.querySelector(`[data-section="${sec}"]`);
  if (active) {
    active.classList.add('bg-[#B5C58C]', 'text-[#2D3A27]', 'font-bold');
    active.classList.remove('text-white/70');
  }
  document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById('section-' + sec);
  if (el) { el.classList.remove('hidden'); el.classList.add('fade-in-up'); }
  icons();
}

function applyBranding(s) {
  if (!s) return;
  const url = s.logo_url ? (normalizeDriveUrl(s.logo_url) || s.logo_url) : '';
  const txt = s.logo_text || 'MAScatalog';
  if (url) { const f = document.getElementById('dynamic-favicon'); if (f) f.href = url; }
  const df = document.getElementById('admin-logo-fallback');
  const di = document.getElementById('admin-logo-img');
  const dt = document.getElementById('admin-logo-text');
  if (url && di) { di.src = url; di.classList.remove('hidden'); df?.classList.add('hidden'); }
  if (dt) dt.textContent = txt;
  const mf = document.getElementById('admin-logo-fallback-mobile');
  const mi = document.getElementById('admin-logo-img-mobile');
  if (url && mi) { mi.src = url; mi.classList.remove('hidden'); mf?.classList.add('hidden'); }
}

function bindConfig() {
  const cUrl = document.getElementById('gas-current-url');
  const cStatus = document.getElementById('gas-status');
  const refresh = () => {
    const s = getConnectionStatus();
    if (cUrl) {
      cUrl.textContent = s.url || '(Belum diisi)';
      cUrl.className = s.url ? 'text-xs font-mono break-all p-2 rounded bg-green-500/10 text-green-300' : 'text-xs font-mono break-all p-2 rounded bg-amber-500/10 text-amber-300';
    }
    if (cStatus) {
      cStatus.innerHTML = s.mode === 'LIVE'
        ? '<span class="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold">LIVE</span> <span class="text-xs opacity-70 ml-2">Terhubung Google Sheets</span>'
        : '<span class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">DEMO</span> <span class="text-xs opacity-70 ml-2">Tanpa koneksi GAS</span>';
    }
  };
  refresh();
  setInterval(refresh, 5000);

  document.getElementById('gas-test')?.addEventListener('click', async (e) => {
    const restore = btnLoad(e.currentTarget, 'Testing...');
    pbar(true);
    try {
      const r = await testGASConnection();
      pbar(false);
      r.success ? showToast('✅ Koneksi OK', 'success') : showToast('❌ ' + r.message, 'error');
    } finally { restore(); refresh(); }
  });
  document.getElementById('gas-refresh')?.addEventListener('click', async () => {
    clearCache();
    pbar(true);
    await Promise.all([loadBooks(), loadSettings(), loadSocials()]);
    pbar(false);
    showToast('Data di-refresh', 'success');
  });

  // TOMBOL BARU: HARD RESET (hapus semua cache termasuk versi lama)
  document.getElementById('gas-clear')?.addEventListener('click', () => {
    if (confirm('HARD RESET: hapus semua cache termasuk versi lama, lalu reload? Ini akan memperbaiki gambar yang tidak muncul.')) {
      hardReset();
      showToast('Cache di-reset. Reload...', 'info');
      setTimeout(() => location.reload(), 800);
    }
  });
}

// ============ BOOKS LIST ============
async function loadBooks() {
  const tbody = document.getElementById('books-table-body');
  if (!tbody) return;
  tbody.innerHTML = Array(3).fill(0).map(() => `<tr><td colspan="5" class="p-3"><div class="skeleton-row"></div></td></tr>`).join('');
  try {
    const books = await getBooks();
    booksCache = books;
    document.getElementById('stat-total-books').textContent = books.length;
    document.getElementById('stat-categories').textContent = new Set(books.map(b => b.category)).size;
    const mode = getConnectionStatus().mode;
    const sm = document.getElementById('stat-mode');
    if (sm) {
      sm.textContent = mode;
      sm.className = `text-[20px] font-extrabold mt-2 ${mode === 'LIVE' ? 'text-green-300' : 'text-amber-300'}`;
    }
    if (!books.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-10 text-center opacity-70">
        <div class="flex flex-col items-center gap-2">
          <i data-lucide="inbox" class="w-8 h-8 opacity-40"></i>
          <p>Belum ada buku</p>
          <button onclick="document.querySelector('[data-section=add-book]').click()" class="mt-2 px-4 py-2 rounded-full bg-[#B5C58C] text-[#2D3A27] font-bold text-xs">+ Tambah Buku</button>
        </div></td></tr>`;
      icons(); return;
    }
    tbody.innerHTML = books.map(b => `
      <tr class="border-b border-white/10 hover:bg-white/5 transition">
        <td class="py-3 px-4"><div class="flex gap-3 items-center">
          <img ${safeImgAttr(b.cover_url)} class="w-10 h-14 object-cover rounded-lg bg-white/10">
          <div class="min-w-0"><p class="font-bold text-sm line-clamp-1">${esc(b.title)}</p><p class="text-xs opacity-60">${esc(b.id)}</p></div>
        </div></td>
        <td class="py-3 px-4 text-xs"><span class="px-2 py-1 rounded-full bg-[#B5C58C]/20 text-[#B5C58C] whitespace-nowrap">${esc(b.category)}</span></td>
        <td class="py-3 px-4 text-sm font-bold whitespace-nowrap">Rp ${new Intl.NumberFormat('id-ID').format(b.price || 0)}</td>
        <td class="py-3 px-4"><span class="text-xs px-2 py-1 rounded-full ${b.status === 'aktif' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}">${esc(b.status)}</span></td>
        <td class="py-3 px-4"><div class="flex gap-2">
          <button onclick="window.editBook('${b.id}')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-[#B5C58C] hover:text-[#2D3A27] flex items-center justify-center transition" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
          <button onclick="window.deleteBookConfirm('${b.id}')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div></td>
      </tr>`).join('');
    icons();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-red-400">
      <p class="font-bold">Gagal memuat</p>
      <p class="text-xs opacity-60 mt-2 break-words max-w-md mx-auto">${esc(e.message)}</p>
      <button onclick="location.reload()" class="mt-3 px-4 py-2 bg-white/10 rounded-full text-xs hover:bg-white/20">Reload</button>
    </td></tr>`;
  }
}

// ============ BOOK FORM ============
let coverFile = null;
let galleryFiles = [];

function bindBookForm() {
  const form = document.getElementById('book-form');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const coverInput = document.getElementById('cover-file');
  const coverPrev = document.getElementById('cover-preview');
  const galInput = document.getElementById('gallery-files');
  const galPrev = document.getElementById('gallery-preview');

  coverInput?.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { alert('Maks 8MB'); e.target.value = ''; return; }
    coverFile = f;
    const url = URL.createObjectURL(f);
    coverPrev.innerHTML = `<img src="${url}" class="w-full h-48 object-cover rounded-xl"><p class="text-xs mt-2 opacity-60">${esc(f.name)} (${(f.size/1024).toFixed(0)} KB)</p>`;
  });

  galInput?.addEventListener('change', e => {
    galleryFiles = Array.from(e.target.files);
    galPrev.innerHTML = galleryFiles.map((f, i) => {
      const u = URL.createObjectURL(f);
      return `<div class="relative"><img src="${u}" class="w-20 h-28 object-cover rounded-lg"><span class="absolute -top-1 -right-1 w-5 h-5 bg-[#2D3A27] text-white rounded-full text-[10px] flex items-center justify-center font-bold">${i+1}</span></div>`;
    }).join('');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const restore = btnLoad(btn, 'Menyimpan...');
    pbar(true);

    try {
      const fd = new FormData(form);
      const idInput = document.getElementById('book-id').value.trim();
      const isEdit = !!idInput;
      const id = idInput || ('BK' + Date.now());
      const existing = isEdit ? booksCache.find(b => String(b.id) === String(id)) : null;

      let coverUrl = existing?.cover_url || document.getElementById('input-cover-existing')?.value || '';
      let coverFileId = existing?.cover_fileId || '';

      // UPLOAD COVER
      if (coverFile) {
        btn.innerHTML = `<span class="spinner"></span> Upload cover...`;
        const up = await uploadImageToDrive(coverFile, existing?.cover_fileId || null);
        if (!up.success) {
          pbar(false);
          showToast('❌ Upload cover gagal: ' + (up.error || up.message || 'unknown'), 'error');
          restore();
          return;
        }
        coverUrl = up.url;
        coverFileId = up.fileId || '';
      }
      if (!coverUrl) {
        pbar(false);
        showToast('❌ Cover wajib diisi', 'error');
        restore();
        return;
      }

      // UPLOAD GALLERY
      let galUrls = [];
      let galIds = [];

      if (galleryFiles.length > 0) {
        showUploadProgress(`Upload ${galleryFiles.length} gambar galeri`, galleryFiles.length);
        btn.innerHTML = `<span class="spinner"></span> Upload galeri...`;

        const oldIds = isEdit && existing?.gallery_fileIds ? existing.gallery_fileIds : [];

        const results = await uploadMultipleImages(
          galleryFiles,
          (current, total, fname, res, status) => {
            updateUploadProgress(current, total, fname, status);
            btn.innerHTML = `<span class="spinner"></span> Upload ${current}/${total}...`;
          },
          oldIds
        );

        const success = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        if (success.length > 0) {
          galUrls = success.map(r => r.url);
          galIds = success.map(r => r.fileId).filter(Boolean);
        }

        if (failed.length > 0) {
          showToast(`⚠️ ${failed.length} gambar gagal. Buku tetap disimpan dengan ${success.length} gambar.`, 'warning');
        }

        hideUploadProgress();
      } else if (isEdit && existing) {
        galUrls = Array.isArray(existing.gallery) ? [...existing.gallery] : [];
        galIds = Array.isArray(existing.gallery_fileIds) ? [...existing.gallery_fileIds] : [];
      }

      if (galUrls.length === 0) {
        galUrls = [coverUrl];
        if (coverFileId) galIds = [coverFileId];
      } else if (coverUrl && !galUrls.includes(coverUrl)) {
        galUrls.unshift(coverUrl);
        if (coverFileId) galIds.unshift(coverFileId);
      }

      const seen = new Set(); const fg = []; const fid = [];
      galUrls.forEach((u, i) => {
        if (!u || seen.has(u)) return;
        seen.add(u); fg.push(u);
        if (galIds[i]) fid.push(galIds[i]);
      });

      const bookData = {
        id, slug: fd.get('slug') || slugify(fd.get('title')),
        title: fd.get('title'), short_desc: fd.get('short_desc'),
        category: fd.get('category'), price: parseInt(fd.get('price')) || 0,
        cover_url: coverUrl, cover_fileId: coverFileId,
        gallery: fg, gallery_fileIds: fid, gallery_file_ids: fid,
        synopsis: fd.get('synopsis'),
        specs: { author: fd.get('author'), dimension: fd.get('dimension'), pages: fd.get('pages'), isbn: fd.get('isbn'), year: fd.get('year') },
        features: (fd.get('features') || '').split('\n').map(s => s.trim()).filter(Boolean),
        order_link: fd.get('order_link'),
        status: fd.get('status') || 'aktif',
        created_at: existing?.created_at || new Date().toISOString()
      };

      btn.innerHTML = `<span class="spinner"></span> Menyimpan...`;
      const res = isEdit ? await updateBook(id, bookData) : await addBook(bookData);

      if (res && res.success) {
        pbar(false);
        showToast(isEdit ? '✅ Buku diperbarui' : '✅ Buku ditambahkan', 'success');
        form.reset();
        coverPrev.innerHTML = ''; galPrev.innerHTML = '';
        coverFile = null; galleryFiles = [];
        document.getElementById('book-id').value = '';
        document.getElementById('form-title').textContent = 'Tambah Buku Baru';
        document.getElementById('input-cover-existing').value = '';
        document.getElementById('input-gallery-existing').value = '';
        switchSec('books');
        await loadBooks();
      } else {
        pbar(false);
        showToast('❌ ' + (res?.message || 'Gagal simpan buku'), 'error');
      }
    } catch (err) {
      pbar(false);
      showToast('❌ ' + err.message, 'error');
    } finally { restore(); }
  });

  document.getElementById('cancel-edit')?.addEventListener('click', () => {
    form.reset();
    document.getElementById('book-id').value = '';
    document.getElementById('form-title').textContent = 'Tambah Buku Baru';
    document.getElementById('cover-preview').innerHTML = '';
    document.getElementById('gallery-preview').innerHTML = '';
    document.getElementById('input-cover-existing').value = '';
    document.getElementById('input-gallery-existing').value = '';
    coverFile = null; galleryFiles = [];
  });
}

window.editBook = (id) => {
  const b = booksCache.find(x => String(x.id) === String(id));
  if (!b) { showToast('Buku tidak ditemukan', 'error'); return; }
  switchSec('add-book');
  document.getElementById('form-title').textContent = 'Edit: ' + b.title;
  document.getElementById('book-id').value = b.id;
  document.getElementById('input-title').value = b.title || '';
  document.getElementById('input-slug').value = b.slug || '';
  document.getElementById('input-short').value = b.short_desc || '';
  document.getElementById('input-category').value = b.category || '';
  document.getElementById('input-price').value = b.price || 0;
  document.getElementById('input-cover-existing').value = b.cover_url || '';
  document.getElementById('input-gallery-existing').value = JSON.stringify(b.gallery || []);
  document.getElementById('input-synopsis').value = b.synopsis || '';
  document.getElementById('input-author').value = b.specs?.author || '';
  document.getElementById('input-dimension').value = b.specs?.dimension || '';
  document.getElementById('input-pages').value = b.specs?.pages || '';
  document.getElementById('input-isbn').value = b.specs?.isbn || '';
  document.getElementById('input-year').value = b.specs?.year || '';
  document.getElementById('input-features').value = (b.features || []).join('\n');
  document.getElementById('input-order').value = b.order_link || '';
  document.getElementById('input-status').value = b.status || 'aktif';
  document.getElementById('cover-preview').innerHTML = `<img ${safeImgAttr(b.cover_url, 'https://via.placeholder.com/300x400')} class="w-full h-48 object-cover rounded-xl">`;
  document.getElementById('gallery-preview').innerHTML = (b.gallery || []).map(u => `<img ${safeImgAttr(u, 'https://via.placeholder.com/80x112')} class="w-20 h-28 object-cover rounded-lg">`).join('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteBookConfirm = async (id) => {
  if (!confirm('Hapus buku ini?')) return;
  pbar(true);
  try {
    const res = await deleteBook(id);
    pbar(false);
    if (res && res.success) { showToast('Buku dihapus', 'success'); await loadBooks(); }
    else showToast('❌ ' + (res?.message || 'Gagal'), 'error');
  } catch (e) { pbar(false); showToast('❌ ' + e.message, 'error'); }
};

// ============ SETTINGS ============
async function loadSettings() {
  try {
    const s = await getSettings();
    const f = document.getElementById('settings-form');
    if (!f) return;
    f.querySelector('[name="logo_text"]').value = s.logo_text || '';
    f.querySelector('[name="logo_url"]').value = s.logo_url || '';
    f.querySelector('[name="default_order_link"]').value = s.default_order_link || '';
    f.querySelector('[name="author_name"]').value = s.author_name || '';
    f.querySelector('[name="author_bio"]').value = s.author_bio || '';
    applyBranding(s);
    authorPhotos.urls = Array.isArray(s.author_photos) ? s.author_photos.slice(0,3) : [];
    authorPhotos.ids = Array.isArray(s.author_photo_ids) ? s.author_photo_ids.slice(0,3) : [];
    renderAuthorPhotos(authorPhotos.urls);
  } catch (e) { console.warn('loadSettings:', e); }
}

function bindSettingsForm() {
  const f = document.getElementById('settings-form');
  if (!f || f.dataset.bound === '1') return;
  f.dataset.bound = '1';
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button[type="submit"]');
    const restore = btnLoad(btn, 'Menyimpan...');
    pbar(true);
    try {
      const data = {
        logo_text: f.querySelector('[name="logo_text"]').value,
        logo_url: f.querySelector('[name="logo_url"]').value,
        default_order_link: f.querySelector('[name="default_order_link"]').value,
        author_name: f.querySelector('[name="author_name"]').value,
        author_bio: f.querySelector('[name="author_bio"]').value
      };
      const res = await saveSettings(data);
      pbar(false);
      if (res && res.success) { showToast('✅ Pengaturan tersimpan', 'success'); applyBranding(data); }
      else showToast('❌ ' + (res?.message || 'Gagal'), 'error');
    } catch (err) { pbar(false); showToast('❌ ' + err.message, 'error'); }
    finally { restore(); }
  });
}

// ============ AUTHOR PHOTOS ============
let authorPhotos = { urls: [], ids: [] };

function renderAuthorPhotos(urls) {
  const c = document.getElementById('author-photos-preview');
  if (!c) return;
  const list = (urls || []).map(u => normalizeDriveUrl(u) || u).filter(Boolean);
  if (!list.length) { c.innerHTML = '<p class="text-xs opacity-50">Belum ada foto (maks 3).</p>'; return; }
  c.innerHTML = list.map((u, i) => `
    <div class="relative group">
      <img ${safeImgAttr(u, 'https://via.placeholder.com/96')} class="w-24 h-24 object-cover rounded-xl border border-white/10">
      <button type="button" onclick="window.removeAuthorPhoto(${i})" class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-lg">×</button>
      <span class="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">Foto ${i+1}</span>
    </div>`).join('');
}

window.removeAuthorPhoto = async (i) => {
  if (!confirm('Hapus foto ini?')) return;
  const urls = [...authorPhotos.urls]; const ids = [...authorPhotos.ids];
  urls.splice(i, 1); ids.splice(i, 1);
  authorPhotos.urls = urls; authorPhotos.ids = ids;
  renderAuthorPhotos(urls);
  pbar(true);
  try {
    const res = await saveSettings({ author_photos: urls, author_photo_ids: ids });
    pbar(false);
    res?.success ? showToast('Foto dihapus', 'success') : showToast('❌ Gagal', 'error');
  } catch (e) { pbar(false); showToast('❌ ' + e.message, 'error'); }
};

function bindAuthorPhotos() {
  const sec = document.getElementById('section-settings');
  if (!sec || document.getElementById('author-photos-form')) return;
  sec.insertAdjacentHTML('beforeend', `
    <div id="author-photos-form" class="mt-6 max-w-xl rounded-[20px] bg-white/5 border border-white/10 p-6">
      <h3 class="font-bold text-sm mb-2">Foto Penulis (Maks 3)</h3>
      <p class="text-xs opacity-60 mb-4">Tampil di tab Biografi halaman detail buku.</p>
      <div id="author-photos-preview" class="flex flex-wrap gap-3 mb-4"></div>
      <input id="author-photos-input" type="file" accept="image/*" multiple class="block w-full text-xs opacity-70 mb-3">
      <button type="button" id="author-photos-upload-btn" class="w-full h-11 rounded-full bg-[#B5C58C] text-[#2D3A27] font-bold text-sm">Upload Foto</button>
    </div>`);
  const input = document.getElementById('author-photos-input');
  const btn = document.getElementById('author-photos-upload-btn');

  btn?.addEventListener('click', async () => {
    const files = Array.from(input.files || []);
    if (!files.length) { showToast('Pilih file dulu', 'warning'); return; }
    const remaining = 3 - authorPhotos.urls.length;
    if (remaining <= 0) { showToast('Maks 3 foto. Hapus salah satu.', 'warning'); return; }
    const toUp = files.slice(0, remaining);
    const restore = btnLoad(btn, 'Upload...');
    pbar(true);
    try {
      const newUrls = [...authorPhotos.urls];
      const newIds = [...authorPhotos.ids];
      for (let i = 0; i < toUp.length; i++) {
        btn.innerHTML = `<span class="spinner"></span> Upload ${i+1}/${toUp.length}...`;
        const up = await uploadImageToDrive(toUp[i]);
        if (up.success) { newUrls.push(up.url); if (up.fileId) newIds.push(up.fileId); }
      }
      authorPhotos.urls = newUrls.slice(0, 3);
      authorPhotos.ids = newIds.slice(0, 3);
      const res = await saveSettings({ author_photos: authorPhotos.urls, author_photo_ids: authorPhotos.ids });
      pbar(false);
      if (res?.success) { showToast('✅ Foto tersimpan', 'success'); input.value = ''; renderAuthorPhotos(authorPhotos.urls); }
      else showToast('❌ ' + (res?.message || 'Gagal'), 'error');
    } catch (e) { pbar(false); showToast('❌ ' + e.message, 'error'); }
    finally { restore(); }
  });
}

// ============ SOCIALS ============
const PLATFORMS = [
  { value:'whatsapp', label:'WhatsApp', ph:'https://wa.me/628xxx' },
  { value:'instagram', label:'Instagram', ph:'https://instagram.com/username' },
  { value:'youtube', label:'YouTube', ph:'https://youtube.com/@channel' },
  { value:'facebook', label:'Facebook', ph:'https://facebook.com/page' },
  { value:'twitter', label:'Twitter / X', ph:'https://x.com/username' },
  { value:'tiktok', label:'TikTok', ph:'https://tiktok.com/@username' },
  { value:'telegram', label:'Telegram', ph:'https://t.me/username' },
  { value:'linkedin', label:'LinkedIn', ph:'https://linkedin.com/in/username' },
  { value:'email', label:'Email', ph:'mailto:email@domain.com' },
  { value:'website', label:'Website', ph:'https://domain.com' }
];

function svgIcon(icon, size = 20) {
  const i = (icon || '').toLowerCase();
  const map = {
    whatsapp: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`,
    instagram: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>`,
    youtube: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    facebook: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    twitter: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    tiktok: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
    telegram: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
    linkedin: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    email: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    website: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
  };
  return map[i] || `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
}

async function loadSocials() {
  const c = document.getElementById('socials-list');
  if (!c) return;
  c.innerHTML = '<div class="skeleton-row"></div>';
  try {
    let list = [];
    try { list = await getAllSocialLinks(); } catch (_) { try { list = await getSocialLinks(); } catch (_) { list = []; } }
    socialsCache = Array.isArray(list) ? list : [];
    if (!socialsCache.length) { c.innerHTML = '<p class="text-sm opacity-60 text-center py-6">Belum ada media sosial.</p>'; return; }
    c.innerHTML = socialsCache.map(s => `
      <div class="flex gap-2 items-center p-3 rounded-xl bg-white/5 border border-white/10">
        <span class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#B5C58C]">${svgIcon(s.icon || s.platform, 18)}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold">${esc(s.platform)}</p>
          <p class="text-xs opacity-60 truncate">${esc(s.url)}</p>
        </div>
        <button type="button" onclick="window.editSocial('${esc(s.platform).replace(/'/g, "\\'")}')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-[#B5C58C] hover:text-[#2D3A27] flex items-center justify-center transition" title="Edit"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
        <button type="button" onclick="window.deleteSocialConfirm('${esc(s.platform).replace(/'/g, "\\'")}')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition" title="Hapus"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      </div>`).join('');
    icons();
  } catch (e) { c.innerHTML = `<p class="text-sm text-red-400">Gagal: ${esc(e.message)}</p>`; }
}

function bindSocialsForm() {
  const sec = document.getElementById('section-socials');
  if (!sec || document.getElementById('social-form')) return;
  sec.insertAdjacentHTML('beforeend', `
    <form id="social-form" class="mt-6 max-w-xl space-y-4 rounded-[20px] bg-white/5 border border-white/10 p-6">
      <h3 class="font-bold text-sm">Tambah / Edit Media Sosial</h3>
      <input type="hidden" id="social-original-platform">
      <div>
        <label class="text-xs opacity-60">Platform *</label>
        <select id="social-platform" required class="mt-1 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-sm">
          <option value="">-- Pilih --</option>
          ${PLATFORMS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-xs opacity-60">URL *</label>
        <input id="social-url" type="url" required placeholder="https://..." class="mt-1 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-sm">
      </div>
      <div class="flex gap-2">
        <button type="submit" class="flex-1 h-11 rounded-full bg-[#B5C58C] text-[#2D3A27] font-bold text-sm">Simpan</button>
        <button type="button" id="social-cancel" class="px-5 h-11 rounded-full bg-white/10 font-bold text-sm hidden">Batal</button>
      </div>
    </form>`);
  const f = document.getElementById('social-form');
  const sel = document.getElementById('social-platform');
  const url = document.getElementById('social-url');
  const orig = document.getElementById('social-original-platform');
  const cancel = document.getElementById('social-cancel');

  sel?.addEventListener('change', () => { const p = PLATFORMS.find(x => x.value === sel.value); if (p) url.placeholder = p.ph; });

  f?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button[type="submit"]');
    const restore = btnLoad(btn, 'Menyimpan...');
    pbar(true);
    const o = orig.value;
    const p = PLATFORMS.find(x => x.value === sel.value);
    if (!p) { pbar(false); restore(); showToast('❌ Pilih platform', 'error'); return; }
    const data = { platform: p.label, icon: p.value, url: url.value, active: true };
    try {
      if (o && o.toLowerCase() !== data.platform.toLowerCase()) await deleteSocial(o);
      const res = await saveSocial(data);
      pbar(false);
      if (res && res.success) { showToast('✅ Tersimpan', 'success'); f.reset(); orig.value = ''; cancel?.classList.add('hidden'); await loadSocials(); }
      else showToast('❌ ' + (res?.message || 'Gagal'), 'error');
    } catch (err) { pbar(false); showToast('❌ ' + err.message, 'error'); }
    finally { restore(); }
  });
  cancel?.addEventListener('click', () => { f.reset(); orig.value = ''; cancel.classList.add('hidden'); });
}

window.editSocial = function(name) {
  const f = document.getElementById('social-form');
  if (!f) return;
  const s = socialsCache.find(x => String(x.platform).toLowerCase() === String(name).toLowerCase());
  if (!s) { showToast('Data tidak ditemukan', 'error'); return; }
  const icon = (s.icon || '').toLowerCase();
  const sel = document.getElementById('social-platform');
  const url = document.getElementById('social-url');
  const orig = document.getElementById('social-original-platform');
  const cancel = document.getElementById('social-cancel');
  const p = PLATFORMS.find(x => x.value === icon) || PLATFORMS.find(x => x.label.toLowerCase() === String(s.platform).toLowerCase());
  if (p) { sel.value = p.value; url.placeholder = p.ph; }
  orig.value = s.platform; url.value = s.url || '';
  cancel?.classList.remove('hidden');
  f.scrollIntoView({ behavior:'smooth', block:'center' });
  f.classList.add('ring-2', 'ring-[#B5C58C]');
  setTimeout(() => f.classList.remove('ring-2', 'ring-[#B5C58C]'), 2000);
};

window.deleteSocialConfirm = async (name) => {
  if (!confirm(`Hapus "${name}"?`)) return;
  pbar(true);
  try {
    const res = await deleteSocial(name);
    pbar(false);
    if (res && res.success) { showToast('Dihapus', 'success'); await loadSocials(); }
    else showToast('❌ ' + (res?.message || 'Gagal'), 'error');
  } catch (e) { pbar(false); showToast('❌ ' + e.message, 'error'); }
};

function slugify(t) { return (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''); }