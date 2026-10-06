import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, X } from 'lucide-react'

/*
 * Formatos aceites pelo frontend e pelo backend.
 */
const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp']

/*
 * Cada logótipo pode ter, no máximo, 5 MB.
 */
const maximumFileSize = 5 * 1024 * 1024

/*
 * Função vazia usada como valor padrão da callback.
 */
function noop() {}

/*
 * initialLogoUrl representa o logótipo já guardado no backend.
 * onLogoChange entrega ao componente pai apenas um novo ficheiro escolhido.
 */
function LogoUploader({
  initialLogoUrl = '',
  onLogoChange = noop,
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(initialLogoUrl)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  /*
   * Guarda apenas URLs temporários criados com URL.createObjectURL().
   * URLs vindos do backend não devem ser libertados desta forma.
   */
  const objectUrlRef = useRef('')

  /*
   * Quando o perfil termina de carregar, apresenta o logótipo devolvido
   * pela API. Não substitui uma seleção nova que o utilizador esteja
   * a visualizar localmente.
   */
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(initialLogoUrl)
    }
  }, [initialLogoUrl, selectedFile])

  /*
   * Ao sair da página, libertamos a pré-visualização temporária, se existir.
   */
  useEffect(() => {
    return () => {
      revokeObjectUrl()
    }
  }, [])

  function revokeObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ''
    }
  }

  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]

    // O utilizador pode fechar a janela sem selecionar um ficheiro.
    if (!file) {
      return
    }

    if (!acceptedImageTypes.includes(file.type)) {
      setError('Seleciona uma imagem JPG, PNG ou WebP.')
      resetFileInput()
      return
    }

    if (file.size > maximumFileSize) {
      setError('O logótipo não pode ultrapassar 5 MB.')
      resetFileInput()
      return
    }

    /*
     * Se existia uma pré-visualização local anterior, libertamo-la
     * antes de criar uma nova.
     */
    revokeObjectUrl()

    const nextPreviewUrl = URL.createObjectURL(file)

    objectUrlRef.current = nextPreviewUrl

    setError('')
    setSelectedFile(file)
    setPreviewUrl(nextPreviewUrl)

    // Entrega o novo ficheiro ao formulário pai para ser enviado à API.
    onLogoChange(file)
  }

  function handleCancelSelection() {
    /*
     * Esta ação cancela apenas uma nova seleção que ainda não foi guardada.
     * Se já existir um logótipo na API, voltamos a mostrá-lo.
     */
    revokeObjectUrl()

    setSelectedFile(null)
    setPreviewUrl(initialLogoUrl)
    setError('')
    resetFileInput()

    onLogoChange(null)
  }

  const hasLogoPreview = Boolean(previewUrl)

  return (
    <section className="rounded-xl border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-[#0d1f35]">
        Logótipo da empresa
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Adiciona um logótipo para identificar a tua montra digital.
      </p>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
          {hasLogoPreview ? (
            <img
              src={previewUrl}
              alt={
                selectedFile
                  ? `Pré-visualização do logótipo ${selectedFile.name}`
                  : 'Logótipo atual da empresa'
              }
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <div className="px-4 text-center text-sm text-slate-500">
              <ImagePlus
                size={28}
                className="mx-auto mb-2 text-slate-400"
                aria-hidden="true"
              />
              Sem logótipo
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            ref={fileInputRef}
            id="company-logo"
            name="logo"
            type="file"
            accept={acceptedImageTypes.join(',')}
            onChange={handleFileChange}
            className="sr-only"
            aria-describedby={error ? 'logo-error' : 'logo-help'}
          />

          <div className="flex flex-wrap gap-3">
            <label
              htmlFor="company-logo"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#8a7043] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#705b36] focus-within:ring-2 focus-within:ring-[#8a7043] focus-within:ring-offset-2"
            >
              <ImagePlus size={18} aria-hidden="true" />
              {hasLogoPreview ? 'Substituir logótipo' : 'Escolher logótipo'}
            </label>

            {selectedFile && (
              <button
                type="button"
                onClick={handleCancelSelection}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                <X size={18} aria-hidden="true" />
                Cancelar seleção
              </button>
            )}
          </div>

          <p id="logo-help" className="mt-3 text-sm text-slate-500">
            Formatos aceites: JPG, PNG ou WebP. Tamanho máximo: 5 MB.
          </p>

          {error && (
            <p
              id="logo-error"
              className="mt-3 flex items-center gap-2 text-sm font-medium text-red-600"
              role="alert"
            >
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default LogoUploader