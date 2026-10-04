import { useEffect, useRef, useState } from 'react'
import { AlertCircle, GripVertical, ImagePlus, Upload, X } from 'lucide-react'

/*
 * Tipos de imagem aceites no portefólio.
 * O atributo "accept" do input filtra a escolha, mas validamos também
 * em JavaScript para garantir que ficheiros inválidos não entram na galeria.
 */
const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp']

/* Tamanho máximo permitido por imagem: 5 MB. */
const maximumFileSize = 5 * 1024 * 1024

/* Número máximo de imagens que uma montra pode ter nesta fase. */
const maximumImages = 8

/*
 * Função vazia usada por defeito enquanto a ASPEC-37 ainda não envia
 * as imagens para a API.
 */
function noop() {}

/*
 * Componente responsável apenas pelas imagens do portefólio.
 *
 * Mais tarde, a página pai poderá receber os ficheiros através de
 * "onImagesChange" e enviá-los para a API juntamente com o formulário.
 */
function PortfolioGallery({ onImagesChange = noop }) {
  /* Lista de imagens escolhidas, cada uma com o ficheiro e a pré-visualização. */
  const [images, setImages] = useState([])

  /* Mensagem apresentada quando existe um ficheiro inválido. */
  const [error, setError] = useState('')

  /* Controla o aspeto visual da zona quando um ficheiro está a ser arrastado. */
  const [isDropZoneActive, setIsDropZoneActive] = useState(false)

  /* Guarda o identificador da imagem que está a ser arrastada para reordenar. */
  const [draggedImageId, setDraggedImageId] = useState(null)

  /* Permite abrir e limpar o input de ficheiros através de JavaScript. */
  const fileInputRef = useRef(null)

  /*
   * Guarda os URLs temporários criados com URL.createObjectURL().
   * Estes URLs são libertados quando a página deixa de existir,
   * evitando ocupar memória sem necessidade.
   */
  const previewUrlsRef = useRef(new Set())

  /*
   * Envia a lista atual de ficheiros ao componente pai.
   * Nesta tarefa o pai ainda não faz nada com eles; será útil na ASPEC-37.
   */
  useEffect(() => {
    onImagesChange(images.map((image) => image.file))
  }, [images, onImagesChange])

  /* Liberta todas as pré-visualizações temporárias ao sair da página. */
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl)
      })
    }
  }, [])

  /* Permite selecionar novamente o mesmo ficheiro depois de o remover. */
  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /*
   * Valida cada ficheiro individualmente.
   * Devolve uma mensagem se houver erro ou uma string vazia se for válido.
   */
  function getFileError(file) {
    if (!acceptedImageTypes.includes(file.type)) {
      return `"${file.name}" não é uma imagem JPEG, PNG ou WebP.`
    }

    if (file.size > maximumFileSize) {
      return `"${file.name}" ultrapassa o limite de 5 MB.`
    }

    return ''
  }

  /*
   * Recebe ficheiros escolhidos pelo input ou largados na zona de upload.
   * Cria um URL temporário para mostrar cada imagem sem a enviar ainda ao servidor.
   */
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

    /*
     * Se o utilizador escolher mais imagens do que o permitido,
     * apenas são adicionadas as que ainda cabem na galeria.
     */
    const filesToAdd = validFiles.slice(0, remainingSlots)

    if (filesToAdd.length === 0) {
      setError(validationErrors[0] || 'Não foi possível adicionar as imagens.')
      resetFileInput()
      return
    }

    const newImages = filesToAdd.map((file, index) => {
      const previewUrl = URL.createObjectURL(file)

      /* Guardamos o URL para o podermos libertar posteriormente. */
      previewUrlsRef.current.add(previewUrl)

      return {
        id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
        file,
        previewUrl,
      }
    })

    setImages((currentImages) => [...currentImages, ...newImages])

    /*
     * Mostra um aviso caso alguns ficheiros tenham sido ignorados,
     * mas mantém na galeria os ficheiros que eram válidos.
     */
    if (validFiles.length > remainingSlots) {
      validationErrors.push(
        `Só foram adicionadas ${remainingSlots} imagem(ns), pois o limite é ${maximumImages}.`,
      )
    }

    setError(validationErrors.join(' '))
    resetFileInput()
  }

  /* Trata as imagens selecionadas através da janela de ficheiros. */
  function handleFileChange(event) {
    addImages(event.target.files)
  }

  /* Mantém a zona de upload ativa enquanto um ficheiro está sobre ela. */
  function handleDropZoneDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDropZoneActive(true)
  }

  /* Remove o estado visual quando o ficheiro sai da zona de upload. */
  function handleDropZoneDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDropZoneActive(false)
    }
  }

  /* Trata as imagens largadas na zona de upload. */
  function handleDropZoneDrop(event) {
    event.preventDefault()
    setIsDropZoneActive(false)
    addImages(event.dataTransfer.files)
  }

  /*
   * Remove uma imagem e liberta o URL temporário associado a ela.
   */
  function removeImage(imageId) {
    const imageToRemove = images.find((image) => image.id === imageId)

    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.previewUrl)
      previewUrlsRef.current.delete(imageToRemove.previewUrl)
    }

    setImages((currentImages) =>
      currentImages.filter((image) => image.id !== imageId),
    )

    setError('')
  }

  /* Inicia o arrastar de uma imagem para alterar a ordem. */
  function handleImageDragStart(event, imageId) {
    setDraggedImageId(imageId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', imageId)
  }

  /*
   * Move a imagem arrastada para a posição da imagem onde foi largada.
   */
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
                  alt={`Pré-visualização ${index + 1}: ${image.file.name}`}
                  className="h-full w-full object-cover"
                />

                <span className="absolute left-3 top-3 rounded-full bg-slate-900/75 px-2 py-1 text-xs font-semibold text-white">
                  {index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="absolute right-3 top-3 rounded-full bg-white p-2 text-slate-700 shadow-sm transition hover:bg-red-50 hover:text-red-700"
                  aria-label={`Remover ${image.file.name}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 p-3 text-sm text-slate-600">
                <GripVertical size={18} className="shrink-0 text-slate-400" />
                <p className="truncate" title={image.file.name}>
                  {image.file.name}
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