import { useEffect, useRef, useState } from 'react'
import { AlertCircle, GripVertical, ImagePlus, Upload, X } from 'lucide-react'

/*
 * Tipos de imagem aceites pelo frontend e pelo backend.
 */
const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp']

/* Tamanho máximo permitido por imagem: 5 MB. */
const maximumFileSize = 5 * 1024 * 1024

/* Número máximo de imagens permitidas no portefólio. */
const maximumImages = 8

/* Evita criar um novo array vazio em cada renderização. */
const emptyInitialImages = []

/*
 * Evita criar uma nova lista vazia sempre que a prop uploadedFiles
 * não é recebida pelo componente.
 */
const emptyUploadedFiles = []

function noop() {}

/*
 * initialImages recebe as imagens já guardadas no backend.
 * onImagesChange entrega ao formulário pai apenas ficheiros novos.
 */
function PortfolioGallery({
  initialImages = emptyInitialImages,
  uploadedFiles = emptyUploadedFiles,
  onImagesChange = noop,
  onDeleteSavedImage = noop,
}) {
  /*
   * Cada item pode ser:
   * - uma imagem guardada: isSaved: true e file: null;
   * - uma imagem nova: isSaved: false e file com o ficheiro escolhido.
   */
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const [isDropZoneActive, setIsDropZoneActive] = useState(false)
  const [draggedImageId, setDraggedImageId] = useState(null)

  /*
   * Guarda a imagem que está a ser apagada para impedir cliques repetidos.
   */
  const [deletingImageId, setDeletingImageId] = useState(null)

  const fileInputRef = useRef(null)

  /*
   * Guarda apenas URLs temporários criados para ficheiros novos.
   * URLs vindos da API não são object URLs e não devem ser libertados.
   */
  const previewUrlsRef = useRef(new Set())

/*
 * Sempre que chegam imagens guardadas — no carregamento inicial,
 * após um upload ou depois de uma eliminação — convertemo-las para
 * o formato interno usado pela galeria.
 */
useEffect(() => {
  const savedImages = initialImages.map((image) => ({
    id: `saved-${image.id}`,
    portfolioImageId: image.id,
    file: null,
    name: `Imagem guardada ${image.id}`,
    previewUrl: image.image_url,
    isSaved: true,
  }))

  setImages((currentImages) => {
    /*
     * uploadedFiles contém as mesmas referências File que foram enviadas
     * nesta sessão. Quando a API já devolveu a imagem persistida,
     * retiramos a pré-visualização local correspondente para não duplicar
     * a imagem na galeria.
     */
    const uploadedFileSet = new Set(uploadedFiles)

    const remainingNewImages = currentImages.filter(
      (image) => !image.isSaved && !uploadedFileSet.has(image.file),
    )

    return [...savedImages, ...remainingNewImages].slice(0, maximumImages)
  })
}, [initialImages, uploadedFiles])

  /*
   * O formulário pai só deve receber ficheiros que ainda não existem
   * no backend. As imagens guardadas não têm objeto File para reenviar.
   */
  useEffect(() => {
    const newFiles = images
      .filter((image) => !image.isSaved && image.file)
      .map((image) => image.file)

    onImagesChange(newFiles)
  }, [images, onImagesChange])

  /*
   * Ao sair da página, libertamos as pré-visualizações temporárias.
   */
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl)
      })
    }
  }, [])

  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function getFileError(file) {
    if (!acceptedImageTypes.includes(file.type)) {
      return `"${file.name}" não é uma imagem JPEG, PNG ou WebP.`
    }

    if (file.size > maximumFileSize) {
      return `"${file.name}" ultrapassa o limite de 5 MB.`
    }

    return ''
  }

  function addImages(fileList) {
    const selectedFiles = Array.from(fileList)

    if (selectedFiles.length === 0) {
      return
    }

    const validationErrors = []

    const validFiles = selectedFiles.filter((file) => {
      const fileError = getFileError(file)

      if (fileError) {
        validationErrors.push(fileError)
        return false
      }

      return true
    })

    const remainingSlots = maximumImages - images.length

    if (remainingSlots <= 0) {
      setError(`Só podes adicionar até ${maximumImages} imagens ao portefólio.`)
      resetFileInput()
      return
    }

    const filesToAdd = validFiles.slice(0, remainingSlots)

    if (filesToAdd.length === 0) {
      setError(validationErrors[0] || 'Não foi possível adicionar as imagens.')
      resetFileInput()
      return
    }

    /*
     * Cria o formato usado pela galeria para cada imagem nova.
     */
    const newImages = filesToAdd.map((file, index) => {
      const previewUrl = URL.createObjectURL(file)

      previewUrlsRef.current.add(previewUrl)

      return {
        id: `new-${file.name}-${file.lastModified}-${Date.now()}-${index}`,
        file,
        name: file.name,
        previewUrl,
        isSaved: false,
      }
    })

    setImages((currentImages) => [...currentImages, ...newImages])

    if (validFiles.length > remainingSlots) {
      validationErrors.push(
        `Só foram adicionadas ${remainingSlots} imagem(ns), pois o limite é ${maximumImages}.`,
      )
    }

    setError(validationErrors.join(' '))
    resetFileInput()
  }

  function handleFileChange(event) {
    addImages(event.target.files)
  }

  function handleDropZoneDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDropZoneActive(true)
  }

  function handleDropZoneDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDropZoneActive(false)
    }
  }

  function handleDropZoneDrop(event) {
    event.preventDefault()
    setIsDropZoneActive(false)
    addImages(event.dataTransfer.files)
  }

  /*
   * Remove apenas imagens ainda não enviadas.
   * As imagens guardadas precisam de um pedido DELETE à API.
   */
  function removeNewImage(imageId) {
    const imageToRemove = images.find((image) => image.id === imageId)

    if (imageToRemove?.previewUrl) {
      URL.revokeObjectURL(imageToRemove.previewUrl)
      previewUrlsRef.current.delete(imageToRemove.previewUrl)
    }

    setImages((currentImages) =>
      currentImages.filter((image) => image.id !== imageId),
    )

    setError('')
  }

  /*
   * Remove uma imagem que já existe no backend.
   * A imagem só desaparece da lista quando a API confirma a eliminação.
   */
  async function removeSavedImage(image) {
    setError('')
    setDeletingImageId(image.id)

    try {
      await onDeleteSavedImage(image.portfolioImageId)
    } catch (error) {
      setError(
        error.response?.data?.message ??
          'Não foi possível remover a imagem do portefólio.',
      )
    } finally {
      setDeletingImageId(null)
    }
  }

  function handleImageDragStart(event, imageId) {
    setDraggedImageId(imageId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', imageId)
  }

  function handleImageDrop(event, targetImageId) {
    event.preventDefault()

    const sourceImageId =
      event.dataTransfer.getData('text/plain') || draggedImageId

    if (!sourceImageId || sourceImageId === targetImageId) {
      setDraggedImageId(null)
      return
    }

    setImages((currentImages) => {
      const sourceIndex = currentImages.findIndex(
        (image) => image.id === sourceImageId,
      )

      const targetIndex = currentImages.findIndex(
        (image) => image.id === targetImageId,
      )

      if (sourceIndex === -1 || targetIndex === -1) {
        return currentImages
      }

      const reorderedImages = [...currentImages]
      const [movedImage] = reorderedImages.splice(sourceIndex, 1)

      reorderedImages.splice(targetIndex, 0, movedImage)

      return reorderedImages
    })

    setDraggedImageId(null)
  }

  return (
    <section className="rounded-xl border border-slate-200 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Portefólio</h2>

          <p className="mt-1 text-sm text-slate-600">
            Adiciona imagens dos teus trabalhos, projetos ou serviços.
          </p>
        </div>

        <p className="text-sm font-medium text-slate-500">
          {images.length} / {maximumImages} imagens
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        São aceites imagens JPEG, PNG ou WebP até 5 MB. Arrasta as imagens para
        alterar a ordem em que aparecem na montra.
      </p>

      <input
        ref={fileInputRef}
        id="portfolio-images"
        name="portfolioImages"
        type="file"
        accept={acceptedImageTypes.join(',')}
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />

      <label
        htmlFor="portfolio-images"
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
          isDropZoneActive
            ? 'border-amber-500 bg-amber-50'
            : 'border-slate-300 bg-slate-50 hover:border-amber-500 hover:bg-amber-50'
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm">
          <ImagePlus size={24} />
        </span>

        <span className="mt-4 text-sm font-semibold text-slate-700">
          Seleciona imagens ou arrasta-as para aqui
        </span>

        <span className="mt-1 text-sm text-slate-500">
          Podes escolher várias imagens ao mesmo tempo.
        </span>

        <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-700">
          <Upload size={16} />
          Escolher imagens
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {images.length > 0 && (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <li
              key={image.id}
              draggable
              onDragStart={(event) => handleImageDragStart(event, image.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleImageDrop(event, image.id)}
              onDragEnd={() => setDraggedImageId(null)}
              className={`overflow-hidden rounded-lg border bg-white transition ${
                draggedImageId === image.id
                  ? 'border-amber-500 opacity-50'
                  : 'border-slate-200'
              }`}
            >
              <div className="relative aspect-video bg-slate-100">
                <img
                  src={image.previewUrl}
                  alt={`Imagem do portefólio ${index + 1}: ${image.name}`}
                  className="h-full w-full object-cover"
                />

                <span className="absolute left-3 top-3 rounded-full bg-slate-900/75 px-2 py-1 text-xs font-semibold text-white">
                  {index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (image.isSaved) {
                      removeSavedImage(image)
                      return
                    }

                    removeNewImage(image.id)
                  }}
                  disabled={deletingImageId === image.id}
                  className="absolute right-3 top-3 rounded-full bg-white p-2 text-slate-700 shadow-sm transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Remover ${image.name}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 p-3 text-sm text-slate-600">
                <GripVertical size={18} className="shrink-0 text-slate-400" />

                <p className="truncate" title={image.name}>
                  {image.name}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default PortfolioGallery
