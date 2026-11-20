import React, { useEffect, useMemo, useState } from 'react';
import { gasApi } from '../api/gasClient';
import { EmptyState, ErrorBanner, SafeImage } from '../components/UiShared';

function WidgetCard({
  widget,
  articles,
  categories,
  gallery,
  onOpenArticle,
  onSelectCategory,
  onOpenGalleryPage,
  onOpenLightbox,
}) {
  const limitCount = Math.max(1, Math.min(10, parseInt(widget.KontenWidget, 10) || 5));

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
      <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-200">
        <span className="w-1 h-4 rounded-full bg-red-600 shrink-0" />
        <h3 className="text-sm font-bold text-slate-900">{widget.JudulWidget}</h3>
      </div>

      {widget.TipeWidget === 'BeritaPopuler' && (
        <div className="space-y-3">
          {articles.slice(0, limitCount).map((art, idx) => (
            <button
              key={art.ID}
              type="button"
              onClick={() => onOpenArticle(art)}
              className="w-full text-left flex items-start gap-2.5 group cursor-pointer"
            >
              <span className="text-xs font-extrabold text-red-600 mt-0.5 w-4 shrink-0">
                0{idx + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-red-600 line-clamp-2 leading-snug">
                  {art.Judul}
                </p>
                <span className="text-[11px] text-slate-400">{art.NamaKategori} • {art.Dibuat}</span>
              </div>
            </button>
          ))}
          {articles.length === 0 && <p className="text-xs text-slate-400">Belum ada berita terbit.</p>}
        </div>
      )}

      {widget.TipeWidget === 'DaftarKategori' && (
        <div className="flex flex-wrap gap-1.5">
          {categories.slice(0, limitCount).map((cat) => (
            <button
              key={cat.ID}
              type="button"
              onClick={() => onSelectCategory(cat.SlugKategori)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 transition-colors cursor-pointer"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.WarnaLabel || '#DC2626' }}
              />
              <span>{cat.NamaKategori}</span>
            </button>
          ))}
        </div>
      )}

      {widget.TipeWidget === 'BannerGambar' && (
        <div className="space-y-2">
          {widget.TautanURL ? (
            <a
              href={widget.TautanURL}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border border-slate-200"
            >
              <SafeImage
                src={widget.GambarURL}
                alt={widget.JudulWidget}
                className="w-full h-36 object-cover"
                fallbackText={widget.JudulWidget}
              />
            </a>
          ) : (
            <SafeImage
              src={widget.GambarURL}
              alt={widget.JudulWidget}
              className="w-full h-36 object-cover rounded-lg border border-slate-200"
              fallbackText={widget.JudulWidget}
            />
          )}
          {widget.KontenWidget && (
            <p className="text-xs text-slate-600 leading-relaxed">{widget.KontenWidget}</p>
          )}
        </div>
      )}

      {widget.TipeWidget === 'GaleriMini' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {gallery.slice(0, limitCount).map((g) => (
              <button
                key={g.ID}
                type="button"
                onClick={() => onOpenLightbox(g)}
                className="group relative rounded-lg overflow-hidden border border-slate-200 aspect-video cursor-pointer"
              >
                <SafeImage
                  src={g.GambarURL}
                  alt={g.JudulFoto}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  fallbackText={g.JudulFoto}
                />
              </button>
            ))}
          </div>
          {onOpenGalleryPage && (
            <button
              type="button"
              onClick={onOpenGalleryPage}
              className="w-full py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer"
            >
              Lihat Semua Galeri →
            </button>
          )}
        </div>
      )}

      {widget.TipeWidget === 'TeksHTML' && (
        <div
          className="article-prose text-xs sm:text-sm text-slate-600"
          dangerouslySetInnerHTML={{ __html: widget.KontenWidget || '' }}
        />
      )}
    </section>
  );
}

