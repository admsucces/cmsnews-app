import React, { useEffect, useRef, useState } from 'react';

function sanitizeClientHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = String(html);
  div.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select,meta,link,base').forEach((el) => el.remove());
  div.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = String(attr.value || '').trim();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'src') && /^javascript:/i.test(val)) {
        el.setAttribute(attr.name, '#');
      } else if (name === 'style') {
        const alignMatch = val.match(/text-align\s*:\s*(left|center|right|justify)/i);
        if (alignMatch) {
          el.setAttribute('style', `text-align: ${alignMatch[1].toLowerCase()};`);
        } else {
          el.removeAttribute('style');
        }
      }
    });
  });
  return div.innerHTML;
}

export default function WordRichEditor({
  value = '',
  onChange,
  placeholder = 'Tulis naskah berita atau halaman di sini seperti di Microsoft Word...',
  galleryItems = [],
  maxChars = 48000,
}) {
  const editorRef = useRef(null);
  const [blockFormat, setBlockFormat] = useState('P');
  const [modalType, setModalType] = useState(null); // 'link' | 'image' | null
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const savedRangeRef = useRef(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const el = editorRef.current;
    if (el) el.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const emitChange = () => {
    if (!editorRef.current || !onChange) return;
    onChange(editorRef.current.innerHTML);
  };

  const execCmd = (command, arg = null) => {
    restoreSelection();
    try {
      document.execCommand(command, false, arg);
    } catch {
      // Abaikan jika browser menolak perintah tertentu
    }
    emitChange();
  };

  const handleHeadingChange = (e) => {
    const tag = e.target.value;
    setBlockFormat(tag);
    execCmd('formatBlock', tag);
  };

  const openLinkModal = () => {
    saveSelection();
    const sel = window.getSelection();
    setLinkText(sel ? sel.toString() : '');
    setLinkUrl('https://');
    setModalType('link');
  };

  const confirmInsertLink = (e) => {
    e.preventDefault();
    const cleanUrl = String(linkUrl || '').trim();
    if (!cleanUrl || /^javascript:/i.test(cleanUrl)) return;
    restoreSelection();
    const selectedText = window.getSelection()?.toString();
    if (selectedText) {
      document.execCommand('createLink', false, cleanUrl);
    } else {
      const label = String(linkText || cleanUrl).trim();
      const safeLabel = label.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`
      );
    }
    setModalType(null);
    emitChange();
  };

  const openImageModal = () => {
    saveSelection();
    setImageUrl('');
    setImageAlt('');
    setModalType('image');
  };

  const confirmInsertImage = (e) => {
    e.preventDefault();
    const cleanUrl = String(imageUrl || '').trim();
    if (!cleanUrl || /^javascript:/i.test(cleanUrl)) return;
    restoreSelection();
    const safeAlt = String(imageAlt || 'Ilustrasi').replace(/"/g, '&quot;');
    document.execCommand(
      'insertHTML',
      false,
      `<p style="text-align: center;"><img src="${cleanUrl}" alt="${safeAlt}" /></p>`
    );
    setModalType(null);
    emitChange();
  };

  const plainText = (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(' ').length : 0;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const charCount = String(value || '').length;

  const toolBtnClass =
    'min-w-[40px] h-[40px] px-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 flex items-center justify-center shrink-0 transition-colors cursor-pointer';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Sticky Formatting Toolbar bergaya Microsoft Word */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur border-b border-slate-200 px-2 py-2 flex items-center gap-1 overflow-x-auto">
        <button type="button" onClick={() => execCmd('undo')} title="Undo" className={toolBtnClass}>
          ↶
        </button>
        <button type="button" onClick={() => execCmd('redo')} title="Redo" className={toolBtnClass}>
          ↷
        </button>

        <span className="h-6 w-px bg-slate-200 mx-1 shrink-0" />

        <select
          value={blockFormat}
          onChange={handleHeadingChange}
          aria-label="Gaya Paragraf / Heading"
          className="h-[40px] px-2.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 shrink-0 cursor-pointer"
        >
          <option value="P">Paragraf Normal</option>
          <option value="H2">Heading 2 (Judul)</option>
          <option value="H3">Heading 3 (Subjudul)</option>
          <option value="H4">Heading 4 (Sub-bagian)</option>
        </select>

        <span className="h-6 w-px bg-slate-200 mx-1 shrink-0" />

        <button type="button" onClick={() => execCmd('bold')} title="Tebal (Bold)" className={`${toolBtnClass} font-extrabold`}>
          B
        </button>
        <button type="button" onClick={() => execCmd('italic')} title="Miring (Italic)" className={`${toolBtnClass} italic font-serif`}>
          I
        </button>
        <button type="button" onClick={() => execCmd('underline')} title="Garis Bawah (Underline)" className={`${toolBtnClass} underline`}>
          U
        </button>
        <button type="button" onClick={() => execCmd('strikeThrough')} title="Coret (Strikethrough)" className={`${toolBtnClass} line-through`}>
          S
        </button>

        <span className="h-6 w-px bg-slate-200 mx-1 shrink-0" />

        <button type="button" onClick={() => execCmd('justifyLeft')} title="Rata Kiri" className={toolBtnClass}>
          ≡L
        </button>
        <button type="button" onClick={() => execCmd('justifyCenter')} title="Rata Tengah" className={toolBtnClass}>
          ≡C
        </button>
        <button type="button" onClick={() => execCmd('justifyRight')} title="Rata Kanan" className={toolBtnClass}>
          ≡R
        </button>
        <button type="button" onClick={() => execCmd('justifyFull')} title="Rata Kiri-Kanan (Justify)" className={toolBtnClass}>
          ≡J
        </button>

        <span className="h-6 w-px bg-slate-200 mx-1 shrink-0" />

        <button type="button" onClick={() => execCmd('insertUnorderedList')} title="Daftar Poin" className={toolBtnClass}>
          • List
        </button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} title="Daftar Bernomor" className={toolBtnClass}>
          1. List
        </button>
        <button type="button" onClick={() => execCmd('formatBlock', 'BLOCKQUOTE')} title="Kutipan" className={toolBtnClass}>
          “ ”
        </button>

        <span className="h-6 w-px bg-slate-200 mx-1 shrink-0" />

        <button type="button" onClick={openLinkModal} title="Sisipkan Tautan" className={toolBtnClass}>
          🔗
        </button>
        <button type="button" onClick={openImageModal} title="Sisipkan Gambar" className={toolBtnClass}>
          🖼
        </button>
        <button type="button" onClick={() => execCmd('insertHorizontalRule')} title="Garis Pemisah" className={toolBtnClass}>
          —
        </button>
        <button type="button" onClick={() => execCmd('removeFormat')} title="Bersihkan Format" className={toolBtnClass}>
          Tx
        </button>
      </div>

      {/* Kanvas Dokumen */}
      <div className="p-4 sm:p-6 md:p-8 bg-white">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          data-placeholder={placeholder}
          className="word-canvas max-w-3xl mx-auto"
        />
      </div>

      {/* Footer Statistik Naskah */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span><strong>{wordCount}</strong> kata</span>
          <span>Estimasi baca <strong>{readMinutes}</strong> menit</span>
        </div>
        <div className={charCount > maxChars ? 'text-red-600 font-bold' : ''}>
          {charCount.toLocaleString('id-ID')} / {maxChars.toLocaleString('id-ID')} karakter
        </div>
      </div>

      {/* Modal Sisip Link / Gambar */}
      {modalType === 'link' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={confirmInsertLink} className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
            <h4 className="text-base font-bold text-slate-900">Sisipkan Tautan (Link)</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teks Tautan</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Contoh: Baca selengkapnya"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">URL Tujuan (https://...)</label>
              <input
                type="url"
                required
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalType(null)} className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer">
                Batal
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer">
                Sisipkan
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'image' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={confirmInsertImage} className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <h4 className="text-base font-bold text-slate-900">Sisipkan Gambar ke Naskah</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">URL Gambar</label>
              <input
                type="url"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://contoh.com/foto.jpg"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Alt Text</label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Deskripsi singkat gambar"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            {galleryItems && galleryItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1.5">Atau pilih cepat dari Galeri:</p>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50">
                  {galleryItems.map((g) => (
                    <button
                      key={g.ID}
                      type="button"
                      onClick={() => {
                        setImageUrl(g.GambarURL);
                        setImageAlt(g.JudulFoto || g.Keterangan || 'Galeri');
                      }}
                      className="text-left bg-white border border-slate-200 rounded-md p-1.5 hover:border-red-500 cursor-pointer"
                    >
                      <img src={g.GambarURL} alt={g.JudulFoto} className="w-full h-14 object-cover rounded" />
                      <p className="text-[11px] font-medium text-slate-700 truncate mt-1">{g.JudulFoto}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalType(null)} className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer">
                Batal
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer">
                Masukkan Gambar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function HtmlPreviewModal({ open, title, html, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">Pratinjau: {title || 'Tanpa Judul'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
          >
            Tutup
          </button>
        </div>
        <div className="p-6 overflow-y-auto article-prose">
          <div dangerouslySetInnerHTML={{ __html: sanitizeClientHtml(html) }} />
        </div>
      </div>
    </div>
  );
}
