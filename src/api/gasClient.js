const API_URL = (import.meta.env.VITE_GAS_API_URL || '').trim();
const SESSION_KEY = 'wartapress_session_v3';

export function getSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(sessionData) {
  try {
    if (sessionData) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Abaikan error penyimpanan lokal
  }
}

export function clearSavedSession() {
  saveSession(null);
}

async function callGas(action, payload = {}, method = 'POST') {
  if (!API_URL) {
    throw new Error('VITE_GAS_API_URL belum dikonfigurasi. Salin .env.example menjadi .env dan isi URL Web App GAS.');
  }

  const session = getSavedSession();
  const token = session?.token || '';

  let response;
  if (method === 'GET') {
    const urlObj = new URL(API_URL);
    urlObj.searchParams.set('action', action);
    if (token) urlObj.searchParams.set('token', token);
    Object.keys(payload || {}).forEach((k) => {
      if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') {
        urlObj.searchParams.set(k, String(payload[k]));
      }
    });
    response = await fetch(urlObj.toString(), { method: 'GET' });
  } else {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        token,
        ...payload,
      }),
    });
  }

  if (!response.ok) {
    throw new Error(`Koneksi ke server gagal (HTTP ${response.status}).`);
  }

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Respons server bukan format JSON yang valid.');
  }

  if (!json.ok) {
    if (json.sesiHabis) {
      clearSavedSession();
      window.dispatchEvent(new CustomEvent('wartapress:sesi-habis', { detail: json.pesan }));
    }
    throw new Error(json.pesan || 'Permintaan gagal diproses server.');
  }

  return json.data;
}

export const gasApi = {
  // Publik (M9)
  publicBootstrap: () => callGas('publicBootstrap', {}, 'GET'),
  publicArticleDetail: (id, slug) => callGas('publicArticleDetail', { id, slug }, 'GET'),
  publicPageDetail: (id, slug) => callGas('publicPageDetail', { id, slug }, 'GET'),

  // Auth (M0)
  login: (username, password) => callGas('login', { username, password }, 'POST'),
  logout: () => callGas('logout', {}, 'POST'),

  // CMS Bootstrap (M1)
  cmsBootstrap: () => callGas('cmsBootstrap', {}, 'GET'),

  // M2: Artikel
  saveArticle: (article) => callGas('saveArticle', article, 'POST'),
  getArticleDetail: (id) => callGas('getArticleDetail', { id }, 'POST'),
  deleteArticle: (id) => callGas('deleteArticle', { id }, 'POST'),

  // M3: Kategori
  saveCategory: (category) => callGas('saveCategory', category, 'POST'),
  deleteCategory: (id) => callGas('deleteCategory', { id }, 'POST'),

  // M4: Pengguna & Keamanan
  listUsersAndLogs: (filters = {}) => callGas('listUsersAndLogs', filters, 'POST'),
  saveUser: (user) => callGas('saveUser', user, 'POST'),
  toggleUserStatus: (ID, StatusAktif) => callGas('toggleUserStatus', { ID, StatusAktif }, 'POST'),

  // M5: Halaman
  savePage: (page) => callGas('savePage', page, 'POST'),
  getPageDetail: (id) => callGas('getPageDetail', { id }, 'POST'),
  deletePage: (id) => callGas('deletePage', { id }, 'POST'),

  // M6: Galeri
  saveGallery: (item) => callGas('saveGallery', item, 'POST'),
  deleteGallery: (id) => callGas('deleteGallery', { id }, 'POST'),

  // M7: Widget Sidebar
  saveWidget: (widget) => callGas('saveWidget', widget, 'POST'),
  reorderWidgets: (items) => callGas('reorderWidgets', { items }, 'POST'),
  deleteWidget: (id) => callGas('deleteWidget', { id }, 'POST'),

  // M8: Pengaturan Sistem
  saveSettings: (settings) => callGas('saveSettings', { settings }, 'POST'),
};
