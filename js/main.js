// CatalogFouad - main.js - FINAL v11
import { getBooks, getSettings, getSocialLinks, getCategories, normalizeDriveUrl, getFallbackUrl, prewarmGAS } from './api.js';

let allBooks = [], filteredBooks = [], activeCategory = 'Semua', searchQuery = '';
const els = {};

function icons() { try { if (window.lucide?.createIcons) lucide.createIcons(); } catch (_) {} }

export function getSocialSVG(p) {
  const k = (p || '').toLowerCase();
  const s = {
    whatsapp: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
    instagram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>',
    youtube: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    facebook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    twitter: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    tiktok: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    telegram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    linkedin: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    email: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    website: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  };
  return s[k] || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
}

function applyBranding(s) {
  if (!s) return;
  const url = s.logo_url ? (normalizeDriveUrl(s.logo_url) || s.logo_url) : '';
  const txt = s.logo_text || 'CatalogFouad';
  if (url) {
    let l = document.getElementById('dynamic-favicon') || document.querySelector("link[rel~='icon']");
    if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
    l.href = url;
  }
  const li = document.getElementById('logo-img'), lf = document.getElementById('logo-fallback'), lt = document.getElementById('logo-text');
  if (url && li) { li.src = url; li.classList.remove('hidden'); lf?.classList.add('hidden'); }
  if (lt) lt.textContent = txt;

  const fi = document.getElementById('footer-logo-img'), ff = document.getElementById('footer-logo-fallback'), ft = document.getElementById('footer-logo-text');
  if (url && fi) { fi.src = url; fi.classList.remove('hidden'); ff?.classList.add('hidden'); }
  if (ft) ft.textContent = txt;
}

/**
 * FIX v11: Safe image — kalau lh3 gagal, fallback ke thumbnail, kalau masih gagal → placeholder
 */
function safeImg(url, placeholder = 'https://via.placeholder.com/300x400?text=Loading') {
  const primary = normalizeDriveUrl(url);
  const fallback = getFallbackUrl(url);
  if (!primary) return placeholder;
  
  // Data attribute untuk track percobaan
  return `src="${primary}" data-fallback="${fallback}" data-placeholder="${placeholder}" onerror="(function(img){var fb=img.dataset.fallback;var ph=img.dataset.placeholder;if(fb&&img.src!==fb){img.src=fb;}else{img.src=ph;img.onerror=null;}})(this)"`;
}

prewarmGAS();

document.addEventListener('DOMContentLoaded', async () => {
  els.grid = document.getElementById('catalog-grid');
  els.search = document.getElementById('search-input');
  els.searchDesktop = document.getElementById('search-input-desktop');
  els.searchWrap = document.getElementById('mobile-search-wrap');
  els.categoryContainer = document.getElementById('category-pills');
  els.count = document.getElementById('book-count');
  els.loading = document.getElementById('loading-grid');
  els.empty = document.getElementById('empty-state');

  const onSearch = (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    if (els.search) els.search.value = e.target.value;
    if (els.searchDesktop) els.searchDesktop.value = e.target.value;
    applyFilters();
  };
  els.search?.addEventListener('input', onSearch);
  els.searchDesktop?.addEventListener('input', onSearch);

  const st = document.getElementById('mobile-search-toggle');
  const sc = document.getElementById('mobile-search-close');
  st?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!els.searchWrap) return;
    if (!els.searchWrap.classList.contains('hidden')) closeMobileSearch();
    else { els.searchWrap.classList.remove('hidden'); els.searchWrap.classList.add('fade-in-up'); setTimeout(() => els.search?.focus(), 100); }
  });
  sc?.addEventListener('click', (e) => { e.stopPropagation(); closeMobileSearch(); });
  document.addEventListener('click', (e) => {
    if (!els.searchWrap || els.searchWrap.classList.contains('hidden')) return;
    if (els.searchWrap.contains(e.target) || st?.contains(e.target)) return;
    closeMobileSearch();
  });
  window.addEventListener('scroll', () => {
    if (!els.searchWrap || els.searchWrap.classList.contains('hidden')) return;
    if (window.scrollY > 60) closeMobileSearch();
  }, { passive: true });

  await loadInitial();
});

function closeMobileSearch() {
  if (!els.searchWrap) return;
  els.searchWrap.style.transition = 'opacity 0.2s, transform 0.2s';
  els.searchWrap.style.opacity = '0';
  els.searchWrap.style.transform = 'translateY(-6px)';
  setTimeout(() => {
    els.searchWrap.classList.add('hidden');
    els.searchWrap.style.opacity = '';
    els.searchWrap.style.transform = '';
  }, 200);
}

