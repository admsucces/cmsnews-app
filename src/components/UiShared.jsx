import React, { useEffect } from 'react';

export function StatusBadge({ status }) {
  const s = String(status || '').trim();
  let cls = 'bg-slate-100 text-slate-700 border-slate-200';
  if (['Terbit', 'Aktif', 'Tampil'].includes(s)) {
    cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['Draf'].includes(s)) {
    cls = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['Arsip', 'Nonaktif', 'Sembunyi'].includes(s)) {
    cls = 'bg-slate-100 text-slate-600 border-slate-200';
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {s || '-'}
    </span>
  );
}

export function ToastBanner({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose(), 3600);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full sm:w-auto px-4">
      <div
        role="alert"
        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
          isError
            ? 'bg-red-600 text-white border-red-700'
            : 'bg-slate-900 text-white border-slate-800'
        }`}
      >
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-white/80 hover:text-white text-xs font-bold px-1.5 py-0.5 cursor-pointer"
          aria-label="Tutup notifikasi"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-lg font-bold">
        WP
      </div>
      <h4 className="mt-3 text-base font-bold text-slate-900">{title}</h4>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-red-800">Terjadi Kendala Koneksi</p>
        <p className="text-xs text-red-700 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shrink-0 cursor-pointer"
        >
          Muat Ulang
        </button>
      )}
    </div>
  );
}

export function SafeImage({ src, alt, className = '', fallbackText = 'WartaPress' }) {
  const [failed, setFailed] = React.useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-semibold select-none ${className}`}>
        <span>{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || fallbackText}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
