/**
 * CatalogFouad - Google Apps Script Backend - FINAL v9
 * 
 * KUNCI SUKSES:
 * 1. WAJIB jalankan setupSheets() SEKALI
 * 2. WAJIB Deploy > New Version setiap kali Code.gs berubah
 * 3. WAJIB akses: "Anyone" (bukan "Anyone with Google account")
 * 4. Execute as: "Me"
 * 
 * ENDPOINT: /exec
 * Actions: ping, getAll, getAllBooks, getSettings, getSocial, login,
 *          addBook, updateBook, deleteBook, uploadImage,
 *          saveSocial, deleteSocial, saveSettings, checkDrive, setup
 */

// ================== CONFIG ==================
const SPREADSHEET_ID = '1RJbOeqwQVZxt1W6yaFAK25dkmosVdSWukmL2Ss1eazc';
const DRIVE_FOLDER_ID = '1EICn42hAnuAkhIPxsMlyV93K2Jjx3G1E';

const SHEETS = {
  BOOKS: 'Books',
  SETTINGS: 'Settings',
  SOCIAL: 'SocialLinks',
  EDITORS: 'Editors'
};

const HEADERS = {
  Books: ['id','slug','title','short_desc','category','price','cover_url','gallery','synopsis','specs','features','order_link','status','created_at','cover_fileId','gallery_fileIds'],
  Settings: ['key','value'],
  SocialLinks: ['platform','icon','url','active'],
  Editors: ['username','password','role','name']
};

const CACHE_SECONDS = 60;

// ================== ENTRY ==================
function doGet(e)  { return handle(e, 'GET');  }
function doPost(e) { return handle(e, 'POST'); }

function handle(e, method) {
  try {
    const params = collectParams(e);
    const action = String(params.action || 'getAll');

    let result;
    switch (action) {
      case 'ping':
        result = { success: true, message: 'pong', v: 11, ts: new Date().toISOString() };
        break;

      case 'getAll':
      case 'getAllData':
        result = getAllData();
        break;

      case 'getBooks':
      case 'getAllBooks':
        result = { success: true, books: readBooks() };
        break;

      case 'getSettings':
        result = { success: true, settings: readSettings() };
        break;

      case 'getSocial':
      case 'getSocialLinks':
        result = { success: true, links: readSocial() };
        break;

      case 'getAllSocial':
      case 'getAllSocialLinks':
        result = { success: true, links: readSocial(true) };
        break;

      case 'login':
        result = doLogin(params.username, params.password);
        break;

      case 'addBook':
        result = writeAddBook(safeJSON(params.bookData));
        bumpCache();
        break;

      case 'updateBook':
        result = writeUpdateBook(params.id, safeJSON(params.bookData));
        bumpCache();
        break;

      case 'deleteBook':
        result = writeDeleteBook(params.id);
        bumpCache();
        break;

      case 'uploadImage':
        result = doUpload(params.fileName, params.mimeType, params.base64Data, params.oldFileId);
        break;

      case 'saveSocial':
        result = writeSocial(safeJSON(params.social));
        bumpCache();
        break;

      case 'deleteSocial':
        result = removeSocial(params.platform);
        bumpCache();
        break;

      case 'saveSettings':
        result = writeSettings(safeJSON(params.settings));
        bumpCache();
        break;

      case 'checkDrive':
        result = checkDrive();
        break;

      case 'setup':
        result = { success: true, message: setupSheets() };
        break;

      case 'repairSharing':
        result = repairSharing();
        break;

      default:
        result = { success: false, message: 'Unknown action: ' + action };
    }

    return json(result);
  } catch (err) {
    Logger.log('handle error: ' + err + '\n' + (err.stack || ''));
    return json({ success: false, message: err.toString() });
  }
}

