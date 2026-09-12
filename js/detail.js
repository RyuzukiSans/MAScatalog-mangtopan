// CatalogFouad - detail.js - FINAL v11.1
// FIX: sticky tab positioning, smart scroll on tab click, header height auto-detect
import { getBookBySlug, getBooks, getSettings, getSocialLinks, normalizeDriveUrl, getFallbackUrl } from './api.js';

let swiperInstance = null;

function icons() { try { if (window.lucide?.createIcons) lucide.createIcons(); } catch (_) {} }

function getSocialSVG(p) {
  const k = (p || '').toLowerCase();
  const s = {
    whatsapp: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
    instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>',
    youtube: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    twitter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    tiktok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    telegram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    linkedin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    email: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    website: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  };
  return s[k] || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
}

function safeImgAttr(url, placeholder = 'https://via.placeholder.com/300x400?text=No+Image') {
  const primary = normalizeDriveUrl(url);
  const fallback = getFallbackUrl(url);
  if (!primary) return `src="${placeholder}"`;
  return `src="${primary}" data-fallback="${fallback}" data-placeholder="${placeholder}" onerror="(function(img){var fb=img.dataset.fallback;var ph=img.dataset.placeholder;if(fb&&img.src!==fb){img.src=fb;}else{img.src=ph;img.onerror=null;}})(this)"`;
}