export default function PublicPortal({
  bootstrapData,
  loading,
  error,
  onRefresh,
  session,
  onGoToCms,
  onGoToLogin,
}) {
  const [viewMode, setViewMode] = useState('home'); // 'home' | 'article' | 'page' | 'gallery'
  const [activeCategorySlug, setActiveCategorySlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [detailArticle, setDetailArticle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [detailPage, setDetailPage] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  const [selectedAlbum, setSelectedAlbum] = useState('Semua');
  const [lightboxItem, setLightboxItem] = useState(null);

  const settings = bootstrapData?.settings || {};
  const categories = bootstrapData?.categories || [];
  const articles = bootstrapData?.articles || [];
  const pages = bootstrapData?.pages || [];
  const gallery = bootstrapData?.gallery || [];
  const widgets = bootstrapData?.widgets || [];

  const siteName = settings.NamaWebsite || 'WartaPress';
  const tagline = settings.Tagline || 'Portal Berita Editorial Terpercaya & Aktual';
  const perPage = Math.max(3, parseInt(settings.ArtikelPerHalaman, 10) || 9);
  const maintenanceMode = settings.ModePemeliharaan === 'Aktif' && !session;

  useEffect(() => {
    if (settings.FaviconURL) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.FaviconURL;
    }
    document.title = `${siteName} — ${tagline}`;
  }, [settings.FaviconURL, siteName, tagline]);

  const leftWidgets = useMemo(
    () => widgets.filter((w) => w.Posisi === 'Kiri'),
    [widgets]
  );
  const rightWidgets = useMemo(
    () => widgets.filter((w) => w.Posisi === 'Kanan'),
    [widgets]
  );

  const menuPages = useMemo(
    () => pages.filter((p) => p.TampilDiMenu === 'Ya'),
    [pages]
  );

  const headlineArticle = useMemo(() => {
    return articles.find((a) => a.BeritaUtama === 'Ya') || articles[0] || null;
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((art) => {
      if (activeCategorySlug) {
        const matchedCat = categories.find((c) => c.SlugKategori === activeCategorySlug);
        if (matchedCat && art.KategoriID !== matchedCat.ID) return false;
      }
      if (q) {
        const inTitle = String(art.Judul || '').toLowerCase().includes(q);
        const inSummary = String(art.Ringkasan || '').toLowerCase().includes(q);
        const inTag = String(art.Tag || '').toLowerCase().includes(q);
        if (!inTitle && !inSummary && !inTag) return false;
      }
      return true;
    });
  }, [articles, categories, activeCategorySlug, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedArticles = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredArticles.slice(start, start + perPage);
  }, [filteredArticles, safePage, perPage]);

  const openArticleDetail = async (art) => {
    setViewMode('article');
    setDetailArticle(art);
    setDetailError('');
    setDetailLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const data = await gasApi.publicArticleDetail(art.ID, art.SlugURL);
      if (data?.article) setDetailArticle(data.article);
    } catch (err) {
      setDetailError(err.message || 'Gagal memuat isi lengkap artikel.');
    } finally {
      setDetailLoading(false);
    }
  };

  const openStaticPage = async (pg) => {
    setViewMode('page');
    setDetailPage(pg);
    setPageError('');
    setPageLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const data = await gasApi.publicPageDetail(pg.ID, pg.SlugHalaman);
      if (data?.page) setDetailPage(data.page);
    } catch (err) {
      setPageError(err.message || 'Gagal memuat halaman.');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSelectCategory = (slug) => {
    setActiveCategorySlug(slug);
    setCurrentPage(1);
    setViewMode('home');
    setMobileMenuOpen(false);
  };

  const albums = useMemo(() => {
    const set = new Set(['Semua']);
    gallery.forEach((g) => {
      if (g.Album) set.add(g.Album);
    });
    return Array.from(set);
  }, [gallery]);

  const filteredGallery = useMemo(() => {
    if (selectedAlbum === 'Semua') return gallery;
    return gallery.filter((g) => g.Album === selectedAlbum);
  }, [gallery, selectedAlbum]);

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Mode Pemeliharaan
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-3">{siteName}</h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Portal berita sedang dalam pembaruan sistem terjadwal agar layanan tetap cepat dan aman. Silakan kembali beberapa saat lagi.
          </p>
          <button
            type="button"
            onClick={onGoToLogin}
            className="mt-6 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Login Tim Redaksi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header Utama Portal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                setActiveCategorySlug('');
                setSearchQuery('');
                setViewMode('home');
                setCurrentPage(1);
              }}
              className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
            >
              {settings.LogoURL ? (
                <SafeImage
                  src={settings.LogoURL}
                  alt={siteName}
                  className="h-9 w-auto max-w-[140px] object-contain shrink-0"
                  fallbackText={siteName}
                />
              ) : (
                <span className="w-9 h-9 rounded-lg bg-red-600 text-white font-extrabold flex items-center justify-center shrink-0">
                  {siteName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-extrabold text-slate-900 truncate leading-tight">
                  {siteName}
                </p>
                <p className="text-[11px] text-slate-500 truncate hidden sm:block">{tagline}</p>
              </div>
            </button>
          </div>

          {/* Pencarian Desktop */}
          <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
                if (viewMode !== 'home') setViewMode('home');
              }}
              placeholder="Cari berita atau topik..."
              className="w-full px-3.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:border-red-600"
            />
          </div>

          {/* Navigasi Halaman & Tombol CMS */}
          <div className="flex items-center gap-2 shrink-0">
            <nav className="hidden lg:flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => { setViewMode('gallery'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  viewMode === 'gallery' ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Galeri
              </button>
              {menuPages.map((pg) => (
                <button
                  key={pg.ID}
                  type="button"
                  onClick={() => openStaticPage(pg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    viewMode === 'page' && detailPage?.ID === pg.ID
                      ? 'bg-red-50 text-red-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {pg.JudulHalaman}
                </button>
              ))}
            </nav>

            {session ? (
              <button
                type="button"
                onClick={onGoToCms}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Masuk CMS
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToLogin}
                className="px-3.5 py-2 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Login CMS
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold cursor-pointer"
              aria-label="Buka menu portal"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Bar Kategori */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto py-2">
            <button
              type="button"
              onClick={() => handleSelectCategory('')}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                viewMode === 'home' && activeCategorySlug === ''
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Berita
            </button>
            {categories.map((cat) => {
              const active = viewMode === 'home' && activeCategorySlug === cat.SlugKategori;
              return (
                <button
                  key={cat.ID}
                  type="button"
                  onClick={() => handleSelectCategory(cat.SlugKategori)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.NamaKategori}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer / Dropdown Mobile & Tablet */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-3 space-y-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
                setViewMode('home');
              }}
              placeholder="Cari berita..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setViewMode('gallery'); setMobileMenuOpen(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 cursor-pointer"
              >
                Galeri Foto
              </button>
              {menuPages.map((pg) => (
                <button
                  key={pg.ID}
                  type="button"
                  onClick={() => { openStaticPage(pg); setMobileMenuOpen(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 cursor-pointer"
                >
                  {pg.JudulHalaman}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Tata Letak Utama: Sidebar Kiri + Konten Utama + Sidebar Kanan */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} onRetry={onRefresh} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sidebar Kiri (Desktop: 2 kolom / ~240px, Tablet & Mobile: di bawah konten utama) */}
          <aside className="order-2 lg:order-1 lg:col-span-2 space-y-4">
            {leftWidgets.length > 0 ? (
              leftWidgets.map((w) => (
                <WidgetCard
                  key={w.ID}
                  widget={w}
                  articles={articles}
                  categories={categories}
                  gallery={gallery}
                  onOpenArticle={openArticleDetail}
                  onSelectCategory={handleSelectCategory}
                  onOpenGalleryPage={() => { setViewMode('gallery'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onOpenLightbox={setLightboxItem}
                />
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
                <p className="font-bold text-slate-700 mb-1">Kanal Populer</p>
                <div className="space-y-1.5">
                  {categories.map((c) => (
                    <button
                      key={c.ID}
                      type="button"
                      onClick={() => handleSelectCategory(c.SlugKategori)}
                      className="block text-left text-slate-600 hover:text-red-600 font-medium cursor-pointer"
                    >
                      • {c.NamaKategori}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Konten Utama Tengah */}
          <main className="order-1 lg:order-2 lg:col-span-7 min-w-0 space-y-6">
            {loading && !bootstrapData ? (
              <div className="space-y-4">
                <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
                  <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
                </div>
              </div>
            ) : viewMode === 'article' && detailArticle ? (
              <article className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('home')}
                  className="text-xs font-bold text-red-600 hover:underline mb-4 inline-block cursor-pointer"
                >
                  ← Kembali ke Daftar Berita
                </button>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                    {detailArticle.NamaKategori || 'Berita'}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">{detailArticle.Dibuat}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">Oleh {detailArticle.NamaPenulis || 'Redaksi'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  {detailArticle.Judul}
                </h1>
                {detailArticle.Ringkasan && (
                  <p className="mt-3 text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                    {detailArticle.Ringkasan}
                  </p>
                )}
                {detailArticle.GambarUtamaURL && (
                  <div className="mt-5 rounded-xl overflow-hidden border border-slate-200">
                    <SafeImage
                      src={detailArticle.GambarUtamaURL}
                      alt={detailArticle.Judul}
                      className="w-full max-h-[420px] object-cover"
                      fallbackText={detailArticle.Judul}
                    />
                  </div>
                )}

                {detailLoading ? (
                  <div className="mt-6 space-y-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-4/6" />
                  </div>
                ) : detailError ? (
                  <div className="mt-6">
                    <ErrorBanner message={detailError} onRetry={() => openArticleDetail(detailArticle)} />
                  </div>
                ) : (
                  <div
                    className="mt-6 article-prose"
                    dangerouslySetInnerHTML={{ __html: detailArticle.KontenHTML || '' }}
                  />
                )}

                {detailArticle.Tag && (
                  <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Tag:</span>
                    {String(detailArticle.Tag)
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tagItem) => (
                        <button
                          key={tagItem}
                          type="button"
                          onClick={() => {
                            setSearchQuery(tagItem);
                            setViewMode('home');
                            setCurrentPage(1);
                          }}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          #{tagItem}
                        </button>
                      ))}
                  </div>
                )}
              </article>
            ) : viewMode === 'page' && detailPage ? (
              <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('home')}
                  className="text-xs font-bold text-red-600 hover:underline mb-4 inline-block cursor-pointer"
                >
                  ← Kembali ke Beranda
                </button>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{detailPage.JudulHalaman}</h1>
                {detailPage.Diperbarui && (
                  <p className="text-xs text-slate-400 mt-1">Diperbarui {detailPage.Diperbarui}</p>
                )}
                {pageLoading ? (
                  <div className="mt-6 space-y-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-4/5" />
                  </div>
                ) : pageError ? (
                  <div className="mt-6">
                    <ErrorBanner message={pageError} onRetry={() => openStaticPage(detailPage)} />
                  </div>
                ) : (
                  <div
                    className="mt-6 article-prose"
                    dangerouslySetInnerHTML={{ __html: detailPage.KontenHTML || '' }}
                  />
                )}
              </div>
            ) : viewMode === 'gallery' ? (
              <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => setViewMode('home')}
                      className="text-xs font-bold text-red-600 hover:underline mb-1 inline-block cursor-pointer"
                    >
                      ← Kembali ke Beranda
                    </button>
                    <h1 className="text-2xl font-extrabold text-slate-900">Galeri Foto Publik</h1>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {albums.map((alb) => (
                      <button
                        key={alb}
                        type="button"
                        onClick={() => setSelectedAlbum(alb)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer ${
                          selectedAlbum === alb
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {alb}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredGallery.length === 0 ? (
                  <EmptyState
                    title="Belum ada foto galeri"
                    description="Koleksi foto publik akan tampil di sini setelah ditambahkan dari CMS."
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredGallery.map((item) => (
                      <button
                        key={item.ID}
                        type="button"
                        onClick={() => setLightboxItem(item)}
                        className="group text-left bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-red-400 transition-colors cursor-pointer"
                      >
                        <SafeImage
                          src={item.GambarURL}
                          alt={item.JudulFoto}
                          className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform"
                          fallbackText={item.JudulFoto}
                        />
                        <div className="p-3">
                          <span className="text-[11px] font-bold text-red-600 uppercase">{item.Album}</span>
                          <h3 className="text-sm font-bold text-slate-900 mt-0.5">{item.JudulFoto}</h3>
                          {item.Keterangan && (
                            <p className="text-xs text-slate-600 line-clamp-2 mt-1">{item.Keterangan}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Hero Headline */}
                {headlineArticle && !activeCategorySlug && !searchQuery && safePage === 1 && (
                  <div
                    onClick={() => openArticleDetail(headlineArticle)}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-red-300 transition-colors cursor-pointer group"
                  >
                    {headlineArticle.GambarUtamaURL && (
                      <div className="aspect-video max-h-80 w-full overflow-hidden bg-slate-100">
                        <SafeImage
                          src={headlineArticle.GambarUtamaURL}
                          alt={headlineArticle.Judul}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          fallbackText={headlineArticle.Judul}
                        />
                      </div>
                    )}
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-600 text-white">
                          Berita Utama
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {headlineArticle.NamaKategori}
                        </span>
                        <span className="text-xs text-slate-400">{headlineArticle.Dibuat}</span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 group-hover:text-red-600 leading-snug">
                        {headlineArticle.Judul}
                      </h1>
                      {headlineArticle.Ringkasan && (
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {headlineArticle.Ringkasan}
                        </p>
                      )}
                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        Oleh {headlineArticle.NamaPenulis}
                      </p>
                    </div>
                  </div>
                )}

                {/* Judul Bagian Berita Terkini / Filter */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-red-600" />
                    {activeCategorySlug
                      ? `Kanal: ${categories.find((c) => c.SlugKategori === activeCategorySlug)?.NamaKategori || activeCategorySlug}`
                      : searchQuery
                        ? `Hasil Pencarian: "${searchQuery}"`
                        : 'Berita Terkini'}
                  </h2>
                  {(activeCategorySlug || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategorySlug('');
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                {/* Daftar Berita */}
                {paginatedArticles.length === 0 ? (
                  <EmptyState
                    title="Belum ada artikel yang cocok"
                    description="Coba pilih kategori lain atau bersihkan kata kunci pencarian Anda."
                    actionLabel="Tampilkan Semua Berita"
                    onAction={() => {
                      setActiveCategorySlug('');
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paginatedArticles.map((art) => (
                      <article
                        key={art.ID}
                        onClick={() => openArticleDetail(art)}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-red-300 transition-colors flex flex-col cursor-pointer group"
                      >
                        <div className="aspect-video w-full overflow-hidden bg-slate-100">
                          <SafeImage
                            src={art.GambarUtamaURL}
                            alt={art.Judul}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                            fallbackText={art.NamaKategori}
                          />
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold mb-1.5">
                              <span className="text-red-600 font-bold">{art.NamaKategori}</span>
                              <span className="text-slate-400">{art.Dibuat}</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-red-600 line-clamp-2 leading-snug">
                              {art.Judul}
                            </h3>
                            {art.Ringkasan && (
                              <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {art.Ringkasan}
                              </p>
                            )}
                          </div>
                          <p className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                            {art.NamaPenulis}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {/* Paginasi */}
                {filteredArticles.length > perPage && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      Halaman <strong>{safePage}</strong> dari <strong>{totalPages}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
                      >
                        Sebelumnya
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>

          {/* Sidebar Kanan (Desktop: 3 kolom / ~280px, Tablet & Mobile: di bawah konten utama) */}
          <aside className="order-3 lg:col-span-3 space-y-4">
            {rightWidgets.length > 0 ? (
              rightWidgets.map((w) => (
                <WidgetCard
                  key={w.ID}
                  widget={w}
                  articles={articles}
                  categories={categories}
                  gallery={gallery}
                  onOpenArticle={openArticleDetail}
                  onSelectCategory={handleSelectCategory}
                  onOpenGalleryPage={() => { setViewMode('gallery'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onOpenLightbox={setLightboxItem}
                />
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Berita Terbaru</h3>
                <div className="space-y-2.5">
                  {articles.slice(0, 5).map((a) => (
                    <button
                      key={a.ID}
                      type="button"
                      onClick={() => openArticleDetail(a)}
                      className="block text-left text-xs font-semibold text-slate-700 hover:text-red-600 cursor-pointer"
                    >
                      • {a.Judul}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Footer Portal */}
      <footer className="bg-white border-t border-slate-200 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
          <div>
            <p className="text-sm font-extrabold text-slate-900">{siteName}</p>
            <p className="mt-1.5 leading-relaxed">{settings.DeskripsiSEO || tagline}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Kontak Redaksi</p>
            {settings.AlamatRedaksi && <p className="mb-1">{settings.AlamatRedaksi}</p>}
            {settings.EmailRedaksi && <p className="mb-1">Email: {settings.EmailRedaksi}</p>}
            {settings.NomorTelepon && <p>Telp: {settings.NomorTelepon}</p>}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Halaman & Sosial</p>
            <div className="flex flex-wrap gap-3 mb-2">
              {pages.map((pg) => (
                <button
                  key={pg.ID}
                  type="button"
                  onClick={() => openStaticPage(pg)}
                  className="font-semibold text-slate-700 hover:text-red-600 cursor-pointer"
                >
                  {pg.JudulHalaman}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {settings.InstagramURL && (
                <a href={settings.InstagramURL} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">
                  Instagram
                </a>
              )}
              {settings.FacebookURL && (
                <a href={settings.FacebookURL} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">
                  Facebook
                </a>
              )}
              {settings.XTwitterURL && (
                <a href={settings.XTwitterURL} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">
                  X / Twitter
                </a>
              )}
              {settings.YouTubeURL && (
                <a href={settings.YouTubeURL} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">
                  YouTube
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 px-4 text-center text-xs text-slate-500">
          {settings.TeksFooter || `© 2026 ${siteName}. Seluruh hak cipta dilindungi.`}
        </div>
      </footer>

      {/* Lightbox Galeri */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl"
          >
            <SafeImage
              src={lightboxItem.GambarURL}
              alt={lightboxItem.JudulFoto}
              className="w-full max-h-[65vh] object-contain bg-slate-900"
              fallbackText={lightboxItem.JudulFoto}
            />
            <div className="p-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{lightboxItem.JudulFoto}</h3>
                {lightboxItem.Keterangan && (
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">{lightboxItem.Keterangan}</p>
                )}
                {lightboxItem.KreditFotografer && (
                  <p className="text-[11px] text-slate-400 mt-1">Foto: {lightboxItem.KreditFotografer}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
