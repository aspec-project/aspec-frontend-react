import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, X } from 'lucide-react'

/*
 * Formatos aceites nesta fase.
 * Se o grupo definir outras regras mais tarde, basta alterar esta constante.
 */
const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp']

/*
 * Limite de 5 MB para evitar que uma imagem demasiado pesada
 * prejudique o carregamento da montra digital.
 */
const maximumFileSize = 5 * 1024 * 1024

/*
 * Este componente permite selecionar um logótipo, validá-lo e apresentá-lo
 * imediatamente antes de o enviar para o servidor.
 *
 * onLogoChange será usado mais tarde para entregar o ficheiro selecionado
 * ao componente pai, que o enviará através de FormData na ASPEC-37.
 */
function LogoUploader({ onLogoChange = () => {} }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')

  /*
   * A referência permite limpar o input de ficheiro após remover o logótipo.
   * Sem isto, o utilizador poderia ter dificuldade em escolher o mesmo ficheiro
   * novamente depois de o remover.
   */
  const fileInputRef = useRef(null)

  /*
   * URL.createObjectURL cria um URL temporário para mostrar a imagem local.
   * Quando o URL deixa de ser necessário, libertamo-lo para evitar desperdício
   * de memória no browser.
   */
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]

    // O utilizador pode fechar a janela de seleção sem escolher um ficheiro.
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

    // O ficheiro é válido: guardamos os dados e criamos a pré-visualização.
    setError('')
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))

    // Prepara a comunicação com o componente pai para a futura API.
    onLogoChange(file)
  }

  function handleRemoveLogo() {
    setSelectedFile(null)
    setPreviewUrl('')
    setError('')
    resetFileInput()

    // Informa o componente pai de que já não existe logótipo selecionado.
    onLogoChange(null)
  }

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
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`Pré-visualização do logótipo ${selectedFile.name}`}
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
          {/*
           * O input fica visualmente escondido, mas continua acessível.
           * A label funciona como botão para abrir o seletor de ficheiros.
           */}
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
              {selectedFile ? 'Substituir logótipo' : 'Escolher logótipo'}
            </label>

            {selectedFile && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                <X size={18} aria-hidden="true" />
                Remover
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