// ================== HELPERS ==================
function collectParams(e) {
  const out = {};
  if (e && e.parameter) Object.assign(out, e.parameter);
  if (e && e.postData && e.postData.contents) {
    const raw = e.postData.contents;
    try {
      const j = JSON.parse(raw);
      if (j && typeof j === 'object') Object.assign(out, j);
    } catch (_) {
      try {
        raw.split('&').forEach(kv => {
          const [k, v] = kv.split('=');
          if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
      } catch (_) {}
    }
  }
  return out;
}

function safeJSON(v) {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('{') || s.startsWith('[')) {
      try { return JSON.parse(s); } catch (_) { return v; }
    }
  }
  return v;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function bumpCache() {
  try { CacheService.getScriptCache().remove('catalog_all_v11'); } catch (_) {}
}

/**
 * FIX v11: Generate URL gambar paling reliable — lh3.googleusercontent.com
 * Format ini TIDAK butuh login, work di <img> tag, tidak kena rate-limit seperti uc?export
 */
function driveUrl(fileId) {
  if (!fileId) return '';
  // lh3.googleusercontent.com adalah CDN Google yang paling cepat & reliable
  return 'https://lh3.googleusercontent.com/d/' + fileId + '=w1600';
}

// ================== SPREADSHEET ==================
function ss() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.includes('REPLACE'))
    throw new Error('SPREADSHEET_ID belum diisi di Code.gs');
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function sheet(name) {
  const s = ss();
  let sh = s.getSheetByName(name);
  if (!sh) {
    sh = s.insertSheet(name);
    const h = HEADERS[name];
    if (h && h.length) sh.appendRow(h);
  }
  return sh;
}

function rows(sh) {
  try {
    const v = sh.getDataRange().getValues();
    if (v.length < 2) return [];
    const h = v[0].map(x => String(x).trim());
    return v.slice(1)
      .filter(r => r.some(c => c !== '' && c !== null))
      .map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; });
  } catch (e) { Logger.log('rows error: ' + e); return []; }
}

function parseJSON(v, fb) {
  if (v == null) return fb;
  if (typeof v === 'object') return v;
  const s = String(v).trim();
  if (!s) return fb;
  if (s.startsWith('{') || s.startsWith('[')) {
    try { return JSON.parse(s); } catch (_) { return fb; }
  }
  if (s.startsWith('http')) return [s];
  return fb;
}

function priceOf(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Math.round(v);
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : Math.round(n);
}

/**
 * FIX v11: Normalize URL - selalu konversi ke format lh3 yang reliable
 * Terima input dalam format apapun, keluarkan lh3 format
 */
function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  // Extract file ID dari berbagai format
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
  return driveUrl(fileId);
}

// ================== READ ==================
function getAllData() {
  try {
    const cache = CacheService.getScriptCache();
    const hit = cache.get('catalog_all_v11');
    if (hit) {
      const parsed = JSON.parse(hit);
      if (parsed && parsed.success && Array.isArray(parsed.books)) {
        parsed._cached = true;
        return parsed;
      }
    }
  } catch (_) {}

  const result = {
    success: true,
    books: readBooks(),
    settings: readSettings(),
    links: readSocial(),
    mode: 'LIVE',
    v: 11,
    ts: new Date().toISOString()
  };

  try {
    CacheService.getScriptCache().put('catalog_all_v11', JSON.stringify(result), CACHE_SECONDS);
  } catch (_) {}

  return result;
}

function readBooks() {
  try {
    const r = rows(sheet(SHEETS.BOOKS));
    return r.map(mapBook).filter(b => b && b.id);
  } catch (e) {
    Logger.log('readBooks error: ' + e);
    throw e;
  }
}

function mapBook(r) {
  try {
    const coverUrl = normalizeImageUrl(String(r.cover_url || ''));
    const galleryRaw = parseJSON(r.gallery, coverUrl ? [coverUrl] : []);
    const gallery = (Array.isArray(galleryRaw) ? galleryRaw : [coverUrl].filter(Boolean))
      .map(normalizeImageUrl)
      .filter(Boolean);
    const fileIds = parseJSON(r.gallery_fileIds, []);

    return {
      id: String(r.id || ''),
      slug: String(r.slug || ''),
      title: String(r.title || ''),
      short_desc: String(r.short_desc || ''),
      category: String(r.category || 'Umum'),
      price: priceOf(r.price),
      cover_url: coverUrl,
      cover_fileId: String(r.cover_fileId || ''),
      gallery: gallery,
      gallery_fileIds: Array.isArray(fileIds) ? fileIds : [],
      synopsis: String(r.synopsis || ''),
      specs: parseJSON(r.specs, { author:'Taufan Fuad Ramadan, M.A.', dimension:'14 x 21 cm', pages:'', isbn:'', year:'2026' }),
      features: parseJSON(r.features, []),
      order_link: String(r.order_link || ''),
      status: String(r.status || 'aktif').toLowerCase(),
      created_at: String(r.created_at || new Date().toISOString())
    };
  } catch (e) { Logger.log('mapBook error: ' + e); return null; }
}

