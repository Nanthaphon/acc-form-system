import { X } from 'lucide-react';
import React from 'react';
import { cls, BRAND } from './theme.js';

/* Field — label + input wrapper */
export function Field({ label, required, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className={cls.label}>
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-stone-400 mt-1.5 leading-snug">{hint}</p>}
      {error && <p className="text-xs text-rose-500 mt-1.5 leading-snug">{error}</p>}
    </div>
  );
}

/* SectionHeader — หัวข้อย่อยบางๆ คั่นส่วนในฟอร์ม/การ์ด */
export function SectionHeader({ children, action }) {
  return (
    <div className="flex items-center gap-3 first:pt-0">
      <span className="text-[13px] font-medium text-stone-500 shrink-0">
        {children}
      </span>
      <span className="flex-1 h-px bg-stone-200/80" />
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}

/* Button — primary / secondary / ghost / danger */
export function Button({
  variant = 'primary',
  type = 'button',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  const variantCls =
    variant === 'secondary' ? cls.btnSecondary :
    variant === 'ghost'     ? cls.btnGhost :
    variant === 'danger'    ? cls.btnDanger :
    cls.btnPrimary;

  const sizeCls =
    size === 'sm' ? 'px-3 py-1.5 text-sm' :
    size === 'lg' ? 'px-5 py-3 text-[15px]' : '';

  return (
    <button type={type} className={`${variantCls} ${sizeCls} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* Card — generic surface */
export function Card({ children, className = '', hoverable = false, padding = 'md' }) {
  const padCls =
    padding === 'none' ? '' :
    padding === 'sm'   ? 'p-4' :
    padding === 'lg'   ? 'p-8' :
    'p-6';
  return (
    <div className={`${hoverable ? cls.cardHover : cls.card} ${padCls} ${className}`}>
      {children}
    </div>
  );
}

/* Modal shell — Overlay + box (scroll lock จัดการที่ App.jsx ผ่าน global observer) */
export function Modal({ open, onClose, size = 'lg', closeOnBackdrop = false, children }) {
  if (!open) return null;
  // 🆕 ขยายทุก size ขึ้น 1 ขั้น เพื่อให้ Modal ใหญ่ขึ้น เห็นข้อมูลได้มากขึ้น
  const sizeCls =
    size === 'sm' ? 'max-w-lg' :
    size === 'md' ? 'max-w-2xl' :
    size === 'xl' ? 'max-w-5xl' :
    size === '2xl' ? 'max-w-6xl' :
    'max-w-3xl';  // default 'lg'
  // 🆕 default closeOnBackdrop = false → ไม่ปิดเมื่อคลิก background
  // (กันการปิด modal ตอนพิมพ์แก้ข้อมูลแล้วเผลอคลิกพื้น)
  return (
    <div className={cls.modalOverlay} onClick={closeOnBackdrop ? onClose : undefined}>
      <div className={`${cls.modalShell} ${sizeCls}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ModalHeader — title + subtitle + close button + optional icon */
export function ModalHeader({ icon: Icon, title, subtitle, onClose }) {
  return (
    <div className="px-7 py-5 flex items-start justify-between border-b border-stone-100 shrink-0">
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${BRAND.primary}10`, color: BRAND.primary }}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        )}
        <div>
          <h3 className="text-[19px] font-medium tracking-tight text-stone-900 leading-tight">{title}</h3>
          {subtitle && <p className="text-[13px] text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 p-1.5 rounded-xl transition-colors focus:outline-none"
          aria-label="ปิด"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

/* ModalBody — scrollable body */
export function ModalBody({ children, className = '' }) {
  return <div className={`px-7 py-6 overflow-y-auto flex-1 ${className}`}>{children}</div>;
}

/* ModalFooter — actions row */
export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`px-7 py-5 border-t border-stone-100 bg-stone-50 flex justify-end gap-2.5 shrink-0 ${className}`}>
      {children}
    </div>
  );
}

/* Badge — colored pill (kind: success/warning/danger/info/neutral) */
/* โทนเดียวกับ TONE ใน src/ui/earth.js — v3 ไม่มีขอบ
   (border-* เดิมเป็นคลาสตาย เพราะไม่มี utility `border` คู่กัน) */
const BADGE_CLS = {
  success: 'bg-olive-50 text-olive-700',
  warning: 'bg-ochre-50 text-ochre-700',
  danger:  'bg-rose-50 text-rose-700',
  info:    'bg-sand-100 text-stone-600',
  neutral: 'bg-sand-100 text-stone-600',
  brand:   'bg-clay-100 text-clay-600',
};
export function Badge({ kind = 'neutral', dot = false, children, className = '' }) {
  return (
    <span className={`${cls.badge} ${BADGE_CLS[kind] || BADGE_CLS.neutral} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

/* PageHeader — common page title block (under TopHeader) */
export function PageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${BRAND.primary}10`, color: BRAND.primary }}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        )}
        <div>
          <h1 className="text-[24px] font-medium text-stone-900 leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
