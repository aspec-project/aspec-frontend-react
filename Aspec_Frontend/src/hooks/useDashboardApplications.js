import { useEffect, useState } from 'react'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'
import { normalizeError } from '../services/api'
import { getDashboardPendingApplications } from '../services/adminDashboard'
import { DASHBOARD_TEXTS } from '../utils/adminDashboard'
import { parsePositiveInteger, updateSearchParams } from '../utils/queryParams'
import useSearchParamsUpdater from './useSearchParamsUpdater'

const PER_PAGE = 3

const PAGE_PARAM = 'applications_page'

/**
 * Página visível das candidaturas pendentes do painel, 3 por página. A página fica no endereço
 * (`applications_page`, sem parâmetro na 1), para sobreviver a recarregar e ao botão Voltar; um valor inválido
 * abre a página 1. A página 1 vem da resposta do painel (sem pedido); as outras vêm do endpoint próprio.
 * Enquanto uma página nova carrega, as linhas atuais continuam visíveis com `loading` a true. Uma página que
 * deixou de existir (lista vazia para lá da última) salta para a última. O pedido em curso é cancelado ao mudar
 * de página ou ao desmontar.
 *
 * @param {{stats: object, pending_applications: object[]}|null} dashboard Dados do painel (null no 1.º carregamento).
 * @returns {{page: number, items: object[], lastPage: number, loading: boolean, error: string,
 *   goToPage: (page: number) => void, reload: () => void}}
 */
export default function useDashboardApplications(dashboard) {
  const [searchParams] = useSearchParams()
  const changeSearchParams = useSearchParamsUpdater()
  const target = parsePositiveInteger(searchParams.get(PAGE_PARAM), 1)
  const [shownTarget, setShownTarget] = useState(target)
  const [requestKey, setRequestKey] = useState(0)
  const [visible, setVisible] = useState(null)
  const [loading, setLoading] = useState(target > 1)
  const [error, setError] = useState('')

  /*
   * A página do endereço pode mudar sem passar por goToPage (ex.: botão Voltar). A página 1 mostra logo os
   * dados do painel; as outras ficam a carregar até chegar a resposta.
   */
  if (shownTarget !== target) {
    setShownTarget(target)
    setError('')
    if (target === 1) setVisible(null)
    setLoading(target > 1)
  }

  /**
   * Escreve a página no endereço.
   *
   * @param {number} page Página a mostrar.
   * @param {{replace?: boolean}} [options] Opções da navegação.
   */
  const setPage = (page, options) => {
    changeSearchParams((current) => updateSearchParams(current, { [PAGE_PARAM]: page }, { [PAGE_PARAM]: 1 }), options)
  }

  /**
   * Volta a pedir a página atual (se não for a 1, que vem do painel).
   */
  const reload = () => {
    if (target === 1) return
    setError('')
    setLoading(true)
    setRequestKey((value) => value + 1)
  }

  useEffect(() => {
    if (target === 1) return undefined

    const controller = new AbortController()

    getDashboardPendingApplications(target, controller.signal)
      .then(({ items, pagination }) => {
        if (controller.signal.aborted) return

        if (items.length === 0 && pagination.current_page > pagination.last_page) {
          changeSearchParams(
            (current) => updateSearchParams(current, { [PAGE_PARAM]: pagination.last_page }, { [PAGE_PARAM]: 1 }),
            { replace: true },
          )
          return
        }

        setVisible({ page: pagination.current_page, items, lastPage: pagination.last_page })
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return
        setError(axios.isAxiosError(err) ? normalizeError(err).message : DASHBOARD_TEXTS.applicationsLoadError)
        setLoading(false)
      })

    return () => controller.abort()
  }, [target, requestKey, changeSearchParams])

  const dashboardTotal = dashboard?.stats?.pending_applications?.total ?? 0

  return {
    page: visible?.page ?? 1,
    items: visible?.items ?? dashboard?.pending_applications ?? [],
    lastPage: visible?.lastPage ?? Math.max(1, Math.ceil(dashboardTotal / PER_PAGE)),
    loading,
    error,
    goToPage: (page) => (page === target ? reload() : setPage(page)),
    reload,
  }
}