async function loadInitial() {
  try {
    showLoading(true);
    const [books, settings, socials] = await Promise.all([
      getBooks().catch(() => []),
      getSettings().catch(() => null),
      getSocialLinks().catch(() => [])
    ]);
    allBooks = Array.isArray(books) ? books : [];
    filteredBooks = [...allBooks];
    if (settings) applyBranding(settings);
    const cats = await getCategories(allBooks);
    renderCats(cats);
    renderBooks(filteredBooks);
    renderFooterSocials(socials);
  } catch (err) {
    const e = document.getElementById('empty-state');
    if (e) {
      e.classList.remove('hidden');
      e.innerHTML = `<div class="col-span-2 md:col-span-4 glass rounded-[24px] p-8 text-center mx-auto max-w-lg">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl font-bold">!</div>
        <h3 class="font-bold text-lg">Gagal memuat katalog</h3>
        <p class="text-sm opacity-70 mt-2 break-words">${err.message}</p>
        <button onclick="location.reload()" class="mt-4 px-6 py-2.5 bg-[#2D3A27] text-white rounded-full text-sm font-bold">Coba Lagi</button>
      </div>`;
    }
    if (els.grid) els.grid.innerHTML = '';
  } finally {
    showLoading(false);
    icons();
  }
}

function renderCats(cats) {
  if (!els.categoryContainer) return;
  els.categoryContainer.innerHTML = cats.map(c => `<button data-category="${c}" class="category-pill px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[13px] md:text-sm font-medium whitespace-nowrap ${activeCategory === c ? 'active' : ''}">${c}</button>`).join('');
  els.categoryContainer.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      activeCategory = b.dataset.category;
      els.categoryContainer.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      applyFilters();
    });
  });
}

function applyFilters() {
  filteredBooks = allBooks.filter(b => {
    const mc = activeCategory === 'Semua' || b.category === activeCategory;
    const ms = !searchQuery || (b.title || '').toLowerCase().includes(searchQuery) || (b.specs?.author || '').toLowerCase().includes(searchQuery) || (b.short_desc || '').toLowerCase().includes(searchQuery) || (b.category || '').toLowerCase().includes(searchQuery);
    return mc && ms;
  });
  renderBooks(filteredBooks);
}

function renderBooks(books) {
  if (!els.grid) return;
  if (els.count) els.count.textContent = books.length + ' buku';
  if (!books.length) {
    els.grid.innerHTML = '';
    if (els.empty) {
      els.empty.classList.remove('hidden');
      els.empty.innerHTML = `<div class="col-span-2 md:col-span-4 text-center py-16 glass rounded-[24px] p-8 mx-auto max-w-lg">
        <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-[#C9D6BF] flex items-center justify-center"><i data-lucide="search-x" class="w-8 h-8 text-[#2D3A27]"></i></div>
        <h3 class="font-bold text-lg">Tidak ada buku</h3>
        <p class="text-sm opacity-70 mt-2">Coba kata kunci lain</p>
      </div>`;
      icons();
    }
    return;
  }
  els.empty?.classList.add('hidden');
  els.grid.innerHTML = books.map(b => `
    <a href="detail.html?slug=${encodeURIComponent(b.slug)}" class="glass-card group rounded-[16px] md:rounded-[20px] overflow-hidden flex flex-col">
      <div class="relative aspect-[3/4] overflow-hidden bg-[#F4F6F0]">
        <img ${safeImg(b.cover_url, 'https://via.placeholder.com/300x400?text=No+Image')} alt="${b.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        <div class="absolute top-2 left-2 md:top-3 md:left-3"><span class="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[11px] font-bold tracking-wide bg-white/90 backdrop-blur text-[#2D3A27] border border-white/50">${(b.category || '').toUpperCase()}</span></div>
      </div>
      <div class="p-3 md:p-4 flex flex-col flex-1">
        <h3 class="font-bold text-[12.5px] md:text-[15px] leading-[1.3] line-clamp-2 min-h-[34px] md:min-h-[40px]">${b.title}</h3>
        <p class="text-[10.5px] md:text-[12px] opacity-60 mt-1 line-clamp-2 leading-snug">${b.short_desc || ''}</p>
        <div class="mt-auto pt-2.5 md:pt-3 flex items-center justify-between">
          <span class="font-extrabold text-[12.5px] md:text-[15px] text-[#2D3A27]">Rp ${new Intl.NumberFormat('id-ID').format(b.price || 0)}</span>
          <span class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#2D3A27] text-white flex items-center justify-center group-hover:bg-[#B5C58C] group-hover:text-[#2D3A27] transition-colors"><i data-lucide="arrow-up-right" class="w-3 h-3 md:w-4 md:h-4"></i></span>
        </div>
      </div>
    </a>
  `).join('');
  icons();
}

function showLoading(show) {
  if (els.loading) els.loading.classList.toggle('hidden', !show);
  if (els.grid) els.grid.classList.toggle('hidden', show);
}

function renderFooterSocials(soc) {
  const c = document.getElementById('footer-socials');
  if (!c) return;
  if (!soc || !soc.length) { c.innerHTML = '<span class="text-xs opacity-50">Belum ada tautan sosial</span>'; return; }
  c.innerHTML = soc.map(s => `<a href="${s.url}" target="_blank" rel="noopener" class="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-[#2D3A27] hover:text-white transition-colors" title="${s.platform}">${getSocialSVG(s.icon || s.platform)}</a>`).join('');
}

window.clearSearch = () => {
  if (els.search) { els.search.value = ''; searchQuery = ''; if (els.searchDesktop) els.searchDesktop.value = ''; applyFilters(); }
};