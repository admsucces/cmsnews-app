import React, { useState } from 'react';
import { gasApi } from '../api/gasClient';

export default function LoginPage({ siteName = 'WartaPress', onLoginSuccess, onBackToPortal }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const data = await gasApi.login(username.trim(), password);
      onLoginSuccess(data);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal masuk ke sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
              Panel Redaksi
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{siteName}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Masuk untuk mengelola berita, halaman, dan portal</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="wp-username" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              id="wp-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-600"
            />
          </div>

          <div>
            <label htmlFor="wp-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              id="wp-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Memverifikasi Sesi...' : 'Masuk ke CMS'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToPortal}
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-red-600 cursor-pointer"
          >
            ← Kembali ke Portal Berita Publik
          </button>
        </div>
      </div>
    </div>
  );
}