function readSettings() {
  try {
    const r = rows(sheet(SHEETS.SETTINGS));
    const s = {};
    r.forEach(x => { if (x.key) s[String(x.key).trim()] = x.value; });

    let photos = parseJSON(s.author_photos, []);
    if (!Array.isArray(photos)) photos = [];
    photos = photos.map(normalizeImageUrl).filter(Boolean).slice(0, 3);

    let photoIds = parseJSON(s.author_photo_ids, []);
    if (!Array.isArray(photoIds)) photoIds = [];

    return {
      logo_url: normalizeImageUrl(s.logo_url || ''),
      logo_text: s.logo_text || 'CatalogFouad',
      default_order_link: s.default_order_link || 'https://wa.me/6281234567890',
      author_name: s.author_name || 'Taufan Fuad Ramadan, M.A.',
      author_bio: s.author_bio || '',
      author_photos: photos,
      author_photo_ids: photoIds
    };
  } catch (e) {
    Logger.log('readSettings error: ' + e);
    return {
      logo_url:'', logo_text:'CatalogFouad',
      default_order_link:'https://wa.me/6281234567890',
      author_name:'Taufan Fuad Ramadan, M.A.',
      author_bio:'', author_photos:[], author_photo_ids:[]
    };
  }
}

function readSocial(all) {
  try {
    const list = rows(sheet(SHEETS.SOCIAL)).map(r => ({
      platform: String(r.platform || ''),
      icon: String(r.icon || '').toLowerCase(),
      url: String(r.url || ''),
      active: ['true','1','aktif','ya','yes'].includes(String(r.active || '').toLowerCase())
    })).filter(x => x.platform && x.url);

    return all ? list : list.filter(x => x.active);
  } catch (e) { Logger.log('readSocial error: ' + e); return []; }
}

// ================== WRITE: BOOKS ==================
function writeAddBook(data) {
  try {
    if (!data) throw new Error('bookData kosong');
    const sh = sheet(SHEETS.BOOKS);
    const id = data.id || ('BK' + Date.now());
    const galleryFileIds = data.gallery_fileIds || data.gallery_file_ids || [];
    const coverUrl = normalizeImageUrl(data.cover_url || '');
    const gallery = (data.gallery || []).map(normalizeImageUrl).filter(Boolean);

    const row = [
      id,
      data.slug || '',
      data.title || '',
      data.short_desc || '',
      data.category || '',
      priceOf(data.price),
      coverUrl,
      JSON.stringify(gallery),
      data.synopsis || '',
      JSON.stringify(data.specs || {}),
      JSON.stringify(data.features || []),
      data.order_link || '',
      data.status || 'aktif',
      data.created_at || new Date().toISOString(),
      data.cover_fileId || '',
      JSON.stringify(Array.isArray(galleryFileIds) ? galleryFileIds : [])
    ];
    sh.appendRow(row);
    return { success: true, id: id };
  } catch (e) {
    Logger.log('writeAddBook error: ' + e);
    return { success: false, message: e.toString() };
  }
}

