import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function PrayerCross({ size = 16, className = '' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d="M12 2v20" /><path d="M7 8h10" /></svg>
}

export function PrayerVerse({ verse, compact = false }) {
  if (!verse) return null
  return <figure className={`${compact ? 'rounded-lg' : 'rounded-xl'} border-l-[3px] border-[#8a7043] bg-[#f5f3ee] p-4`}><figcaption className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7043]">Versículo da semana</figcaption><blockquote className="mt-1.5 text-[15px] italic leading-relaxed text-[#0d1f35]">{verse}</blockquote></figure>
}

export default function PrayerCardModal({ title, description, children, footer, onClose, busy = false, wide = false, bodyClass = '' }) {
  const titleId = useId()
  const descriptionId = useId()
  const overlayRef = useRef(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  const busyRef = useRef(busy)

  useEffect(() => {
    closeRef.current = onClose
    busyRef.current = busy
  }, [onClose, busy])

  useEffect(() => {
    const trigger = document.activeElement
    const overflow = document.body.style.overflow
    const previous = [...document.body.children].filter((node) => node !== overlayRef.current).map((node) => ({ node, inert: node.hasAttribute('inert') }))
    previous.forEach(({ node }) => node.setAttribute('inert', ''))
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!busyRef.current) closeRef.current()
      }
      if (event.key !== 'Tab') return
      const controls = [...dialogRef.current.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]')]
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement) || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement) || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previous.forEach(({ node, inert }) => { if (!inert) node.removeAttribute('inert') })
      document.body.style.overflow = overflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])

  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy} className={`relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white text-[#0d1f35] shadow-lg outline-none sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border sm:border-black/10 ${wide ? 'sm:max-w-xl' : 'sm:max-w-lg'}`}>
        <header className="flex shrink-0 flex-col gap-2 border-b border-gray-100 px-4 pb-3 pr-14 pt-4 text-left sm:px-6 sm:pr-14">
          <h2 id={titleId} className="flex items-center gap-2 text-lg leading-none font-semibold"><PrayerCross className="shrink-0 text-[#8a7043]" />{title}</h2>
          <p id={descriptionId} className="text-xs text-gray-500">{description}</p>
        </header>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Fechar" className="absolute right-3 top-3 rounded-md p-2.5 text-gray-600 opacity-70 hover:opacity-100 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#8a7043]"><X size={16} aria-hidden="true" /></button>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${bodyClass}`}>{children}</div>
        <footer className="shrink-0 border-t border-gray-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</footer>
      </section>
    </div>, document.body,
  )
}
