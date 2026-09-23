import { useEffect, useRef } from 'react';

/* ปิด popover เมื่อคลิกนอกกรอบหรือกด Escape — ใช้ร่วมกันทุกกล่องลอยในธีม v3
   แยกไฟล์จาก earthUI.jsx เพราะไฟล์ที่ export ทั้ง component และ hook
   จะทำให้ Fast Refresh ของ Vite ใช้ไม่ได้ (react-refresh/only-export-components) */
export default function useDismiss(open, close) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onAway = (e) => { if (!ref.current?.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}