function writeUpdateBook(id, data) {
  try {
    if (!id || !data) throw new Error('id/data kosong');
    const sh = sheet(SHEETS.BOOKS);
    const v = sh.getDataRange().getValues();
    if (v.length < 2) return { success: false, message: 'Sheet kosong' };

    const h = v[0].map(x => String(x).trim());
    const idIdx = h.indexOf('id');
    if (idIdx === -1) throw new Error('Kolom id tidak ada');

    for (let i = 1; i < v.length; i++) {
      if (String(v[i][idIdx]) === String(id)) {
        const oldRow = v[i];
        const oldVal = (name) => {
          const j = h.indexOf(name);
          return j >= 0 ? oldRow[j] : '';
        };
        const galleryFileIds = data.gallery_fileIds || data.gallery_file_ids || parseJSON(oldVal('gallery_fileIds'), []);
        const coverUrl = data.cover_url !== undefined ? normalizeImageUrl(data.cover_url) : oldVal('cover_url');
        const gallery = data.gallery !== undefined
          ? data.gallery.map(normalizeImageUrl).filter(Boolean)
          : parseJSON(oldVal('gallery'), []);

        const newRow = [
          id,
          data.slug !== undefined ? data.slug : oldVal('slug'),
          data.title !== undefined ? data.title : oldVal('title'),
          data.short_desc !== undefined ? data.short_desc : oldVal('short_desc'),
          data.category !== undefined ? data.category : oldVal('category'),
          data.price !== undefined ? priceOf(data.price) : priceOf(oldVal('price')),
          coverUrl,
          JSON.stringify(gallery),
          data.synopsis !== undefined ? data.synopsis : oldVal('synopsis'),
          JSON.stringify(data.specs || parseJSON(oldVal('specs'), {})),
          JSON.stringify(data.features || parseJSON(oldVal('features'), [])),
          data.order_link !== undefined ? data.order_link : oldVal('order_link'),
          data.status !== undefined ? data.status : oldVal('status'),
          data.created_at !== undefined ? data.created_at : oldVal('created_at'),
          data.cover_fileId !== undefined ? data.cover_fileId : oldVal('cover_fileId'),
          JSON.stringify(Array.isArray(galleryFileIds) ? galleryFileIds : [])
        ];
        const final = newRow.slice(0, h.length);
        while (final.length < h.length) final.push('');

        sh.getRange(i+1, 1, 1, final.length).setValues([final]);
        return { success: true, id: id };
      }
    }
    return { success: false, message: 'ID tidak ditemukan: ' + id };
  } catch (e) {
    Logger.log('writeUpdateBook error: ' + e);
    return { success: false, message: e.toString() };
  }
}

function writeDeleteBook(id) {
  try {
    if (!id) return { success: false, message: 'id kosong' };
    const sh = sheet(SHEETS.BOOKS);
    const v = sh.getDataRange().getValues();
    if (v.length < 2) return { success: false, message: 'Sheet kosong' };
    const h = v[0].map(x => String(x).trim());
    const idIdx = h.indexOf('id');
    const coverIdx = h.indexOf('cover_fileId');
    const galleryIdx = h.indexOf('gallery_fileIds');

    for (let i = 1; i < v.length; i++) {
      if (String(v[i][idIdx]) === String(id)) {
        try {
          if (coverIdx >= 0 && v[i][coverIdx]) DriveApp.getFileById(String(v[i][coverIdx])).setTrashed(true);
        } catch (_) {}
        try {
          if (galleryIdx >= 0 && v[i][galleryIdx]) {
            const ids = parseJSON(v[i][galleryIdx], []);
            if (Array.isArray(ids)) ids.forEach(fid => { try { DriveApp.getFileById(String(fid)).setTrashed(true); } catch (_) {} });
          }
        } catch (_) {}
        sh.deleteRow(i+1);
        return { success: true };
      }
    }
    return { success: false, message: 'ID tidak ditemukan: ' + id };
  } catch (e) {
    Logger.log('writeDeleteBook error: ' + e);
    return { success: false, message: e.toString() };
  }
}

// ================== DRIVE UPLOAD (FIXED v11) ==================
function doUpload(fileName, mimeType, base64Data, oldFileId) {
  try {
    if (!fileName) return { success: false, message: 'fileName kosong' };
    if (!base64Data) return { success: false, message: 'base64Data kosong' };

    // Bersihkan prefix data URL
    let b64 = String(base64Data);
    if (b64.indexOf(',') !== -1) b64 = b64.split(',').pop();

    // Hapus file lama
    if (oldFileId) {
      try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch (_) {}
    }

    // Decode base64
    let blob;
    try {
      blob = Utilities.newBlob(
        Utilities.base64Decode(b64),
        mimeType || 'image/jpeg',
        fileName
      );
    } catch (e) {
      return { success: false, message: 'Decode gagal: ' + e.message };
    }

    // Ambil folder
    let folder = null;
    if (DRIVE_FOLDER_ID && !DRIVE_FOLDER_ID.includes('REPLACE')) {
      try { folder = DriveApp.getFolderById(DRIVE_FOLDER_ID); } catch (_) { folder = null; }
    }
    if (!folder) folder = DriveApp.getRootFolder();

    // Create file
    let file;
    try {
      file = folder.createFile(blob);
    } catch (e) {
      return { success: false, message: 'Gagal simpan file: ' + e.message, needAuth: true };
    }

    // FIX v11: Multiple sharing attempts untuk memastikan publik
    let shareOk = false;
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      shareOk = true;
    } catch (e1) {
      Logger.log('setSharing attempt 1 gagal: ' + e1.message);
      try {
        file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
        shareOk = true;
      } catch (e2) {
        Logger.log('setSharing attempt 2 gagal: ' + e2.message);
      }
    }

    const fileId = file.getId();
    return {
      success: true,
      fileId: fileId,
      url: driveUrl(fileId),                    // lh3 format
      thumbnail: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600',
      viewLink: file.getUrl(),
      shared: shareOk
    };

  } catch (err) {
    Logger.log('doUpload error: ' + err);
    return { success: false, message: err.toString() };
  }
}

