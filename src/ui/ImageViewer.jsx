import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

/**
 * ImageViewer — ดูรูปเต็มจอในแอป
 *
 * ทำไมต้องมี: รูปในระบบเก็บเป็น data: URL (base64) ซึ่ง Chrome บล็อก
 * การเปิดเป็นแท็บใหม่มาตั้งแต่ Chrome 60 — `<a href={dataURL} target="_blank">`
 * จะได้หน้าว่างเปล่าเสมอ ไม่มี error ให้เห็นด้วย
 * ดูในแอปจึงทั้งใช้งานได้จริงและสะดวกกว่า (กด Esc ปิด ไม่หลุดจากหน้าเดิม)
 *
 * @param {string}   src      data: URL หรือ https: URL
 * @param {string}   alt
 * @param {string}   filename ชื่อไฟล์ตอนกดดาวน์โหลด
 * @param {function} onClose
 * @param {number}   z        z-index (ปรับได้เผื่อซ้อนใน modal ที่ z สูง)
 */
export default function ImageViewer({ src, alt = 'รูปภาพ', filename, onClose, z = 120 }) {
  /* ปิดด้วย Esc + ล็อกไม่ให้หน้าหลังเลื่อนตาม */
  useEffect(() => {
    if (!src) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } };
    document.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prev;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      style={{ zIndex: z }}
      className="fixed inset-0 flex items-center justify-center bg-stone-950/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <a
          href={src}
          download={filename || 'image.jpg'}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
          title="ดาวน์โหลดรูปนี้"
        >
          <Download className="size-5" strokeWidth={2} />
        </a>
        <button
          onClick={onClose}
          className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
          title="ปิด (Esc)"
        >
          <X className="size-5" strokeWidth={2} />
        </button>
      </div>

      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-xl object-contain"
      />
    </div>
  );
}