function setMeta(prop, content, isName = false) {
  if (!content) return;
  const attr = isName ? 'name' : 'property';
  let el = document.head.querySelector(`meta[${attr}="${prop}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function updateOG(book, settings) {
  const img = normalizeDriveUrl(book.cover_url) || '';
  setMeta('og:type', 'article');
  setMeta('og:title', book.title);
  setMeta('og:description', book.short_desc || settings?.author_name || '');
  setMeta('og:image', img);
  setMeta('og:url', window.location.href);
  setMeta('twitter:card', 'summary_large_image', true);
  setMeta('twitter:title', book.title, true);
  setMeta('twitter:description', book.short_desc || '', true);
  setMeta('twitter:image', img, true);
  document.title = `${book.title} - CatalogFouad`;
}

function applyBranding(s) {
  if (!s) return;
  const url = s.logo_url ? (normalizeDriveUrl(s.logo_url) || s.logo_url) : '';
  if (url) {
    const l = document.getElementById('dynamic-favicon') || document.querySelector("link[rel~='icon']");
    if (l) l.href = url;
  }
  const lt = document.getElementById('logo-text-detail');
  if (lt) lt.textContent = s.logo_text || 'CatalogFouad';
  const fi = document.getElementById('footer-logo-img-detail'), ff = document.getElementById('footer-logo-fallback-detail'), ft = document.getElementById('footer-logo-text-detail');
  if (url && fi) { fi.src = url; fi.classList.remove('hidden'); ff?.classList.add('hidden'); }
  if (ft) ft.textContent = s.logo_text || 'CatalogFouad';
}

// ============ STICKY TAB SETUP (v11.1) ============
/**
 * Auto-update CSS variable --header-h-mobile sesuai tinggi header actual
 * + monitoring stuck state untuk styling tambahan
 */
function setupStickyTabs() {
  const header = document.getElementById('detail-header');
  const tabs = document.getElementById('detail-tabs');
  if (!header || !tabs) return;

  // Update header height ke CSS variable
  function updateHeaderHeight() {
    const h = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h-mobile', h + 'px');
  }
  updateHeaderHeight();

  // Update on resize / orientation / font load
  window.addEventListener('resize', updateHeaderHeight);
  window.addEventListener('orientationchange', () => setTimeout(updateHeaderHeight, 200));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateHeaderHeight);
  setTimeout(updateHeaderHeight, 300);
  setTimeout(updateHeaderHeight, 1000);

  // Detect stuck state (untuk styling extra)
  function checkStuck() {
    if (window.innerWidth > 768) {
      tabs.classList.remove('is-stuck');
      return;
    }
    const headerH = header.getBoundingClientRect().height;
    const tabsRect = tabs.getBoundingClientRect();
    // Kalau posisi tab mentok di bawah header (stuck), tambah class
    if (Math.abs(tabsRect.top - headerH) < 2) {
      tabs.classList.add('is-stuck');
    } else {
      tabs.classList.remove('is-stuck');
    }
  }

  window.addEventListener('scroll', checkStuck, { passive: true });
  window.addEventListener('resize', checkStuck);
  checkStuck();
}

/**
 * Smart scroll ke tab: kalau tab baru ada di bawah posisi viewport sekarang,
 * atau tab di atas, kita scroll supaya tab tetap terlihat di bawah header.
 */
function smartScrollToTabs() {
  const header = document.getElementById('detail-header');
  const tabs = document.getElementById('detail-tabs');
  if (!header || !tabs) return;

  // Hanya di mobile
  if (window.innerWidth > 768) return;

  const headerH = header.getBoundingClientRect().height;
  const tabsRect = tabs.getBoundingClientRect();
  const tabsTopDoc = tabsRect.top + window.scrollY;

  // Target: tab tepat di bawah header dengan sedikit margin
  const target = tabsTopDoc - headerH - 4;

  // Kalau tab terlalu jauh di bawah viewport (scroll ke atas), atau di atas (scroll ke bawah sedikit)
  const currentScroll = window.scrollY;
  if (Math.abs(currentScroll - target) > 20) {
    window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }
}

// ============ BOOT ============
document.addEventListener('DOMContentLoaded', async () => {
  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) { window.location.href = 'index.html'; return; }
  await loadDetail(slug);
  bindTabs();
  bindShare();
  setupStickyTabs();
});

async function loadDetail(slug) {
  try {
    showSkeleton(true);
    const [books, settings, socials] = await Promise.all([
      getBooks().catch(() => []),
      getSettings().catch(() => null),
      getSocialLinks().catch(() => [])
    ]);
    const book = books.find(b => b.slug === slug) || null;

    if (!book) {
      document.getElementById('detail-content').innerHTML = `
        <div class="min-h-[60vh] flex items-center justify-center px-4">
          <div class="text-center glass rounded-[24px] p-10 max-w-md">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[#C9D6BF] flex items-center justify-center"><i data-lucide="book-x" class="w-7 h-7 text-[#2D3A27]"></i></div>
            <h2 class="text-xl font-bold">Buku tidak ditemukan</h2>
            <p class="text-sm opacity-60 mt-2">Slug: ${slug}</p>
            <a href="index.html" class="mt-5 inline-block px-6 py-3 bg-[#2D3A27] text-white rounded-full font-bold text-sm">Kembali</a>
          </div>
        </div>`;
      showSkeleton(false);
      document.getElementById('detail-content').classList.remove('hidden');
      icons(); return;
    }

    updateOG(book, settings);
    applyBranding(settings);
    renderSwiper(book.gallery || [book.cover_url]);

    document.getElementById('book-category').textContent = book.category;
    document.getElementById('book-title').textContent = book.title;
    document.getElementById('book-short').textContent = book.short_desc;
    document.getElementById('book-price').textContent = `Rp ${new Intl.NumberFormat('id-ID').format(book.price || 0)}`;

    const orderLink = book.order_link || (settings && settings.default_order_link) || '#';
    const ob = document.getElementById('order-btn'); if (ob) ob.href = orderLink;
    const obm = document.getElementById('order-btn-mobile'); if (obm) obm.href = orderLink;
    const opm = document.getElementById('order-price-mobile'); if (opm) opm.textContent = `Rp ${new Intl.NumberFormat('id-ID').format(book.price || 0)}`;

    document.getElementById('tab-synopsis').innerHTML = fmt(book.synopsis);
    document.getElementById('tab-specs').innerHTML = `
      <div class="space-y-4">
        <div class="flex justify-between items-center py-3 border-b border-[#C9D6BF]/50 flex-wrap gap-2">
          <span class="text-sm opacity-60">Penulis</span>
          <span class="text-sm font-bold flex items-center gap-2">${book.specs?.author || '-'} <button onclick="switchTab('bio')" class="px-3 py-1 rounded-full bg-[#B5C58C] text-[11px] font-bold">Biografi</button></span>
        </div>
        <div class="flex justify-between py-3 border-b border-[#C9D6BF]/50"><span class="text-sm opacity-60">Dimensi</span><span class="text-sm font-medium">${book.specs?.dimension || '-'}</span></div>
        <div class="flex justify-between py-3 border-b border-[#C9D6BF]/50"><span class="text-sm opacity-60">Halaman</span><span class="text-sm font-medium">${book.specs?.pages || '-'}</span></div>
        <div class="flex justify-between py-3 border-b border-[#C9D6BF]/50"><span class="text-sm opacity-60">ISBN</span><span class="text-sm font-medium">${book.specs?.isbn || '-'}</span></div>
        <div class="flex justify-between py-3"><span class="text-sm opacity-60">Tahun Terbit</span><span class="text-sm font-medium">${book.specs?.year || '-'}</span></div>
      </div>`;
    document.getElementById('tab-features').innerHTML = `
      <ul class="space-y-3">
        ${(book.features || []).map(f => `<li class="flex gap-3 items-start glass rounded-xl p-3"><span class="mt-0.5 w-6 h-6 rounded-full bg-[#2D3A27] text-white flex items-center justify-center flex-shrink-0"><i data-lucide="check" class="w-3.5 h-3.5"></i></span><span class="text-sm leading-relaxed">${f}</span></li>`).join('')}
      </ul>`;

    const photos = Array.isArray(settings?.author_photos) ? settings.author_photos.slice(0, 3) : [];
    const photosHTML = photos.length ? `
      <div class="photo-dynamic-grid mb-6">
        ${photos.map((p, i) => `
          <div class="photo-dynamic-item">
            <img ${safeImgAttr(p, 'https://via.placeholder.com/300x400?text=Foto')} alt="Foto Penulis ${i+1}" loading="lazy">
          </div>
        `).join('')}
      </div>
    ` : '';

    document.getElementById('tab-bio').innerHTML = `
      ${photosHTML}
      <div class="prose prose-sm max-w-none leading-relaxed">${fmt(settings?.author_bio)}</div>
      <div class="mt-6 p-4 rounded-2xl bg-[#F4F6F0] border border-[#C9D6BF]">
        <p class="text-sm font-bold">${settings?.author_name || ''}</p>
        <p class="text-xs opacity-70 mt-1">Alumni Daar El-Huda, Ma'had Aly Tebuireng, S1/S2 Al-Azhar Mesir Cumlaude 2025</p>
      </div>`;

    const recs = books.filter(b => b.slug !== book.slug).slice(0, 4);
    renderRecs(recs);

    const sc = document.getElementById('footer-socials-detail');
    if (sc) {
      if (!socials || !socials.length) sc.innerHTML = '<span class="text-xs opacity-50">-</span>';
      else sc.innerHTML = socials.map(s => `<a href="${s.url}" target="_blank" rel="noopener" class="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-[#2D3A27] hover:text-white transition" title="${s.platform}">${getSocialSVG(s.icon || s.platform)}</a>`).join('');
    }

    icons();
    showSkeleton(false);

    // Update header height setelah konten render
    setTimeout(() => {
      const h = document.getElementById('detail-header');
      if (h) {
        const height = Math.ceil(h.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--header-h-mobile', height + 'px');
      }
    }, 100);
  } catch (e) {
    console.error(e);
    showSkeleton(false);
    const dc = document.getElementById('detail-content');
    dc.innerHTML = `<div class="p-8 glass rounded-[24px] text-center mx-4"><h3 class="font-bold">Gagal load detail</h3><p class="text-sm opacity-70 mt-2 break-words">${e.message}</p><a href="index.html" class="mt-4 inline-block px-6 py-2 bg-[#2D3A27] text-white rounded-full text-sm font-bold">Kembali</a></div>`;
    dc.classList.remove('hidden');
    icons();
  }
}

function renderSwiper(gallery) {
  const w = document.getElementById('swiper-wrapper');
  if (!w) return;
  if (!gallery || !gallery.length) gallery = ['https://via.placeholder.com/800x1000?text=No+Image'];
  gallery = gallery.map(normalizeDriveUrl).filter(Boolean);
  if (!gallery.length) gallery = ['https://via.placeholder.com/800x1000?text=No+Image'];

  const labels = gallery.map((_, i) => i === 0 ? 'Cover Depan' : (i === gallery.length - 1 && gallery.length > 1 ? 'Cover Belakang' : `Sampel Isi ${i}`));

  w.innerHTML = gallery.map((img, i) => {
    const fallback = getFallbackUrl(img);
    return `
    <div class="swiper-slide">
      <div class="book-ratio w-full overflow-hidden rounded-[24px] bg-[#F4F6F0] relative">
        <img src="${img}" 
             data-fallback="${fallback}" 
             data-placeholder="https://via.placeholder.com/800x1000?text=No+Image"
             alt="Preview ${i+1}" 
             class="w-full h-full object-cover absolute inset-0"
             onerror="(function(img){var fb=img.dataset.fallback;var ph=img.dataset.placeholder;if(fb&&img.src!==fb){img.src=fb;}else{img.src=ph;img.onerror=null;}})(this)">
        <div class="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black/40 backdrop-blur text-white text-[11px] font-medium z-10">${labels[i]}</div>
      </div>
    </div>`;
  }).join('');

  if (window.Swiper) {
    if (swiperInstance) { try { swiperInstance.destroy(); } catch (_) {} }
    const loop = gallery.length > 1;
    swiperInstance = new Swiper('.mySwiper', {
      slidesPerView: 1, spaceBetween: 16, loop,
      autoplay: loop ? { delay: 4000, disableOnInteraction: false } : false,
      pagination: { el: '.swiper-pagination', clickable: true },
      grabCursor: true, observer: true, observeParents: true,
      touchReleaseOnEdges: true,
      resistanceRatio: 0.85,
      preloadImages: true,
      updateOnImagesReady: true,
      lazy: false
    });
  }
}

function bindTabs() {
  document.querySelectorAll('#detail-tabs [data-tab]').forEach(b => {
    b.addEventListener('click', () => {
      switchTab(b.dataset.tab);
      // Smart scroll: pastikan tab tetap di bawah header
      setTimeout(smartScrollToTabs, 100);
    });
  });
}

function bindShare() {
  const btn = document.getElementById('share-btn');
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.addEventListener('click', async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        const ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i> <span>Tersalin!</span>';
      btn.classList.add('bg-[#B5C58C]', 'text-[#2D3A27]');
      icons();
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('bg-[#B5C58C]', 'text-[#2D3A27]'); icons(); }, 2000);
    } catch (_) { alert('Link: ' + url); }
  });
}

window.switchTab = (t) => {
  document.querySelectorAll('#detail-tabs [data-tab]').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  const b = document.querySelector(`#detail-tabs [data-tab="${t}"]`);
  const p = document.getElementById(`tab-${t}`);
  if (b) b.classList.add('active');
  if (p) { p.classList.remove('hidden'); p.classList.add('fade-in-up'); }
  icons();
};

function fmt(text) {
  if (!text) return '<p class="opacity-60">Belum ada konten.</p>';
  return text.split(/\n\n+/).map(p => `<p class="mb-4 leading-relaxed">${p.trim().replace(/\n/g, '<br>')}</p>`).join('');
}

function renderRecs(books) {
  const c = document.getElementById('recommendation-grid');
  if (!c) return;
  if (!books.length) { document.getElementById('recommendation-section')?.classList.add('hidden'); return; }
  c.innerHTML = books.map(b => `
    <a href="detail.html?slug=${encodeURIComponent(b.slug)}" class="glass-card rounded-[16px] overflow-hidden">
      <div class="aspect-[3/4] bg-[#F4F6F0] overflow-hidden"><img ${safeImgAttr(b.cover_url, 'https://via.placeholder.com/300x400?text=No+Image')} loading="lazy" class="w-full h-full object-cover"></div>
      <div class="p-3"><h4 class="text-[13px] font-bold line-clamp-2 leading-tight">${b.title}</h4><p class="text-[12px] font-bold mt-1">Rp ${new Intl.NumberFormat('id-ID').format(b.price || 0)}</p></div>
    </a>`).join('');
}

function showSkeleton(show) {
  document.getElementById('detail-skeleton')?.classList.toggle('hidden', !show);
  document.getElementById('detail-content')?.classList.toggle('hidden', show);
}