/**
 * FIX v11: Repair sharing semua file gambar dari sheet
 * Jalankan SEKALI setelah update untuk fix file lama yang belum public
 */
function repairSharing() {
  const report = { books: 0, gallery: 0, fixed: 0, failed: 0 };
  try {
    const sh = sheet(SHEETS.BOOKS);
    const v = sh.getDataRange().getValues();
    if (v.length < 2) return { success: true, message: 'Sheet kosong', report };

    const h = v[0].map(x => String(x).trim());
    const coverIdx = h.indexOf('cover_fileId');
    const galleryIdx = h.indexOf('gallery_fileIds');

    for (let i = 1; i < v.length; i++) {
      // Fix cover
      if (coverIdx >= 0 && v[i][coverIdx]) {
        report.books++;
        try {
          const f = DriveApp.getFileById(String(v[i][coverIdx]));
          f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          report.fixed++;
        } catch (e) { report.failed++; }
      }
      // Fix gallery
      if (galleryIdx >= 0 && v[i][galleryIdx]) {
        try {
          const ids = parseJSON(v[i][galleryIdx], []);
          if (Array.isArray(ids)) {
            ids.forEach(fid => {
              if (!fid) return;
              report.gallery++;
              try {
                const f = DriveApp.getFileById(String(fid));
                f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                report.fixed++;
              } catch (e) { report.failed++; }
            });
          }
        } catch (_) {}
      }
    }

    bumpCache();
    return {
      success: true,
      message: `Repair selesai. Cover: ${report.books}, Gallery: ${report.gallery}, Fixed: ${report.fixed}, Failed: ${report.failed}`,
      report
    };
  } catch (e) {
    return { success: false, message: e.toString(), report };
  }
}

// ================== WRITE: SETTINGS & SOCIAL ==================
function writeSettings(data) {
  try {
    if (!data) return { success: false, message: 'settings kosong' };
    const sh = sheet(SHEETS.SETTINGS);
    const v = sh.getDataRange().getValues();

    Object.keys(data).forEach(key => {
      let val = data[key];
      // Normalize URL kalau field adalah logo/photo
      if ((key === 'logo_url') && typeof val === 'string') val = normalizeImageUrl(val);
      if ((key === 'author_photos') && Array.isArray(val)) val = val.map(normalizeImageUrl).filter(Boolean);
      if (Array.isArray(val) || (val !== null && typeof val === 'object')) val = JSON.stringify(val);
      if (val === null || val === undefined) val = '';

      let found = false;
      for (let i = 1; i < v.length; i++) {
        if (String(v[i][0]).trim() === key) {
          sh.getRange(i+1, 2).setValue(val);
          found = true;
          break;
        }
      }
      if (!found) sh.appendRow([key, val]);
    });
    return { success: true };
  } catch (e) {
    Logger.log('writeSettings error: ' + e);
    return { success: false, message: e.toString() };
  }
}

function writeSocial(social) {
  try {
    if (!social || !social.platform) return { success: false, message: 'platform kosong' };
    const sh = sheet(SHEETS.SOCIAL);
    const v = sh.getDataRange().getValues();
    const h = v[0].map(x => String(x).trim());
    const pIdx = h.indexOf('platform');
    if (pIdx === -1) throw new Error('Kolom platform tidak ada');

    const row = [
      social.platform,
      social.icon || String(social.platform).toLowerCase(),
      social.url || '',
      social.active === false ? 'FALSE' : 'TRUE'
    ];

    for (let i = 1; i < v.length; i++) {
      if (String(v[i][pIdx]).toLowerCase() === String(social.platform).toLowerCase()) {
        sh.getRange(i+1, 1, 1, row.length).setValues([row]);
        return { success: true };
      }
    }
    sh.appendRow(row);
    return { success: true };
  } catch (e) {
    Logger.log('writeSocial error: ' + e);
    return { success: false, message: e.toString() };
  }
}

