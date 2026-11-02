import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function PortfolioImageDialog({ images, initialIndex, onClose }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const [imageId, setImageId] = useState(images[initialIndex]?.id)
  const [failed, setFailed] = useState(false)
  const currentIndex = images.findIndex((item) => item.id === imageId)
  const image = images[currentIndex]
  const canNavigate = images.length > 1

  const navigate = useCallback((direction) => {
    if (images.length < 2 || currentIndex < 0) return
    const nextIndex = (currentIndex + direction + images.length) % images.length
    setFailed(false)
    setImageId(images[nextIndex].id)
  }, [currentIndex, images])

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onClose])

  useEffect(() => {
    if (!image) onClose()
  }, [image, onClose])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        navigate(event.key === 'ArrowLeft' ? -1 : 1)
      } else if (event.key === 'Tab') {
        const buttons = Array.from(dialogRef.current?.querySelectorAll('button:not([disabled])') ?? [])
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, onClose])

  if (!image) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100dvh-2rem)] w-fit max-w-4xl flex-col rounded-xl bg-white p-4 shadow-xl sm:p-6"
      >
        <div className="flex w-0 min-w-full shrink-0 items-center justify-between gap-4">
          <h2 id={titleId} className="min-w-0 truncate text-base font-medium text-[#0d1f35]">{image.alt}</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Fechar imagem ampliada"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="relative mt-4 flex min-h-11 min-w-28 items-center justify-center">
          {canNavigate && <button
            type="button"
            aria-label="Imagem anterior"
            onClick={() => navigate(-1)}
            className="absolute left-2 z-10 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-white/90 text-[#0d1f35] shadow-sm hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>}
          {failed ? (
            <p role="status" className="px-4 py-16 text-center text-sm text-gray-600">Imagem indisponível.</p>
          ) : (
            <img
              key={image.id}
              src={image.src}
              alt={image.alt}
              referrerPolicy="no-referrer"
              className="h-auto w-auto max-h-[calc(100dvh-11rem)] max-w-[calc(100vw-4rem)] object-contain sm:max-h-[min(75dvh,calc(100dvh-11rem))] sm:max-w-[min(53rem,calc(100vw-5rem))]"
              onError={() => setFailed(true)}
            />
          )}
          {canNavigate && <button
            type="button"
            aria-label="Imagem seguinte"
            onClick={() => navigate(1)}
            className="absolute right-2 z-10 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-white/90 text-[#0d1f35] shadow-sm hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
          >
            <ChevronRight size={24} aria-hidden="true" />
          </button>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
