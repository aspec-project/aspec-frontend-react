import { useCallback, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import PortfolioGallery from '../components/showcase/PortfolioGallery'
import { normalizeError } from '../services/api'
import { isSessionCurrent } from '../services/sessionContext'
import useSessionRequest from '../hooks/useSessionRequest'
import {
  deletePortfolioImage,
  uploadPortfolioImages,
} from '../services/memberProfile'

/*
 * Página exclusiva da gestão do portefólio.
 *
 * O perfil já foi carregado pelo MemberAreaLayout. Assim evitamos repetir
 * o pedido ao backend só para obter as imagens já guardadas.
 */
export default function PortfolioPage() {
  const { profile, reloadProfile } = useOutletContext()
  const getRequestContext = useSessionRequest()
  const savingRef = useRef(false)

  const [savedPortfolio, setSavedPortfolio] = useState(
    () => profile.portfolio ?? [],
  )
  const [portfolioFiles, setPortfolioFiles] = useState([])
  const [uploadedPortfolioFiles, setUploadedPortfolioFiles] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [status, setStatus] = useState(null)

  /*
   * Recebe apenas os objetos File que ainda não foram enviados.
   * As imagens devolvidas pela API passam a integrar savedPortfolio.
   */
  const handlePortfolioImagesChange = useCallback((selectedImages) => {
    setPortfolioFiles(selectedImages)
    setStatus(null)
  }, [])

  /*
   * Elimina uma imagem já guardada e atualiza a galeria sem obrigar
   * o utilizador a atualizar a página.
   */
  const handleDeleteSavedPortfolioImage = useCallback(
    async (portfolioImageId) => {
      const context = getRequestContext()

      if (!context || isDeleting) {
        return
      }

      setIsDeleting(true)
      setStatus(null)

      try {
        await deletePortfolioImage(portfolioImageId, context)

        if (!isSessionCurrent(context)) {
          return
        }

        setSavedPortfolio((currentPortfolio) =>
          currentPortfolio.filter((image) => image.id !== portfolioImageId),
        )

        await reloadProfile()

        setStatus({
          type: 'success',
          message: 'Imagem removida do portefólio com sucesso.',
        })
      } catch (error) {
        if (!isSessionCurrent(context)) {
          return
        }

        const normalisedError = normalizeError(error)

        setStatus({
          type: 'error',
          message:
            normalisedError.message ??
            'Não foi possível remover a imagem do portefólio.',
        })
      } finally {
        if (isSessionCurrent(context)) {
          setIsDeleting(false)
        }
      }
    },
    [getRequestContext, isDeleting, reloadProfile],
  )

  /*
   * Envia apenas as imagens novas. Os ficheiros enviados nesta sessão
   * ficam registados para não serem enviados novamente.
   */
  async function handleSubmit(event) {
    event.preventDefault()

    const context = getRequestContext()

    if (!context || savingRef.current) {
      return
    }

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

    savingRef.current = true
    setIsSaving(true)
    setStatus(null)

    try {
      const uploadedImages = await uploadPortfolioImages(
        newPortfolioFiles,
        context,
      )

      if (!isSessionCurrent(context)) {
        return
      }

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

      await reloadProfile()

      setStatus({
        type: 'success',
        message: 'Portefólio guardado com sucesso.',
      })
    } catch (error) {
      if (!isSessionCurrent(context)) {
        return
      }

      const normalisedError = normalizeError(error)

      setStatus({
        type: 'error',
        message:
          normalisedError.message ??
          'Não foi possível guardar as imagens do portefólio.',
      })
    } finally {
      savingRef.current = false

      if (isSessionCurrent(context)) {
        setIsSaving(false)
      }
    }
  }

  return (
    <section>
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-[#0d1f35]">
          Portefólio de Imagens
        </h1>

        <p className="mt-3 max-w-2xl text-slate-600">
          Adiciona, remove e organiza as imagens apresentadas no teu perfil
          público.
        </p>
      </div>

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
                ? 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'
                : status.type === 'success'
                  ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700'
                  : 'rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'
            }
            role={status.type === 'error' ? 'alert' : 'status'}
          >
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving || isDeleting}
          className="rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'A guardar...' : 'Guardar alterações'}
        </button>
      </form>
    </section>
  )
}