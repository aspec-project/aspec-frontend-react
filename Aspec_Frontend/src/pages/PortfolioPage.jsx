import { useCallback, useEffect, useState } from 'react'
import MemberDashboardLayout from '../components/layout/MemberDashboardLayout'
import PortfolioGallery from '../components/showcase/PortfolioGallery'
import { normalizeError } from '../services/api'
import {
  deletePortfolioImage,
  getMemberProfile,
  uploadPortfolioImages,
} from '../services/memberProfile'

/*
 * Página exclusiva da gestão do portefólio.
 *
 * A lógica fica fora de ShowcaseInfoForm para que /perfil/portefolio
 * apresente apenas a galeria, em vez de todo o formulário da montra.
 */
export default function PortfolioPage() {
  const [savedPortfolio, setSavedPortfolio] = useState([])
  const [portfolioFiles, setPortfolioFiles] = useState([])
  const [uploadedPortfolioFiles, setUploadedPortfolioFiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState(null)

  /*
   * Carrega as imagens já persistidas no backend. A galeria recebe-as
   * através de initialImages e trata-as como imagens guardadas.
   */
  useEffect(() => {
    let isCancelled = false

    async function loadPortfolio() {
      try {
        const profile = await getMemberProfile()

        if (!isCancelled) {
          setSavedPortfolio(profile.portfolio ?? [])
        }
      } catch (error) {
        if (!isCancelled) {
          const normalizedError = normalizeError(error)

          setLoadError(
            normalizedError.message ??
              'Não foi possível carregar o portefólio.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPortfolio()

    return () => {
      isCancelled = true
    }
  }, [])

  /*
   * Recebe apenas os objetos File que ainda não foram enviados.
   * As imagens devolvidas pela API passam a integrar savedPortfolio.
   */
  const handlePortfolioImagesChange = useCallback((selectedImages) => {
    setPortfolioFiles(selectedImages)
    setStatus(null)
  }, [])

  /*
   * Elimina uma imagem já guardada e atualiza a galeria imediatamente,
   * sem obrigar o utilizador a atualizar a página.
   */
  const handleDeleteSavedPortfolioImage = useCallback(
    async (portfolioImageId) => {
      setStatus(null)

      await deletePortfolioImage(portfolioImageId)

      setSavedPortfolio((currentPortfolio) =>
        currentPortfolio.filter((image) => image.id !== portfolioImageId),
      )

      setStatus({
        type: 'success',
        message: 'Imagem removida do portefólio com sucesso.',
      })
    },
    [],
  )

  /*
   * Envia apenas as imagens novas. Os ficheiros enviados nesta sessão
   * ficam registados para não serem enviados novamente.
   */
  async function handleSubmit(event) {
    event.preventDefault()

    const newPortfolioFiles = portfolioFiles.filter(
      (file) => !uploadedPortfolioFiles.includes(file),
    )

    if (newPortfolioFiles.length === 0) {
      setStatus({
        type: 'info',
        message: 'Não existem novas imagens para guardar.',
      })

      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      const uploadedImages = await uploadPortfolioImages(newPortfolioFiles)

      /*
       * A API devolve as imagens já persistidas. Ao guardá-las no estado,
       * a galeria substitui as pré-visualizações locais sem duplicações.
       */
      setSavedPortfolio((currentPortfolio) => [
        ...currentPortfolio,
        ...uploadedImages,
      ])

      setUploadedPortfolioFiles((currentFiles) => [
        ...currentFiles,
        ...newPortfolioFiles,
      ])

      setStatus({
        type: 'success',
        message: 'Portefólio guardado com sucesso.',
      })
    } catch (error) {
      const normalizedError = normalizeError(error)

      setStatus({
        type: 'error',
        message:
          normalizedError.message ??
          'Não foi possível guardar as imagens do portefólio.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <MemberDashboardLayout>
      <section>
        <div className="border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7043]">
            Montra digital
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Portefólio
          </h2>
          <p className="mt-2 text-slate-600">
            Adiciona, remove e organiza as imagens apresentadas na tua montra
            digital.
          </p>
        </div>

        {isLoading ? (
          <p className="py-10 text-slate-600">A carregar o portefólio...</p>
        ) : loadError ? (
          <div
            className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            {loadError}
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <PortfolioGallery
              initialImages={savedPortfolio}
              uploadedFiles={uploadedPortfolioFiles}
              onImagesChange={handlePortfolioImagesChange}
              onDeleteSavedImage={handleDeleteSavedPortfolioImage}
            />

            {status && (
              <p
                className={
                  status.type === 'error'
                    ? 'text-sm text-red-600'
                    : status.type === 'success'
                      ? 'text-sm text-emerald-600'
                      : 'text-sm text-slate-600'
                }
                role={status.type === 'error' ? 'alert' : 'status'}
              >
                {status.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[#8a7043] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#735d38] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'A guardar...' : 'Guardar alterações'}
            </button>
          </form>
        )}
      </section>
    </MemberDashboardLayout>
  )
}