function removeSocial(platform) {
  try {
    if (!platform) return { success: false, message: 'platform kosong' };
    const sh = sheet(SHEETS.SOCIAL);
    const v = sh.getDataRange().getValues();
    if (v.length < 2) return { success: false, message: 'Data kosong' };
    const h = v[0].map(x => String(x).trim());
    const pIdx = h.indexOf('platform');
    if (pIdx === -1) throw new Error('Kolom platform tidak ada');

    for (let i = 1; i < v.length; i++) {
      if (String(v[i][pIdx]).toLowerCase() === String(platform).toLowerCase()) {
        sh.deleteRow(i+1);
        return { success: true };
      }
    }
    return { success: false, message: 'Platform tidak ditemukan' };
  } catch (e) {
    Logger.log('removeSocial error: ' + e);
    return { success: false, message: e.toString() };
  }
}

// ================== AUTH ==================
function doLogin(username, password) {
  const u = String(username || '').trim();
  const p = String(password || '').trim();

  if (u === 'fuad' && p === '123') {
    return { success: true, user: { username:'fuad', role:'admin', name:'Taufan Fuad' } };
  }
  if (!u || !p) return { success: false, message: 'Username/password kosong' };

  try {
    const list = rows(sheet(SHEETS.EDITORS));
    const found = list.find(r => String(r.username).trim() === u && String(r.password).trim() === p);
    if (found) return { success: true, user: { username: found.username, role: found.role || 'editor', name: found.name || found.username } };
    return { success: false, message: 'Username atau password salah' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ================== CHECK ==================
function checkDrive() {
  const r = { success: true, spreadsheet:{ok:false,message:''}, drive:{ok:false,message:''}, folder:{ok:false,message:'',name:'',id:''} };

  try {
    const s = ss();
    r.spreadsheet.ok = true;
    r.spreadsheet.message = 'OK: ' + s.getName();
  } catch (e) { r.spreadsheet.message = e.message; }

  try {
    DriveApp.getRootFolder();
    r.drive.ok = true;
    r.drive.message = 'OK';
  } catch (e) { r.drive.message = e.message; }

  try {
    if (!DRIVE_FOLDER_ID || DRIVE_FOLDER_ID.includes('REPLACE')) {
      r.folder.message = 'DRIVE_FOLDER_ID belum diisi';
    } else {
      const f = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      r.folder.ok = true;
      r.folder.name = f.getName();
      r.folder.id = f.getId();
      r.folder.message = 'OK: ' + f.getName();
    }
  } catch (e) { r.folder.message = e.message; }

  r.success = r.spreadsheet.ok && r.drive.ok && r.folder.ok;
  return r;
}

// ================== SETUP ==================
function setupSheets() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.includes('REPLACE'))
    throw new Error('Isi SPREADSHEET_ID dulu');

  const s = SpreadsheetApp.openById(SPREADSHEET_ID);

  const ensure = (name, rowsToAdd) => {
    let sh = s.getSheetByName(name);
    if (!sh) sh = s.insertSheet(name);
    sh.clear();
    sh.appendRow(HEADERS[name]);
    if (rowsToAdd) rowsToAdd.forEach(r => sh.appendRow(r));
  };

  ensure(SHEETS.BOOKS);
  ensure(SHEETS.SETTINGS, [
    ['logo_text','CatalogFouad'],
    ['logo_url',''],
    ['default_order_link','https://wa.me/6281234567890'],
    ['author_name','Taufan Fuad Ramadan, M.A.'],
    ['author_bio',"Taufan Fuad Ramadan, M.A. adalah alumni Daar El-Huda, Ma'had Aly Tebuireng, S1/S2 Al-Azhar Mesir Cumlaude 2025."],
    ['author_photos','[]'],
    ['author_photo_ids','[]']
  ]);
  ensure(SHEETS.SOCIAL, [
    ['WhatsApp','whatsapp','https://wa.me/6281234567890','TRUE'],
    ['Instagram','instagram','https://instagram.com/fouad','TRUE'],
    ['YouTube','youtube','https://youtube.com/@fouad','TRUE']
  ]);
  ensure(SHEETS.EDITORS, [
    ['fuad','123','admin','Taufan Fuad']
  ]);

  bumpCache();
  return 'Setup selesai (v11) - jalankan Deploy > New version';
}