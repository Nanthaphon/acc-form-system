import { useLayoutEffect, useRef } from 'react'

// A one-line field that grows as the text does, instead of scrolling it out of
// sight. Used for the table's text cells, where a detail is often longer than
// the column: the whole of it should be readable while it is being typed, and
// it prints wrapped the same way.
interface Props {
  value: string
  onChange: (v: string) => void
  className?: string
  'aria-label'?: string
  placeholder?: string
}

export default function GrowTextarea({ value, onChange, className, placeholder, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Measured after every change, including one made elsewhere (a restored
  // version, a copied document), so the height always matches the text.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    // scrollHeight covers the content and its padding but not the border, while
    // the height set here is a border-box one: without the difference the last
    // line sits a border's width below the edge and is clipped.
    const border = el.offsetHeight - el.clientHeight
    el.style.height = `${el.scrollHeight + border}px`
  }, [value])

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
