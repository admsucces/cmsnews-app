import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gasApi } from '../api/gasClient';
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  SafeImage,
  StatusBadge,
} from '../components/UiShared';
import WordRichEditor, { HtmlPreviewModal } from '../components/WordRichEditor';

function slugifyClient(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EMPTY_ARTICLE = {
  ID: '',
  Judul: '',
  SlugURL: '',
  KategoriID: '',
  Ringkasan: '',
  KontenHTML: '',
  GambarUtamaURL: '',
  Tag: '',
  Status: 'Draf',
  BeritaUtama: 'Tidak',
};

const EMPTY_PAGE = {
  ID: '',
  JudulHalaman: '',
  SlugHalaman: '',
  KontenHTML: '',
  TampilDiMenu: 'Ya',
  UrutanMenu: 1,
  Status: 'Draf',
};

export default function CmsWorkspace({
  session,
  onLogout,
  onOpenPortal,
  showToast,
}) {
  const isAdmin = session?.user?.Role === 'Admin';

  const [activeMenu, setActiveMenu] = useState('dashboard'); // 'dashboard' | 'articles' | 'article-editor' | 'categories' | 'pages' | 'page-editor' | 'gallery' | 'widgets' | 'users' | 'settings'
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [cmsData, setCmsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // M2: Artikel
  const [artSearch, setArtSearch] = useState('');
  const [artCatFilter, setArtCatFilter] = useState('');
  const [artStatusFilter, setArtStatusFilter] = useState('');
  const [artSort, setArtSort] = useState('terbaru');
  const [artPage, setArtPage] = useState(1);
  const [articleForm, setArticleForm] = useState(EMPTY_ARTICLE);
  const [articlePreviewOpen, setArticlePreviewOpen] = useState(false);

  // M3: Kategori
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ ID: '', NamaKategori: '', SlugKategori: '', Deskripsi: '', WarnaLabel: '#DC2626' });

  // M5: Halaman
  const [pageSearch, setPageSearch] = useState('');
  const [pageStatusFilter, setPageStatusFilter] = useState('');
  const [pageForm, setPageForm] = useState(EMPTY_PAGE);
  const [pagePreviewOpen, setPagePreviewOpen] = useState(false);

  // M6: Galeri
  const [galAlbumFilter, setGalAlbumFilter] = useState('Semua');
  const [galSearch, setGalSearch] = useState('');
  const [galModalOpen, setGalModalOpen] = useState(false);
  const [galForm, setGalForm] = useState({
    ID: '',
    JudulFoto: '',
    GambarURL: '',
    Keterangan: '',
    Album: 'Umum',
    KreditFotografer: '',
    Status: 'Tampil',
  });

  // M7: Widget Sidebar
  const [wdgMobileTab, setWdgMobileTab] = useState('Kiri');
  const [wdgModalOpen, setWdgModalOpen] = useState(false);
  const [wdgForm, setWdgForm] = useState({
    ID: '',
    JudulWidget: '',
    Posisi: 'Kanan',
    TipeWidget: 'BeritaPopuler',
    KontenWidget: '5',
    GambarURL: '',
    TautanURL: '',
    Urutan: 1,
    StatusAktif: 'Aktif',
  });

  // M4: Pengguna & Keamanan
  const [usersList, setUsersList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    ID: '',
    Username: '',
    NamaLengkap: '',
    Role: 'Editor',
    Password: '',
  });

  // M8: Pengaturan Sistem
  const [settingsTab, setSettingsTab] = useState('Identitas');
  const [settingsForm, setSettingsForm] = useState({});

  // Konfirmasi Hapus
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const loadCmsData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await gasApi.cmsBootstrap();
      setCmsData(data);
      setSettingsForm(data.settings || {});
      if (isAdmin) {
        const uData = await gasApi.listUsersAndLogs();
        setUsersList(uData.users || []);
        setLogsList(uData.logs || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data CMS.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadCmsData();
  }, [loadCmsData]);

  const categories = cmsData?.categories || [];
  const articles = cmsData?.articles || [];
  const pages = cmsData?.pages || [];
  const gallery = cmsData?.gallery || [];
  const widgets = cmsData?.widgets || [];
  const stats = cmsData?.stats || {};
  const recentLogs = cmsData?.recentLogs || [];
  const siteName = (cmsData?.settings?.NamaWebsite) || 'WartaPress';

  // --- Handlers M2: Artikel ---
  const filteredArticles = useMemo(() => {
    const q = artSearch.trim().toLowerCase();
    const list = articles.filter((a) => {
      if (artCatFilter && a.KategoriID !== artCatFilter) return false;
      if (artStatusFilter && a.Status !== artStatusFilter) return false;
      if (q) {
        const matchJudul = String(a.Judul || '').toLowerCase().includes(q);
        const matchRingkasan = String(a.Ringkasan || '').toLowerCase().includes(q);
        if (!matchJudul && !matchRingkasan) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (artSort === 'terlama') return String(a.Diperbarui || '').localeCompare(String(b.Diperbarui || ''));
      if (artSort === 'judul') return String(a.Judul || '').localeCompare(String(b.Judul || ''));
      return String(b.Diperbarui || '').localeCompare(String(a.Diperbarui || ''));
    });
  }, [articles, artSearch, artCatFilter, artStatusFilter, artSort]);

  const artPageSize = 10;
  const artTotalPages = Math.max(1, Math.ceil(filteredArticles.length / artPageSize));
  const safeArtPage = Math.min(artPage, artTotalPages);
  const pagedArticles = useMemo(() => {
    const start = (safeArtPage - 1) * artPageSize;
    return filteredArticles.slice(start, start + artPageSize);
  }, [filteredArticles, safeArtPage]);

  const startNewArticle = () => {
    setArticleForm({
      ...EMPTY_ARTICLE,
      KategoriID: categories[0]?.ID || '',
    });
    setActiveMenu('article-editor');
    setDrawerOpen(false);
  };

  const openEditArticle = async (art) => {
    setSaving(true);
    try {
      const detail = await gasApi.getArticleDetail(art.ID);
      setArticleForm({
        ...EMPTY_ARTICLE,
        ...(detail.article || art),
      });
      setActiveMenu('article-editor');
      setDrawerOpen(false);
    } catch (err) {
      showToast(err.message || 'Gagal membuka artikel.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitArticle = async (targetStatus = null) => {
    const payload = {
      ...articleForm,
      Status: targetStatus || articleForm.Status || 'Draf',
      SlugURL: articleForm.SlugURL || slugifyClient(articleForm.Judul),
    };
    if (!payload.Judul.trim()) {
      showToast('Judul artikel wajib diisi.', 'error');
      return;
    }
    if (!payload.KategoriID) {
      showToast('Pilih kategori artikel terlebih dahulu.', 'error');
      return;
    }

    setSaving(true);
    try {
      await gasApi.saveArticle(payload);
      showToast(`Artikel berhasil disimpan (${payload.Status}).`, 'success');
      await loadCmsData();
      setActiveMenu('articles');
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan artikel.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteArticle = (art) => {
    setConfirmState({
      open: true,
      title: 'Hapus Artikel',
      message: `Hapus permanen artikel "${art.Judul}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        setSaving(true);
        try {
          await gasApi.deleteArticle(art.ID);
          showToast('Artikel berhasil dihapus.', 'success');
          setConfirmState((s) => ({ ...s, open: false }));
          await loadCmsData();
        } catch (err) {
          showToast(err.message || 'Gagal menghapus artikel.', 'error');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // --- Handlers M3: Kategori ---
  const openCategoryModal = (cat = null) => {
    if (cat) {
      setCatForm({
        ID: cat.ID,
        NamaKategori: cat.NamaKategori,
        SlugKategori: cat.SlugKategori,
        Deskripsi: cat.Deskripsi,
        WarnaLabel: cat.WarnaLabel || '#DC2626',
      });
    } else {
      setCatForm({ ID: '', NamaKategori: '', SlugKategori: '', Deskripsi: '', WarnaLabel: '#DC2626' });
    }
    setCatModalOpen(true);
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await gasApi.saveCategory({
        ...catForm,
        SlugKategori: catForm.SlugKategori || slugifyClient(catForm.NamaKategori),
      });
      showToast('Kategori berhasil disimpan.', 'success');
      setCatModalOpen(false);
      await loadCmsData();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan kategori.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCategory = (cat) => {
    setConfirmState({
      open: true,
      title: 'Hapus Kategori',
      message: `Hapus kategori "${cat.NamaKategori}"?`,
      onConfirm: async () => {
        setSaving(true);
        try {
          await gasApi.deleteCategory(cat.ID);
          showToast('Kategori berhasil dihapus.', 'success');
          setConfirmState((s) => ({ ...s, open: false }));
          await loadCmsData();
        } catch (err) {
          showToast(err.message || 'Gagal menghapus kategori.', 'error');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // --- Handlers M5: Halaman ---
  const filteredPages = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    return pages.filter((p) => {
      if (pageStatusFilter && p.Status !== pageStatusFilter) return false;
      if (q && !String(p.JudulHalaman || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pages, pageSearch, pageStatusFilter]);

  const startNewPage = () => {
    setPageForm({ ...EMPTY_PAGE, UrutanMenu: pages.length + 1 });
    setActiveMenu('page-editor');
    setDrawerOpen(false);
  };

  const openEditPage = async (pg) => {
    setSaving(true);
    try {
      const detail = await gasApi.getPageDetail(pg.ID);
      setPageForm({ ...EMPTY_PAGE, ...(detail.page || pg) });
      setActiveMenu('page-editor');
      setDrawerOpen(false);
    } catch (err) {
      showToast(err.message || 'Gagal membuka halaman.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitPage = async (targetStatus = null) => {
    const payload = {
      ...pageForm,
      Status: targetStatus || pageForm.Status || 'Draf',
      SlugHalaman: pageForm.SlugHalaman || slugifyClient(pageForm.JudulHalaman),
    };
    if (!payload.JudulHalaman.trim()) {
      showToast('Judul halaman wajib diisi.', 'error');
      return;
    }
    setSaving(true);
    try {
      await gasApi.savePage(payload);
      showToast('Halaman berhasil disimpan.', 'success');
      await loadCmsData();
      setActiveMenu('pages');
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan halaman.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeletePage = (pg) => {
    setConfirmState({
      open: true,
      title: 'Hapus Halaman',
      message: `Hapus halaman "${pg.JudulHalaman}"?`,
      onConfirm: async () => {
        setSaving(true);
        try {
          await gasApi.deletePage(pg.ID);
          showToast('Halaman berhasil dihapus.', 'success');
          setConfirmState((s) => ({ ...s, open: false }));
          await loadCmsData();
        } catch (err) {
          showToast(err.message || 'Gagal menghapus halaman.', 'error');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // --- Handlers M6: Galeri ---
  const galAlbums = useMemo(() => {
    const s = new Set(['Semua']);
    gallery.forEach((g) => { if (g.Album) s.add(g.Album); });
    return Array.from(s);
  }, [gallery]);

  const filteredGallery = useMemo(() => {
    const q = galSearch.trim().toLowerCase();
    return gallery.filter((g) => {
      if (galAlbumFilter !== 'Semua' && g.Album !== galAlbumFilter) return false;
      if (q && !String(g.JudulFoto || '').toLowerCase().includes(q) && !String(g.Keterangan || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [gallery, galAlbumFilter, galSearch]);

  const openGalleryModal = (item = null) => {
    if (item) {
      setGalForm({ ...item });
    } else {
      setGalForm({
        ID: '',
        JudulFoto: '',
        GambarURL: '',
        Keterangan: '',
        Album: 'Umum',
        KreditFotografer: '',
        Status: 'Tampil',
      });
    }
    setGalModalOpen(true);
  };

  const submitGallery = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await gasApi.saveGallery(galForm);
      showToast('Foto galeri berhasil disimpan.', 'success');
      setGalModalOpen(false);
      await loadCmsData();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan foto galeri.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteGallery = (item) => {
    setConfirmState({
      open: true,
      title: 'Hapus Foto Galeri',
      message: `Hapus "${item.JudulFoto}" dari galeri?`,
      onConfirm: async () => {
        setSaving(true);
        try {
          await gasApi.deleteGallery(item.ID);
          showToast('Foto galeri dihapus.', 'success');
          setConfirmState((s) => ({ ...s, open: false }));
          await loadCmsData();
        } catch (err) {
          showToast(err.message || 'Gagal menghapus foto.', 'error');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // --- Handlers M7: Widget Sidebar ---
  const leftWidgetsCms = useMemo(
    () => widgets.filter((w) => w.Posisi === 'Kiri').sort((a, b) => Number(a.Urutan) - Number(b.Urutan)),
    [widgets]
  );
  const rightWidgetsCms = useMemo(
    () => widgets.filter((w) => w.Posisi === 'Kanan').sort((a, b) => Number(a.Urutan) - Number(b.Urutan)),
    [widgets]
  );

  const openWidgetModal = (w = null, defaultPos = 'Kanan') => {
    if (w) {
      setWdgForm({ ...w });
    } else {
      const list = defaultPos === 'Kiri' ? leftWidgetsCms : rightWidgetsCms;
      setWdgForm({
        ID: '',
        JudulWidget: '',
        Posisi: defaultPos,
        TipeWidget: 'BeritaPopuler',
        KontenWidget: '5',
        GambarURL: '',
        TautanURL: '',
        Urutan: list.length + 1,
        StatusAktif: 'Aktif',
      });
    }
    setWdgModalOpen(true);
  };

  const submitWidget = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await gasApi.saveWidget(wdgForm);
      showToast('Widget sidebar berhasil disimpan.', 'success');
      setWdgModalOpen(false);
      await loadCmsData();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan widget.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const moveWidgetOrder = async (posList, index, delta) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= posList.length) return;
    const cloned = [...posList];
    const temp = cloned[index];
    cloned[index] = cloned[targetIdx];
    cloned[targetIdx] = temp;

    const patchItems = cloned.map((item, idx) => ({
      ID: item.ID,
      Urutan: idx + 1,
    }));

    setSaving(true);
    try {
      await gasApi.reorderWidgets(patchItems);
      showToast('Urutan widget diperbarui.', 'success');
      await loadCmsData();
    } catch (err) {
      showToast(err.message || 'Gagal mengubah urutan widget.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteWidget = (w) => {
    setConfirmState({
      open: true,
      title: 'Hapus Widget',
      message: `Hapus widget "${w.JudulWidget}" dari sidebar ${w.Posisi}?`,
      onConfirm: async () => {
        setSaving(true);
        try {
          await gasApi.deleteWidget(w.ID);
          showToast('Widget dihapus.', 'success');
          setConfirmState((s) => ({ ...s, open: false }));
          await loadCmsData();
        } catch (err) {
          showToast(err.message || 'Gagal menghapus widget.', 'error');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // --- Handlers M4: Pengguna & Keamanan ---
  const refreshUsersAndLogs = async (aksiVal = logActionFilter, searchVal = logSearch) => {
    if (!isAdmin) return;
    try {
      const uData = await gasApi.listUsersAndLogs({ aksi: aksiVal, search: searchVal });
      setUsersList(uData.users || []);
      setLogsList(uData.logs || []);
    } catch (err) {
      showToast(err.message || 'Gagal memuat pengguna & log.', 'error');
    }
  };

  const openUserModal = (u = null) => {
    if (u) {
      setUserForm({
        ID: u.ID,
        Username: u.Username,
        NamaLengkap: u.NamaLengkap,
        Role: u.Role,
        Password: '',
      });
    } else {
      setUserForm({ ID: '', Username: '', NamaLengkap: '', Role: 'Editor', Password: '' });
    }
    setUserModalOpen(true);
  };

  const submitUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await gasApi.saveUser(userForm);
      showToast('Data pengguna berhasil disimpan.', 'success');
      setUserModalOpen(false);
      await refreshUsersAndLogs();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan pengguna.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (u) => {
    const nextStatus = u.StatusAktif === 'Aktif' ? 'Nonaktif' : 'Aktif';
    setSaving(true);
    try {
      await gasApi.toggleUserStatus(u.ID, nextStatus);
      showToast(`Status ${u.Username} diubah menjadi ${nextStatus}.`, 'success');
      await refreshUsersAndLogs();
    } catch (err) {
      showToast(err.message || 'Gagal mengubah status pengguna.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Handlers M8: Pengaturan Sistem ---
  const submitSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await gasApi.saveSettings(settingsForm);
      showToast('Pengaturan sistem berhasil disimpan.', 'success');
      await loadCmsData();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan pengaturan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const navGroups = useMemo(() => {
    const editorial = [
      { id: 'dashboard', label: 'Dashboard', icon: '◈' },
      { id: 'articles', label: 'Artikel', icon: '✎' },
      { id: 'categories', label: 'Kategori', icon: '❖' },
      { id: 'pages', label: 'Halaman', icon: '📄' },
      { id: 'gallery', label: 'Galeri', icon: '🖼' },
    ];
    const layout = isAdmin ? [{ id: 'widgets', label: 'Widget Sidebar', icon: '◫' }] : [];
    const system = isAdmin
      ? [
          { id: 'users', label: 'Pengguna & Keamanan', icon: '🛡' },
          { id: 'settings', label: 'Pengaturan Sistem', icon: '⚙' },
        ]
      : [];
    return [
      { title: 'Editorial', items: editorial },
      ...(layout.length ? [{ title: 'Tata Letak', items: layout }] : []),
      ...(system.length ? [{ title: 'Sistem', items: system }] : []),
    ];
  }, [isAdmin]);

  const menuTitleMap = {
    dashboard: 'Dashboard Editorial',
    articles: 'Manajemen Artikel',
    'article-editor': articleForm.ID ? 'Sunting Artikel' : 'Tulis Artikel Baru',
    categories: 'Kategori & Topik',
    pages: 'Manajemen Halaman',
    'page-editor': pageForm.ID ? 'Sunting Halaman' : '+ Halaman Baru',
    gallery: 'Galeri Foto & Media',
    widgets: 'Manajemen Widget Sidebar',
    users: 'Pengguna & Keamanan',
    settings: 'Pengaturan Sistem',
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-base font-extrabold text-slate-900 truncate">{siteName}</p>
            <p className="text-[11px] font-semibold text-red-600">CMS Editorial v3</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <nav className="space-y-5">
          {navGroups.map((grp) => (
            <div key={grp.title}>
              <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {grp.title}
              </p>
              <div className="space-y-1">
                {grp.items.map((item) => {
                  const active =
                    activeMenu === item.id ||
                    (item.id === 'articles' && activeMenu === 'article-editor') ||
                    (item.id === 'pages' && activeMenu === 'page-editor');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveMenu(item.id);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-red-600 text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-4 text-center">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="pt-4 mt-6 border-t border-slate-200 space-y-2.5">
        <button
          type="button"
          onClick={onOpenPortal}
          className="w-full py-2 px-3 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Lihat Portal Publik ↗
        </button>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{session?.user?.NamaLengkap}</p>
            <p className="text-[11px] text-slate-500">{session?.user?.Role}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row pb-16 lg:pb-0">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-[264px] shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen overflow-y-auto">
        {renderSidebarContent()}
      </aside>

      {/* Drawer Tablet & Mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/40"
          />
          <aside className="relative w-[272px] max-w-[82vw] bg-white h-full shadow-xl z-10 overflow-y-auto">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Area Konten Utama CMS */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold cursor-pointer"
              aria-label="Buka navigasi"
            >
              ☰
            </button>
            <h1 className="text-base sm:text-xl font-extrabold text-slate-900 truncate">
              {menuTitleMap[activeMenu] || 'WartaPress CMS'}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadCmsData}
              disabled={loading || saving}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {loading ? 'Memuat...' : 'Segarkan'}
            </button>
            {activeMenu === 'article-editor' ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitArticle('Draf')}
                  className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Simpan Draf
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitArticle('Terbit')}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Terbitkan'}
                </button>
              </>
            ) : activeMenu === 'page-editor' ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitPage('Draf')}
                  className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Draf
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitPage('Terbit')}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Halaman'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startNewArticle}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                + Tulis Artikel
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {error && <ErrorBanner message={error} onRetry={loadCmsData} />}

          {loading && !cmsData ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* M1: DASHBOARD */}
              {activeMenu === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-500">Artikel Terbit</p>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.artikelTerbit ?? 0}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-500">Draf Artikel</p>
                      <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.artikelDraf ?? 0}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-500">Halaman Terbit</p>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.halamanTerbit ?? 0}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-500">Foto Galeri</p>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalGaleri ?? 0}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-2 sm:col-span-1">
                      <p className="text-xs font-semibold text-slate-500">Kategori</p>
                      <p className="text-2xl font-extrabold text-red-600 mt-1">{stats.totalKategori ?? 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-slate-900">Artikel Terbaru</h2>
                        <button
                          type="button"
                          onClick={() => setActiveMenu('articles')}
                          className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                        >
                          Lihat Semua →
                        </button>
                      </div>
                      {articles.length === 0 ? (
                        <EmptyState title="Belum ada artikel" description="Mulai tulis berita pertama Anda." actionLabel="+ Tulis Artikel" onAction={startNewArticle} />
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {articles.slice(0, 5).map((art) => (
                            <div key={art.ID} className="py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openEditArticle(art)}
                                  className="text-sm font-bold text-slate-900 hover:text-red-600 truncate block text-left cursor-pointer"
                                >
                                  {art.Judul}
                                </button>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {art.NamaKategori} • {art.NamaPenulis} • {art.Diperbarui}
                                </p>
                              </div>
                              <StatusBadge status={art.Status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5">
                        <h2 className="text-base font-bold text-slate-900 mb-4">Aktivitas Keamanan</h2>
                        {recentLogs.length === 0 ? (
                          <p className="text-xs text-slate-500">Belum ada log aktivitas.</p>
                        ) : (
                          <div className="space-y-3">
                            {recentLogs.map((lg) => (
                              <div key={lg.ID} className="text-xs border-b border-slate-100 pb-2.5 last:border-b-0">
                                <div className="flex items-center justify-between font-bold text-slate-800">
                                  <span>{lg.Aksi}</span>
                                  <span className="text-[11px] text-slate-400 font-normal">{lg.Dibuat}</span>
                                </div>
                                <p className="text-slate-600 mt-0.5">{lg.Detail}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Aktor: {lg.UsernameAktor}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* M2: DAFTAR ARTIKEL */}
              {activeMenu === 'articles' && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input
                      type="search"
                      value={artSearch}
                      onChange={(e) => { setArtSearch(e.target.value); setArtPage(1); }}
                      placeholder="Cari judul atau ringkasan..."
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <select
                      value={artCatFilter}
                      onChange={(e) => { setArtCatFilter(e.target.value); setArtPage(1); }}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option value="">Semua Kategori</option>
                      {categories.map((c) => (
                        <option key={c.ID} value={c.ID}>{c.NamaKategori}</option>
                      ))}
                    </select>
                    <select
                      value={artStatusFilter}
                      onChange={(e) => { setArtStatusFilter(e.target.value); setArtPage(1); }}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option value="">Semua Status</option>
                      <option value="Terbit">Terbit</option>
                      <option value="Draf">Draf</option>
                      <option value="Arsip">Arsip</option>
                    </select>
                    <select
                      value={artSort}
                      onChange={(e) => setArtSort(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option value="terbaru">Urutan: Terbaru</option>
                      <option value="terlama">Urutan: Terlama</option>
                      <option value="judul">Urutan: Judul A-Z</option>
                    </select>
                  </div>

                  {pagedArticles.length === 0 ? (
                    <EmptyState
                      title="Tidak ada artikel ditemukan"
                      description="Ubah filter atau buat artikel baru."
                      actionLabel="+ Tulis Artikel"
                      onAction={startNewArticle}
                    />
                  ) : (
                    <>
                      {/* Desktop & Tablet Tabel */}
                      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                              <th className="py-3 px-4">Judul</th>
                              <th className="py-3 px-4">Kategori</th>
                              <th className="py-3 px-4">Penulis</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Diperbarui</th>
                              <th className="py-3 px-4 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {pagedArticles.map((art) => (
                              <tr key={art.ID} className="hover:bg-slate-50/70">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <SafeImage
                                      src={art.GambarUtamaURL}
                                      alt={art.Judul}
                                      className="w-12 h-10 rounded-lg object-cover shrink-0 border border-slate-200"
                                      fallbackText="WP"
                                    />
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 line-clamp-1">{art.Judul}</p>
                                      <p className="text-xs text-slate-400 truncate">/{art.SlugURL}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-xs font-semibold text-slate-700">{art.NamaKategori}</td>
                                <td className="py-3 px-4 text-xs text-slate-600">{art.NamaPenulis}</td>
                                <td className="py-3 px-4"><StatusBadge status={art.Status} /></td>
                                <td className="py-3 px-4 text-xs text-slate-500">{art.Diperbarui}</td>
                                <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditArticle(art)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                                  >
                                    Sunting
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => confirmDeleteArticle(art)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Stacked Cards */}
                      <div className="md:hidden space-y-3">
                        {pagedArticles.map((art) => (
                          <div key={art.ID} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-red-600">{art.NamaKategori}</span>
                              <StatusBadge status={art.Status} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">{art.Judul}</h3>
                            <p className="text-xs text-slate-500">{art.NamaPenulis} • {art.Diperbarui}</p>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditArticle(art)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 cursor-pointer"
                              >
                                Sunting
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDeleteArticle(art)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 cursor-pointer"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {filteredArticles.length > artPageSize && (
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Halaman {safeArtPage} dari {artTotalPages}</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={safeArtPage <= 1}
                              onClick={() => setArtPage((p) => Math.max(1, p - 1))}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 cursor-pointer"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              disabled={safeArtPage >= artTotalPages}
                              onClick={() => setArtPage((p) => Math.min(artTotalPages, p + 1))}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* M2: EDITOR ARTIKEL WORD-STYLE */}
              {activeMenu === 'article-editor' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveMenu('articles')}
                      className="text-xs font-bold text-slate-600 hover:text-red-600 cursor-pointer"
                    >
                      ← Kembali ke Daftar Artikel
                    </button>
                    <button
                      type="button"
                      onClick={() => setArticlePreviewOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer"
                    >
                      Pratinjau Konten
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-8 space-y-4">
                      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Judul Berita</label>
                        <input
                          type="text"
                          value={articleForm.Judul}
                          onChange={(e) => {
                            const val = e.target.value;
                            setArticleForm((prev) => ({
                              ...prev,
                              Judul: val,
                              SlugURL: prev.ID ? prev.SlugURL : slugifyClient(val),
                            }));
                          }}
                          placeholder="Ketik judul utama berita yang menarik..."
                          className="w-full text-xl sm:text-2xl font-extrabold text-slate-900 border-0 focus:ring-0 focus:outline-none px-0"
                        />
                      </div>

                      <WordRichEditor
                        value={articleForm.KontenHTML}
                        onChange={(html) => setArticleForm((prev) => ({ ...prev, KontenHTML: html }))}
                        galleryItems={gallery}
                      />
                    </div>

                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                        Pengaturan & Metadata Artikel
                      </h3>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                        <select
                          value={articleForm.KategoriID}
                          onChange={(e) => setArticleForm((prev) => ({ ...prev, KategoriID: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                        >
                          <option value="">-- Pilih Kategori --</option>
                          {categories.map((c) => (
                            <option key={c.ID} value={c.ID}>{c.NamaKategori}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Slug URL</label>
                        <input
                          type="text"
                          value={articleForm.SlugURL}
                          onChange={(e) => setArticleForm((prev) => ({ ...prev, SlugURL: slugifyClient(e.target.value) }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Ringkasan ({articleForm.Ringkasan.length}/250)
                        </label>
                        <textarea
                          rows={3}
                          maxLength={250}
                          value={articleForm.Ringkasan}
                          onChange={(e) => setArticleForm((prev) => ({ ...prev, Ringkasan: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Gambar Utama URL</label>
                        <input
                          type="url"
                          value={articleForm.GambarUtamaURL}
                          onChange={(e) => setArticleForm((prev) => ({ ...prev, GambarUtamaURL: e.target.value }))}
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                        {articleForm.GambarUtamaURL && (
                          <SafeImage
                            src={articleForm.GambarUtamaURL}
                            alt="Pratinjau sampul"
                            className="mt-2 w-full h-32 object-cover rounded-lg border border-slate-200"
                            fallbackText="Pratinjau Gambar"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Tag (pisahkan koma)</label>
                        <input
                          type="text"
                          value={articleForm.Tag}
                          onChange={(e) => setArticleForm((prev) => ({ ...prev, Tag: e.target.value }))}
                          placeholder="ekonomi, digital, kebijakan"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                          <select
                            value={articleForm.Status}
                            onChange={(e) => setArticleForm((prev) => ({ ...prev, Status: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                          >
                            <option value="Draf">Draf</option>
                            <option value="Terbit">Terbit</option>
                            <option value="Arsip">Arsip</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Berita Utama</label>
                          <select
                            value={articleForm.BeritaUtama}
                            onChange={(e) => setArticleForm((prev) => ({ ...prev, BeritaUtama: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                          >
                            <option value="Tidak">Tidak</option>
                            <option value="Ya">Ya</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* M3: KATEGORI */}
              {activeMenu === 'categories' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => openCategoryModal(null)}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                    >
                      + Tambah Kategori
                    </button>
                  </div>

                  {categories.length === 0 ? (
                    <EmptyState title="Belum ada kategori" description="Tambahkan kategori kanal berita." actionLabel="+ Tambah Kategori" onAction={() => openCategoryModal(null)} />
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                            <th className="py-3 px-4">Kategori</th>
                            <th className="py-3 px-4">Slug</th>
                            <th className="py-3 px-4">Deskripsi</th>
                            <th className="py-3 px-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {categories.map((cat) => (
                            <tr key={cat.ID}>
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.WarnaLabel || '#DC2626' }} />
                                  {cat.NamaKategori}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-500">{cat.SlugKategori}</td>
                              <td className="py-3 px-4 text-xs text-slate-600">{cat.Deskripsi}</td>
                              <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                                <button
                                  type="button"
                                  onClick={() => openCategoryModal(cat)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 cursor-pointer"
                                >
                                  Ubah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteCategory(cat)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* M5: DAFTAR HALAMAN */}
              {activeMenu === 'pages' && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                      <input
                        type="search"
                        value={pageSearch}
                        onChange={(e) => setPageSearch(e.target.value)}
                        placeholder="Cari judul halaman..."
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm flex-1"
                      />
                      <select
                        value={pageStatusFilter}
                        onChange={(e) => setPageStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                      >
                        <option value="">Semua Status</option>
                        <option value="Terbit">Terbit</option>
                        <option value="Draf">Draf</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={startNewPage}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 shrink-0 cursor-pointer"
                    >
                      + Halaman
                    </button>
                  </div>

                  {filteredPages.length === 0 ? (
                    <EmptyState
                      title="Belum ada halaman statis"
                      description="Buat halaman seperti Tentang Kami, Redaksi, atau Kontak."
                      actionLabel="+ Halaman"
                      onAction={startNewPage}
                    />
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                            <th className="py-3 px-4">Judul Halaman</th>
                            <th className="py-3 px-4">Menu</th>
                            <th className="py-3 px-4">Urutan</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredPages.map((pg) => (
                            <tr key={pg.ID}>
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-900">{pg.JudulHalaman}</p>
                                <p className="text-xs text-slate-400">/{pg.SlugHalaman}</p>
                              </td>
                              <td className="py-3 px-4 text-xs font-semibold text-slate-700">{pg.TampilDiMenu}</td>
                              <td className="py-3 px-4 text-xs text-slate-600">{pg.UrutanMenu}</td>
                              <td className="py-3 px-4"><StatusBadge status={pg.Status} /></td>
                              <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                                <button
                                  type="button"
                                  onClick={() => openEditPage(pg)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 cursor-pointer"
                                >
                                  Sunting
                                </button>
                                <button
                                  type="button"
                                  onClick={() => confirmDeletePage(pg)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* M5: EDITOR HALAMAN (+ Halaman) */}
              {activeMenu === 'page-editor' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveMenu('pages')}
                      className="text-xs font-bold text-slate-600 hover:text-red-600 cursor-pointer"
                    >
                      ← Kembali ke Daftar Halaman
                    </button>
                    <button
                      type="button"
                      onClick={() => setPagePreviewOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 cursor-pointer"
                    >
                      Pratinjau Halaman
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-8 space-y-4">
                      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Judul Halaman</label>
                        <input
                          type="text"
                          value={pageForm.JudulHalaman}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPageForm((prev) => ({
                              ...prev,
                              JudulHalaman: val,
                              SlugHalaman: prev.ID ? prev.SlugHalaman : slugifyClient(val),
                            }));
                          }}
                          placeholder="Contoh: Tentang Kami"
                          className="w-full text-xl sm:text-2xl font-extrabold text-slate-900 border-0 focus:ring-0 focus:outline-none px-0"
                        />
                      </div>

                      <WordRichEditor
                        value={pageForm.KontenHTML}
                        onChange={(html) => setPageForm((prev) => ({ ...prev, KontenHTML: html }))}
                        galleryItems={gallery}
                      />
                    </div>

                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                        Pengaturan Halaman
                      </h3>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Slug Halaman</label>
                        <input
                          type="text"
                          value={pageForm.SlugHalaman}
                          onChange={(e) => setPageForm((prev) => ({ ...prev, SlugHalaman: slugifyClient(e.target.value) }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Tampil di Menu</label>
                          <select
                            value={pageForm.TampilDiMenu}
                            onChange={(e) => setPageForm((prev) => ({ ...prev, TampilDiMenu: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                          >
                            <option value="Ya">Ya</option>
                            <option value="Tidak">Tidak</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Urutan Menu</label>
                          <input
                            type="number"
                            min={0}
                            value={pageForm.UrutanMenu}
                            onChange={(e) => setPageForm((prev) => ({ ...prev, UrutanMenu: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                        <select
                          value={pageForm.Status}
                          onChange={(e) => setPageForm((prev) => ({ ...prev, Status: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                        >
                          <option value="Draf">Draf</option>
                          <option value="Terbit">Terbit</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* M6: GALERI */}
              {activeMenu === 'gallery' && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                      <input
                        type="search"
                        value={galSearch}
                        onChange={(e) => setGalSearch(e.target.value)}
                        placeholder="Cari judul atau keterangan foto..."
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm flex-1"
                      />
                      <select
                        value={galAlbumFilter}
                        onChange={(e) => setGalAlbumFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                      >
                        {galAlbums.map((alb) => (
                          <option key={alb} value={alb}>{alb === 'Semua' ? 'Semua Album' : alb}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => openGalleryModal(null)}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 shrink-0 cursor-pointer"
                    >
                      + Tambah Foto
                    </button>
                  </div>

                  {filteredGallery.length === 0 ? (
                    <EmptyState
                      title="Galeri foto masih kosong"
                      description="Tambahkan URL foto/gambar untuk ditampilkan di galeri atau disisipkan ke artikel."
                      actionLabel="+ Tambah Foto"
                      onAction={() => openGalleryModal(null)}
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredGallery.map((item) => (
                        <div key={item.ID} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                          <div className="aspect-video bg-slate-100">
                            <SafeImage
                              src={item.GambarURL}
                              alt={item.JudulFoto}
                              className="w-full h-full object-cover"
                              fallbackText={item.JudulFoto}
                            />
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[11px] font-bold text-red-600 truncate">{item.Album}</span>
                                <StatusBadge status={item.Status} />
                              </div>
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">{item.JudulFoto}</h3>
                              {item.Keterangan && (
                                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.Keterangan}</p>
                              )}
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(item.GambarURL || '');
                                  showToast('URL gambar disalin.', 'success');
                                }}
                                className="text-[11px] font-bold text-slate-600 hover:text-red-600 cursor-pointer"
                              >
                                Salin URL
                              </button>
                              <div className="space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => openGalleryModal(item)}
                                  className="text-[11px] font-semibold text-slate-700 hover:underline cursor-pointer"
                                >
                                  Ubah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteGallery(item)}
                                  className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* M7: MANAJEMEN WIDGET SIDEBAR (KIRI & KANAN) */}
              {activeMenu === 'widgets' && isAdmin && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex md:hidden rounded-lg bg-slate-200/70 p-1">
                      <button
                        type="button"
                        onClick={() => setWdgMobileTab('Kiri')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                          wdgMobileTab === 'Kiri' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Sidebar Kiri ({leftWidgetsCms.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setWdgMobileTab('Kanan')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                          wdgMobileTab === 'Kanan' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Sidebar Kanan ({rightWidgetsCms.length})
                      </button>
                    </div>

                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => openWidgetModal(null, 'Kiri')}
                        className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        + Widget Kiri
                      </button>
                      <button
                        type="button"
                        onClick={() => openWidgetModal(null, 'Kanan')}
                        className="px-3.5 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                      >
                        + Widget Kanan
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Kolom Sidebar Kiri */}
                    <div className={`${wdgMobileTab === 'Kiri' ? 'block' : 'hidden md:block'} bg-white border border-slate-200 rounded-xl p-5 space-y-3`}>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h2 className="text-sm font-extrabold text-slate-900">Sidebar Kiri</h2>
                        <span className="text-xs font-semibold text-slate-500">{leftWidgetsCms.length} Widget</span>
                      </div>
                      {leftWidgetsCms.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4">Belum ada widget di Sidebar Kiri.</p>
                      ) : (
                        leftWidgetsCms.map((w, idx) => (
                          <div key={w.ID} className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-400">#{w.Urutan}</span>
                                <span className="text-sm font-bold text-slate-900">{w.JudulWidget}</span>
                                <StatusBadge status={w.StatusAktif} />
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Tipe: <strong>{w.TipeWidget}</strong></p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" disabled={idx === 0} onClick={() => moveWidgetOrder(leftWidgetsCms, idx, -1)} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs disabled:opacity-30 cursor-pointer">↑</button>
                              <button type="button" disabled={idx === leftWidgetsCms.length - 1} onClick={() => moveWidgetOrder(leftWidgetsCms, idx, 1)} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs disabled:opacity-30 cursor-pointer">↓</button>
                              <button type="button" onClick={() => openWidgetModal(w, 'Kiri')} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-semibold cursor-pointer">Ubah</button>
                              <button type="button" onClick={() => confirmDeleteWidget(w)} className="px-2 py-1 rounded bg-red-50 text-red-600 text-xs font-semibold cursor-pointer">✕</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Kolom Sidebar Kanan */}
                    <div className={`${wdgMobileTab === 'Kanan' ? 'block' : 'hidden md:block'} bg-white border border-slate-200 rounded-xl p-5 space-y-3`}>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h2 className="text-sm font-extrabold text-slate-900">Sidebar Kanan</h2>
                        <span className="text-xs font-semibold text-slate-500">{rightWidgetsCms.length} Widget</span>
                      </div>
                      {rightWidgetsCms.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4">Belum ada widget di Sidebar Kanan.</p>
                      ) : (
                        rightWidgetsCms.map((w, idx) => (
                          <div key={w.ID} className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-400">#{w.Urutan}</span>
                                <span className="text-sm font-bold text-slate-900">{w.JudulWidget}</span>
                                <StatusBadge status={w.StatusAktif} />
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Tipe: <strong>{w.TipeWidget}</strong></p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" disabled={idx === 0} onClick={() => moveWidgetOrder(rightWidgetsCms, idx, -1)} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs disabled:opacity-30 cursor-pointer">↑</button>
                              <button type="button" disabled={idx === rightWidgetsCms.length - 1} onClick={() => moveWidgetOrder(rightWidgetsCms, idx, 1)} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs disabled:opacity-30 cursor-pointer">↓</button>
                              <button type="button" onClick={() => openWidgetModal(w, 'Kanan')} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-semibold cursor-pointer">Ubah</button>
                              <button type="button" onClick={() => confirmDeleteWidget(w)} className="px-2 py-1 rounded bg-red-50 text-red-600 text-xs font-semibold cursor-pointer">✕</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* M4: PENGGUNA & KEAMANAN */}
              {activeMenu === 'users' && isAdmin && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900">Akun Tim Redaksi</h2>
                      <button
                        type="button"
                        onClick={() => openUserModal(null)}
                        className="px-3.5 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                      >
                        + Tambah Pengguna
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                            <th className="py-2.5 px-3">Username</th>
                            <th className="py-2.5 px-3">Nama Lengkap</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {usersList.map((u) => (
                            <tr key={u.ID}>
                              <td className="py-2.5 px-3 font-semibold">{u.Username}</td>
                              <td className="py-2.5 px-3">{u.NamaLengkap}</td>
                              <td className="py-2.5 px-3 text-xs font-bold">{u.Role}</td>
                              <td className="py-2.5 px-3"><StatusBadge status={u.StatusAktif} /></td>
                              <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openUserModal(u)}
                                  className="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold cursor-pointer"
                                >
                                  Ubah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-semibold cursor-pointer"
                                >
                                  {u.StatusAktif === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h2 className="text-base font-bold text-slate-900">Log Keamanan & Audit</h2>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="search"
                          value={logSearch}
                          onChange={(e) => {
                            setLogSearch(e.target.value);
                            refreshUsersAndLogs(logActionFilter, e.target.value);
                          }}
                          placeholder="Cari aktor atau detail..."
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                        />
                        <select
                          value={logActionFilter}
                          onChange={(e) => {
                            setLogActionFilter(e.target.value);
                            refreshUsersAndLogs(e.target.value, logSearch);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        >
                          <option value="">Semua Aksi</option>
                          <option value="LOGIN_SUKSES">LOGIN_SUKSES</option>
                          <option value="LOGIN_GAGAL">LOGIN_GAGAL</option>
                          <option value="BUAT_ARTIKEL">BUAT_ARTIKEL</option>
                          <option value="UBAH_ARTIKEL">UBAH_ARTIKEL</option>
                          <option value="HAPUS_ARTIKEL">HAPUS_ARTIKEL</option>
                          <option value="UBAH_SISTEM">UBAH_SISTEM</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                            <th className="py-2.5 px-3">Tanggal</th>
                            <th className="py-2.5 px-3">Aktor</th>
                            <th className="py-2.5 px-3">Aksi</th>
                            <th className="py-2.5 px-3">Detail</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {logsList.map((lg) => (
                            <tr key={lg.ID}>
                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{lg.Dibuat}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{lg.UsernameAktor}</td>
                              <td className="py-2.5 px-3 font-bold text-red-600">{lg.Aksi}</td>
                              <td className="py-2.5 px-3 text-slate-600">{lg.Detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* M8: PENGATURAN SISTEM */}
              {activeMenu === 'settings' && isAdmin && (
                <form onSubmit={submitSettings} className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="flex gap-2">
                      {['Identitas', 'KontakSosmed', 'Sistem'].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setSettingsTab(tab)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                            settingsTab === tab
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {tab === 'Identitas' ? 'Identitas Website' : tab === 'KontakSosmed' ? 'Kontak & Sosial Media' : 'Preferensi Sistem'}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                  </div>

                  {settingsTab === 'Identitas' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nama Website</label>
                        <input
                          type="text"
                          value={settingsForm.NamaWebsite || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, NamaWebsite: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
                        <input
                          type="text"
                          value={settingsForm.Tagline || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, Tagline: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Logo URL</label>
                        <input
                          type="url"
                          value={settingsForm.LogoURL || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, LogoURL: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Favicon URL</label>
                        <input
                          type="url"
                          value={settingsForm.FaviconURL || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, FaviconURL: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi SEO</label>
                        <textarea
                          rows={2}
                          value={settingsForm.DeskripsiSEO || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, DeskripsiSEO: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Teks Footer</label>
                        <input
                          type="text"
                          value={settingsForm.TeksFooter || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, TeksFooter: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {settingsTab === 'KontakSosmed' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email Redaksi</label>
                        <input
                          type="email"
                          value={settingsForm.EmailRedaksi || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, EmailRedaksi: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon</label>
                        <input
                          type="text"
                          value={settingsForm.NomorTelepon || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, NomorTelepon: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Redaksi</label>
                        <input
                          type="text"
                          value={settingsForm.AlamatRedaksi || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, AlamatRedaksi: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Instagram URL</label>
                        <input
                          type="url"
                          value={settingsForm.InstagramURL || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, InstagramURL: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Facebook URL</label>
                        <input
                          type="url"
                          value={settingsForm.FacebookURL || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, FacebookURL: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">X / Twitter URL</label>
                        <input
                          type="url"
                          value={settingsForm.XTwitterURL || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, XTwitterURL: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">YouTube URL</label>
                        <input
                          type="url"
                          value={settingsForm.YouTubeURL || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, YouTubeURL: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {settingsTab === 'Sistem' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Artikel Per Halaman (3–30)</label>
                        <input
                          type="number"
                          min={3}
                          max={30}
                          value={settingsForm.ArtikelPerHalaman || '9'}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, ArtikelPerHalaman: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Mode Pemeliharaan</label>
                        <select
                          value={settingsForm.ModePemeliharaan || 'Nonaktif'}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, ModePemeliharaan: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                        >
                          <option value="Nonaktif">Nonaktif</option>
                          <option value="Aktif">Aktif</option>
                        </select>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </>
          )}
        </main>
      </div>

      {/* Bottom Navigation Mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid grid-cols-4 px-1 py-1.5">
        {[
          { id: 'dashboard', label: 'Beranda', icon: '◈' },
          { id: 'articles', label: 'Artikel', icon: '✎' },
          { id: 'gallery', label: 'Galeri', icon: '🖼' },
          { id: 'more', label: 'Menu', icon: '☰' },
        ].map((b) => {
          const isActive = activeMenu === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                if (b.id === 'more') setDrawerOpen(true);
                else setActiveMenu(b.id);
              }}
              className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                isActive ? 'text-red-600 bg-red-50' : 'text-slate-600'
              }`}
            >
              <span className="text-sm leading-none mb-0.5">{b.icon}</span>
              <span>{b.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modal Kategori */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={submitCategory} className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">{catForm.ID ? 'Ubah Kategori' : 'Tambah Kategori'}</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kategori</label>
              <input
                type="text"
                required
                value={catForm.NamaKategori}
                onChange={(e) => setCatForm((p) => ({ ...p, NamaKategori: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Warna Label</label>
              <input
                type="color"
                value={catForm.WarnaLabel || '#DC2626'}
                onChange={(e) => setCatForm((p) => ({ ...p, WarnaLabel: e.target.value }))}
                className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
              <textarea
                rows={2}
                value={catForm.Deskripsi}
                onChange={(e) => setCatForm((p) => ({ ...p, Deskripsi: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCatModalOpen(false)} className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer">
                Batal
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Galeri */}
      {galModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={submitGallery} className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-xl space-y-3.5">
            <h3 className="text-base font-bold text-slate-900">{galForm.ID ? 'Ubah Foto Galeri' : 'Tambah Foto Galeri'}</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Judul Foto</label>
              <input
                type="text"
                required
                value={galForm.JudulFoto}
                onChange={(e) => setGalForm((p) => ({ ...p, JudulFoto: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gambar URL</label>
              <input
                type="url"
                required
                value={galForm.GambarURL}
                onChange={(e) => setGalForm((p) => ({ ...p, GambarURL: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Album</label>
                <input
                  type="text"
                  value={galForm.Album}
                  onChange={(e) => setGalForm((p) => ({ ...p, Album: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={galForm.Status}
                  onChange={(e) => setGalForm((p) => ({ ...p, Status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="Tampil">Tampil</option>
                  <option value="Sembunyi">Sembunyi</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kredit Fotografer</label>
              <input
                type="text"
                value={galForm.KreditFotografer}
                onChange={(e) => setGalForm((p) => ({ ...p, KreditFotografer: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan</label>
              <textarea
                rows={2}
                value={galForm.Keterangan}
                onChange={(e) => setGalForm((p) => ({ ...p, Keterangan: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setGalModalOpen(false)} className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer">
                Batal
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Widget Sidebar */}
      {wdgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={submitWidget} className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-xl space-y-3.5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">{wdgForm.ID ? 'Ubah Widget Sidebar' : 'Tambah Widget Sidebar'}</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Judul Widget</label>
              <input
                type="text"
                required
                value={wdgForm.JudulWidget}
                onChange={(e) => setWdgForm((p) => ({ ...p, JudulWidget: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Posisi Sidebar</label>
                <select
                  value={wdgForm.Posisi}
                  onChange={(e) => setWdgForm((p) => ({ ...p, Posisi: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="Kiri">Kiri</option>
                  <option value="Kanan">Kanan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Widget</label>
                <select
                  value={wdgForm.TipeWidget}
                  onChange={(e) => setWdgForm((p) => ({ ...p, TipeWidget: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="BeritaPopuler">BeritaPopuler</option>
                  <option value="DaftarKategori">DaftarKategori</option>
                  <option value="BannerGambar">BannerGambar</option>
                  <option value="GaleriMini">GaleriMini</option>
                  <option value="TeksHTML">TeksHTML</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {['BeritaPopuler', 'DaftarKategori', 'GaleriMini'].includes(wdgForm.TipeWidget)
                  ? 'Jumlah Item Ditampilkan'
                  : 'Konten Teks / HTML'}
              </label>
              <textarea
                rows={3}
                value={wdgForm.KontenWidget}
                onChange={(e) => setWdgForm((p) => ({ ...p, KontenWidget: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            {wdgForm.TipeWidget === 'BannerGambar' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gambar URL</label>
                  <input
                    type="url"
                    value={wdgForm.GambarURL}
                    onChange={(e) => setWdgForm((p) => ({ ...p, GambarURL: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tautan URL</label>
                  <input
                    type="url"
                    value={wdgForm.TautanURL}
                    onChange={(e) => setWdgForm((p) => ({ ...p, TautanURL: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Urutan</label>
                <input
                  type="number"
                  min={1}
                  value={wdgForm.Urutan}
                  onChange={(e) => setWdgForm((p) => ({ ...p, Urutan: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={wdgForm.StatusAktif}
                  onChange={(e) => setWdgForm((p) => ({ ...p, StatusAktif: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setWdgModalOpen(false)} className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer">
                Batal
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Pengguna */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={submitUser} className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-xl space-y-3.5">
            <h3 className="text-base font-bold text-slate-900">{userForm.ID ? 'Ubah Pengguna' : 'Tambah Pengguna'}</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={userForm.Username}
                onChange={(e) => setUserForm((p) => ({ ...p, Username: e.target.value.toLowerCase() }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={userForm.NamaLengkap}
                onChange={(e) => setUserForm((p) => ({ ...p, NamaLengkap: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
              <select
                value={userForm.Role}
                onChange={(e) => setUserForm((p) => ({ ...p, Role: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="Editor">Editor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {userForm.ID ? 'Kata Sandi Baru (kosongkan jika tidak diubah)' : 'Kata Sandi (min. 6 karakter)'}
              </label>
              <input
                type="password"
                required={!userForm.ID}
                value={userForm.Password}
                onChange={(e) => setUserForm((p) => ({ ...p, Password: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setUserModalOpen(false)} className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer">
                Batal
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <HtmlPreviewModal
        open={articlePreviewOpen}
        title={articleForm.Judul}
        html={articleForm.KontenHTML}
        onClose={() => setArticlePreviewOpen(false)}
      />

      <HtmlPreviewModal
        open={pagePreviewOpen}
        title={pageForm.JudulHalaman}
        html={pageForm.KontenHTML}
        onClose={() => setPagePreviewOpen(false)}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        loading={saving}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
