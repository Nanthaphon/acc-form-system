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
