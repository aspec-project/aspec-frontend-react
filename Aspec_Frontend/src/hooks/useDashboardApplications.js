import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import { getDashboardPendingApplications } from '../services/adminDashboard'
import { DASHBOARD_TEXTS } from '../utils/adminDashboard'

const PER_PAGE = 3

/**
 * Página visível das candidaturas pendentes do painel, 3 por página. A página 1 vem da resposta do painel
 * (sem pedido); as outras vêm do endpoint próprio. Enquanto uma página nova carrega, as linhas atuais
 * continuam visíveis com `loading` a true. Uma página que deixou de existir (lista vazia para lá da última)
 * salta para a última. O pedido em curso é cancelado ao mudar de página ou ao desmontar.
 *
 * @param {{stats: object, pending_applications: object[]}|null} dashboard Dados do painel (null no 1.º carregamento).
 * @returns {{page: number, items: object[], lastPage: number, loading: boolean, error: string,
 *   goToPage: (page: number) => void, reload: () => void}}
 */
export default function useDashboardApplications(dashboard) {
  const [target, setTarget] = useState(1)
  const [requestKey, setRequestKey] = useState(0)
  const [visible, setVisible] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const targetRef = useRef(1)

  /**
   * Muda a página pedida. A página 1 mostra logo os dados do painel; as outras são pedidas ao servidor.
   *
   * @param {number} page Página a mostrar.
   */
  const goToPage = (page) => {
    targetRef.current = page
    setTarget(page)
    setError('')

    if (page === 1) {
      setVisible(null)
      setLoading(false)
      return
    }

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
          goToPage(pagination.last_page)
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
  }, [target, requestKey])

  const dashboardTotal = dashboard?.stats?.pending_applications?.total ?? 0

  return {
    page: visible?.page ?? 1,
    items: visible?.items ?? dashboard?.pending_applications ?? [],
    lastPage: visible?.lastPage ?? Math.max(1, Math.ceil(dashboardTotal / PER_PAGE)),
    loading,
    error,
    goToPage,
    reload: () => {
      if (targetRef.current > 1) goToPage(targetRef.current)
    },
  }
}
