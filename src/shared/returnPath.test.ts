import { describe, expect, it } from 'vitest'
import { fromState, safeReturnPath } from './returnPath'

describe('safeReturnPath', () => {
  it('keeps a page inside the app, with its query', () => {
    expect(safeReturnPath('/submission/abc/preview')).toBe('/submission/abc/preview')
    expect(safeReturnPath('/history?x=1')).toBe('/history?x=1')
  })
  it('goes home for anything that could leave the app or loop', () => {
    for (const v of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/login', '/login?x', '/change-password', '', null, 42]) {
      expect(safeReturnPath(v)).toBe('/')
    }
  })
  it('reads it from router state', () => {
    expect(fromState({ from: '/sign' })).toBe('/sign')
    expect(fromState(null)).toBe('/')
  })
})
