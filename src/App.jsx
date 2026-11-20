import React, { useCallback, useEffect, useState } from 'react';
import { clearSavedSession, gasApi, getSavedSession, saveSession } from './api/gasClient';
import { ToastBanner } from './components/UiShared';
import LoginPage from './pages/LoginPage';
import PublicPortal from './pages/PublicPortal';
import CmsWorkspace from './pages/CmsWorkspace';

const PUBLIC_CACHE_KEY = 'wartapress_public_cache_v3';

function readLocalPublicCache() {
  try {
    const raw = localStorage.getItem(PUBLIC_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalPublicCache(data) {
  try {
    if (data) {
      localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(data));
    }
  } catch {
    // Abaikan jika kuota penuh
  }
}

export default function App() {
  const [session, setSession] = useState(() => getSavedSession());
  const [route, setRoute] = useState('portal'); // 'portal' | 'login' | 'cms'
  const [publicData, setPublicData] = useState(() => readLocalPublicCache());
  const [publicLoading, setPublicLoading] = useState(() => !readLocalPublicCache());
  const [publicError, setPublicError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const loadPublicData = useCallback(async () => {
    setPublicError('');
    if (!readLocalPublicCache()) setPublicLoading(true);
    try {
      const data = await gasApi.publicBootstrap();
      setPublicData(data);
      writeLocalPublicCache(data);
    } catch (err) {
      setPublicError(err.message || 'Gagal memuat data portal berita.');
    } finally {
      setPublicLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  useEffect(() => {
    const onSessionExpired = (ev) => {
      setSession(null);
      setRoute('login');
      showToast(ev.detail || 'Sesi berakhir. Silakan login kembali.', 'error');
    };
    window.addEventListener('wartapress:sesi-habis', onSessionExpired);
    return () => window.removeEventListener('wartapress:sesi-habis', onSessionExpired);
  }, [showToast]);

  const handleLoginSuccess = (loginPayload) => {
    saveSession(loginPayload);
    setSession(loginPayload);
    setRoute('cms');
    showToast(`Selamat datang, ${loginPayload?.user?.NamaLengkap || 'Redaksi'}.`, 'success');
  };

  const handleLogout = async () => {
    try {
      await gasApi.logout();
    } catch {
      // Tetap bersihkan sesi lokal
    }
    clearSavedSession();
    setSession(null);
    setRoute('portal');
    showToast('Anda telah keluar dari sesi CMS.', 'success');
  };

  return (
    <>
      <ToastBanner toast={toast} onClose={() => setToast(null)} />

      {route === 'login' && (
        <LoginPage
          siteName={publicData?.settings?.NamaWebsite || 'WartaPress'}
          onLoginSuccess={handleLoginSuccess}
          onBackToPortal={() => setRoute('portal')}
        />
      )}

      {route === 'cms' && session && (
        <CmsWorkspace
          session={session}
          onLogout={handleLogout}
          onOpenPortal={() => {
            loadPublicData();
            setRoute('portal');
          }}
          showToast={showToast}
        />
      )}

      {route === 'portal' && (
        <PublicPortal
          bootstrapData={publicData}
          loading={publicLoading}
          error={publicError}
          onRefresh={loadPublicData}
          session={session}
          onGoToCms={() => setRoute('cms')}
          onGoToLogin={() => setRoute('login')}
        />
      )}
    </>
  );
}
