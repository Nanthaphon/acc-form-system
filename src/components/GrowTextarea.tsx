import { useCallback, useLayoutEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'

// A field that grows as the text does, instead of scrolling it out of sight.
// Used wherever something typed is often longer than the box it is typed into
// — a detail in the table, a column heading of two lines, a note at the foot
// of the form: the whole of it should be readable while it is being written.
interface Props {
  value: string
  onChange: (v: string) => void
  className?: string
  'aria-label'?: string
  placeholder?: string
  title?: string
  // For a caller that also needs the element itself (to place the cursor, say).
  inputRef?: MutableRefObject<HTMLTextAreaElement | null>
}

export default function GrowTextarea({ value, onChange, className, placeholder, inputRef, ...rest }: Props) {
  const own = useRef<HTMLTextAreaElement | null>(null)
  const ref = inputRef ?? own

  const fit = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    // scrollHeight covers the content and its padding but not the border, while
    // the height set here is a border-box one: without the difference the last
    // line sits a border's width below the edge and is clipped.
    const border = el.offsetHeight - el.clientHeight
    el.style.height = `${el.scrollHeight + border}px`
  }, [ref])

  // Measured after every change, including one made elsewhere (a restored
  // version, a copied document), so the height always matches the text.
  useLayoutEffect(fit, [fit, value])

  // A narrower box wraps the same text onto more lines, so the height is
  // measured again whenever the field itself changes width.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let width = el.clientWidth
    const watch = new ResizeObserver(() => {
      if (el.clientWidth === width) return   // its own growing, not a reflow
      width = el.clientWidth
      fit()
    })
    watch.observe(el)
    return () => watch.disconnect()
  }, [fit, ref])

  return (
    <textarea
      ref={ref}
      rows={1}
      spellCheck={false}
      className={`${className ?? ''} resize-none overflow-hidden`}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      {...rest}
    />
  )
}
