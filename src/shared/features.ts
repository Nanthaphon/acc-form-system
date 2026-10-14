// Work that is finished and tested but not in use yet. A switch here, rather
// than code taken back out, so nothing is lost and turning one on is a single
// word — the tests for these features turn them on themselves.
//
// When one goes live, say so in shared/announcements too: the people filling
// the forms in find out about it there.
export const FEATURES = {
  // Charging VAT / หัก ณ ที่จ่าย on chosen lines instead of the whole document
  // (the ทุกรายการ / เลือกรายการ choice: a VAT tick per line, and a withholding
  // rate per line). Live since 2026-10-14.
  taxPerRow: true,
  // A second round of tax, charged on what the document comes to rather than
  // on its items (คิดซ้ำจากยอดสุทธิอีกชั้น).
  taxOnNet: false,
}
