import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, ImagePlus, Move, ZoomIn } from 'lucide-react'

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maximumFileSize = 5 * 1024 * 1024
const cropSize = 128
const outputSize = 512

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

function cropFileName(file) {
  const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-')
  return `${safeName || 'logotipo'}-recortado.png`
}

/*
 * O recorte é guardado como uma imagem quadrada. A moldura circular é só a
 * pré-visualização da forma como o logótipo aparecerá nos avatares da ASPEC.
 */
async function createCroppedLogo(file, imageSize, crop) {
  const image = new Image()
  const sourceUrl = URL.createObjectURL(file)

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('Não foi possível preparar esta imagem.'))
      image.src = sourceUrl
    })

    const baseScale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight)
    const scale = baseScale * crop.zoom
    const drawWidth = image.naturalWidth * scale
    const drawHeight = image.naturalHeight * scale
    const maxOffsetX = Math.max(0, (drawWidth - outputSize) / 2)
    const maxOffsetY = Math.max(0, (drawHeight - outputSize) / 2)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) throw new Error('O seu navegador não permitiu preparar o recorte.')

    canvas.width = outputSize
    canvas.height = outputSize
    context.drawImage(
      image,
      (outputSize - drawWidth) / 2 + crop.offsetX * maxOffsetX,
      (outputSize - drawHeight) / 2 + crop.offsetY * maxOffsetY,
      drawWidth,
      drawHeight,
    )

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Não foi possível criar o recorte do logótipo.')

    return new File([blob], cropFileName(file), { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export default function LogoUploader({
  initialLogoUrl = '',
  onLogoChange,
  isSaving = false,
  successMessage = '',
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageSize, setImageSize] = useState(null)
  const [crop, setCrop] = useState({ zoom: 1, offsetX: 0, offsetY: 0 })
  const [dragStart, setDragStart] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const objectUrlRef = useRef('')

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  function clearObjectUrl() {
    if (!objectUrlRef.current) return
    URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = ''
  }

  function resetSelection() {
    clearObjectUrl()
    setSelectedFile(null)
    setPreviewUrl('')
    setImageSize(null)
    setCrop({ zoom: 1, offsetX: 0, offsetY: 0 })
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!acceptedImageTypes.includes(file.type)) {
      setError('Seleciona uma imagem JPG, PNG ou WebP.')
      event.target.value = ''
      return
    }

    if (file.size > maximumFileSize) {
      setError('O logótipo não pode ultrapassar 5 MB.')
      event.target.value = ''
      return
    }

    clearObjectUrl()
    const nextPreviewUrl = URL.createObjectURL(file)
    objectUrlRef.current = nextPreviewUrl
    setSelectedFile(file)
    setPreviewUrl(nextPreviewUrl)
    setImageSize(null)
    setCrop({ zoom: 1, offsetX: 0, offsetY: 0 })
    setError('')
  }

  function handleImageLoad(event) {
    const { naturalWidth, naturalHeight } = event.currentTarget
    setImageSize({ width: naturalWidth, height: naturalHeight })
  }

  const baseScale = imageSize ? Math.max(cropSize / imageSize.width, cropSize / imageSize.height) : 1
  const imageWidth = imageSize ? imageSize.width * baseScale * crop.zoom : cropSize
  const imageHeight = imageSize ? imageSize.height * baseScale * crop.zoom : cropSize
  const maxOffsetX = Math.max(0, (imageWidth - cropSize) / 2)
  const maxOffsetY = Math.max(0, (imageHeight - cropSize) / 2)

  function updateCropFromPointer(event) {
    if (!dragStart || (!maxOffsetX && !maxOffsetY)) return
    const deltaX = event.clientX - dragStart.x
    const deltaY = event.clientY - dragStart.y
    setCrop((currentCrop) => ({
      ...currentCrop,
      offsetX: maxOffsetX ? clamp(dragStart.offsetX + deltaX / maxOffsetX, -1, 1) : 0,
      offsetY: maxOffsetY ? clamp(dragStart.offsetY + deltaY / maxOffsetY, -1, 1) : 0,
    }))
  }

  async function handleSave() {
    if (!selectedFile || !imageSize || isSaving) return
    setError('')

    try {
      const croppedFile = await createCroppedLogo(selectedFile, imageSize, crop)
      await onLogoChange?.(croppedFile)
      resetSelection()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível guardar o logótipo.')
    }
  }

  const displayPreviewUrl = selectedFile ? previewUrl : initialLogoUrl

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#9b7b45]/12 text-[#9b7b45]">
          <ImagePlus size={19} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#0d1f35]">Logótipo da empresa</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Escolhe a área da imagem que deve aparecer no logótipo circular da tua empresa.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div
          className={`relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-[0_0_0_1px_rgb(203_213_225)] ${selectedFile ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
          onPointerDown={(event) => {
            if (!selectedFile || !imageSize) return
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragStart({ x: event.clientX, y: event.clientY, offsetX: crop.offsetX, offsetY: crop.offsetY })
          }}
          onPointerMove={updateCropFromPointer}
          onPointerUp={() => setDragStart(null)}
          onPointerCancel={() => setDragStart(null)}
        >
          {displayPreviewUrl ? (
            selectedFile && imageSize ? (
              <img
                src={displayPreviewUrl}
                alt="Pré-visualização do recorte do logótipo"
                draggable="false"
                onLoad={handleImageLoad}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: `${imageWidth}px`,
                  height: `${imageHeight}px`,
                  transform: `translate(calc(-50% + ${crop.offsetX * maxOffsetX}px), calc(-50% + ${crop.offsetY * maxOffsetY}px))`,
                }}
              />
            ) : (
              <img src={displayPreviewUrl} alt="Logótipo atual da empresa" onLoad={selectedFile ? handleImageLoad : undefined} className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center px-5 text-center text-sm text-slate-500">
              <ImagePlus size={30} className="mb-2 text-slate-400" aria-hidden="true" />
              Sem logótipo
            </div>
          )}
        </div>

        <div className="w-full min-w-0 flex-1">
          <input ref={fileInputRef} id="company-logo" type="file" accept={acceptedImageTypes.join(',')} onChange={handleFileChange} className="sr-only" />
          <label htmlFor="company-logo" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0d1f35] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#173558] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#0d1f35]">
            <ImagePlus size={18} aria-hidden="true" />
            {displayPreviewUrl ? 'Escolher outra imagem' : 'Escolher imagem'}
          </label>

          {selectedFile ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#0d1f35]"><Move size={16} className="text-[#9b7b45]" aria-hidden="true" />Arrasta a imagem dentro do círculo para escolher a área visível.</p>
              <label htmlFor="logo-zoom" className="mt-5 flex items-center gap-2 text-sm font-medium text-[#0d1f35]"><ZoomIn size={16} className="text-[#9b7b45]" aria-hidden="true" />Zoom</label>
              <input id="logo-zoom" type="range" min="1" max="3" step="0.05" value={crop.zoom} onChange={(event) => setCrop((currentCrop) => ({ ...currentCrop, zoom: Number(event.target.value) }))} className="mt-3 w-full accent-[#9b7b45]" />
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => void handleSave()} disabled={isSaving || !imageSize} className="inline-flex items-center gap-2 rounded-lg bg-[#9b7b45] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#80643a] disabled:cursor-not-allowed disabled:opacity-60"><Check size={17} aria-hidden="true" />{isSaving ? 'A guardar...' : 'Guardar logótipo'}</button>
                <button type="button" onClick={resetSelection} disabled={isSaving} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#0d1f35] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">Cancelar</button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500">JPG, PNG ou WebP, até 5 MB.</p>
          )}

          {error ? <p role="alert" className="mt-4 flex items-start gap-2 text-sm font-medium text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</p> : null}
          {successMessage ? <p role="status" className="mt-4 flex items-start gap-2 text-sm font-medium text-emerald-800"><Check size={17} className="shrink-0" aria-hidden="true" />{successMessage}</p> : null}
        </div>
      </div>
    </section>
  )
}
