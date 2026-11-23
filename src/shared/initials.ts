// Thai vowels written before their consonant (เ แ โ ใ ไ): an initial is the
// consonant itself — "โรจนภาสกร" → "ร", not "โ".
const LEADING_VOWELS = new Set(['เ', 'แ', 'โ', 'ใ', 'ไ'])

/** The first letter a name is known by, upper-cased; '' for an empty name. */
export function initialOf(name: string | null | undefined): string {
  const chars = Array.from((name ?? '').trim())
  return (chars.find(c => !LEADING_VOWELS.has(c)) ?? chars[0] ?? '').toUpperCase()
}

/** Two letters for an avatar: first name and last name. */
export function initialsOf(firstName?: string | null, lastName?: string | null): string {
  return initialOf(firstName) + initialOf(lastName)
}

// Avatar colours, every pair readable (≥ 4.5:1); the same person always gets the same one.
const AVATAR_TONES = [
  'bg-clay-100 text-clay-800',
  'bg-olive-100 text-olive-800',
  'bg-ochre-50 text-ochre-700',
  'bg-rose-100 text-brick-700',
]

/** A colour for someone's avatar, picked from their ID so it never changes. */
export function avatarTone(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}
