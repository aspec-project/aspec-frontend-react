import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react'
import { normalizeError } from '../../services/api'
import {
  downloadInvoicePdf,
  getInvoices,
} from '../../services/subscription'

const initialPagination = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
}

/*
 * O backend expõe apenas estes dois estados ao membro. Os estados internos
 * de emissão não são apresentados, porque não requerem nenhuma ação deste.
 */
const invoiceStatuses = {
  issued: {
    label: 'Emitida',
    className: 'bg-emerald-50 text-emerald-800',
  },
  processing: {
    label: 'Em emissão',
    className: 'bg-amber-50 text-amber-800',
  },
}

/*
 * Converte uma data ISO devolvida pela API para o formato português.
 */
function formatDate(dateValue) {
  if (!dateValue) {
    return '—'
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/*
 * Formata o valor da fatura com a moeda configurada no backend.
 */
function formatAmount(amount, currency) {
  if (typeof amount !== 'number' || !currency) {
    return '—'
  }

  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

/*
 * Cria um nome seguro e legível para o ficheiro descarregado. Se a fatura
 * ainda não tiver número, usamos o seu identificador como alternativa.
 */
function getDownloadFilename(invoice) {
  const reference = String(invoice.number ?? invoice.id)
  const safeReference = reference
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `fatura-${safeReference || 'documento'}.pdf`
}

/*
 * Lista paginada das faturas pertencentes ao membro autenticado.
 *
 * Cada pedido é sempre feito através da API autenticada, pelo que esta
 * componente nunca recebe nem apresenta faturas de outro utilizador.
 */
export default function InvoiceList() {
  const [invoices, setInvoices] = useState([])
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null)

  /*
   * Obtém uma página da lista e guarda os metadados devolvidos pelo backend
   * para que os controlos anterior/seguinte reflitam o estado real.
   */
  const loadInvoices = useCallback(async (page = 1) => {
    setIsLoading(true)
    setLoadError('')

    try {
      const invoiceData = await getInvoices(page)

      setInvoices(invoiceData.items ?? [])
      setPagination(invoiceData.pagination ?? initialPagination)
    } catch (error) {
      const normalisedError = normalizeError(error)

      setLoadError(normalisedError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /*
   * Carrega a primeira página quando a área de subscrição é aberta.
   *
   * O estado só é atualizado depois de a API responder. O controlo isCurrent
   * evita atualizar a componente se o membro sair desta página durante o pedido.
   */
  useEffect(() => {
    let isCurrent = true

    async function loadInitialInvoices() {
      try {
        const invoiceData = await getInvoices()

        if (!isCurrent) {
          return
        }

        setInvoices(invoiceData.items ?? [])
        setPagination(invoiceData.pagination ?? initialPagination)
        setLoadError('')
      } catch (error) {
        if (!isCurrent) {
          return
        }

        const normalisedError = normalizeError(error)

        setLoadError(normalisedError.message)
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadInitialInvoices()

    return () => {
      isCurrent = false
    }
  }, [])

  /*
   * Pede o PDF à API e inicia o download apenas no browser. A URL temporária
   * é libertada logo a seguir para não manter dados da fatura em memória.
   */
  async function handleDownload(invoice) {
    setDownloadingInvoiceId(invoice.id)
    setDownloadError('')

    try {
      const pdfBlob = await downloadInvoicePdf(invoice.id)
      const downloadUrl = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')

      link.href = downloadUrl
      link.download = getDownloadFilename(invoice)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      const normalisedError = normalizeError(error)

      setDownloadError(normalisedError.message)
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  function handlePageChange(page) {
    if (page < 1 || page > pagination.last_page || page === pagination.current_page) {
      return
    }

    loadInvoices(page)
  }

  if (isLoading) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#0d1f35]">Faturas</h2>
        <p className="mt-3 text-sm text-slate-600">A carregar faturas...</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-xl font-semibold text-red-950">
          Não foi possível carregar as faturas
        </h2>
        <p className="mt-3 text-sm text-red-800">{loadError}</p>

        <button
          type="button"
          onClick={() => loadInvoices()}
          className="mt-5 rounded-lg bg-[#0d1f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193451]"
        >
          Tentar novamente
        </button>
      </section>
    )
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0d1f35]">Faturas</h2>
          <p className="mt-1 text-sm text-slate-600">
            Consulta e descarrega as faturas emitidas para a tua subscrição.
          </p>
        </div>

        <span className="text-sm text-slate-500">
          {pagination.total}{' '}
          {pagination.total === 1 ? 'fatura' : 'faturas'}
        </span>
      </div>

      {downloadError && (
        <div
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {downloadError}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <FileText
            size={28}
            aria-hidden="true"
            className="mx-auto text-slate-400"
          />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Ainda não existem faturas.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            As faturas emitidas ficarão disponíveis aqui.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Fatura
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Pagamento
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Valor
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Documento
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => {
                  const status =
                    invoiceStatuses[invoice.status] ?? invoiceStatuses.processing

                  return (
                    <tr key={invoice.id} className="text-slate-700">
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {invoice.number ?? 'Em emissão'}
                      </td>
                      <td className="px-4 py-4">
                        {formatDate(invoice.paid_at)}
                      </td>
                      <td className="px-4 py-4">
                        {formatAmount(invoice.amount, invoice.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {invoice.pdf_available ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(invoice)}
                            disabled={downloadingInvoiceId === invoice.id}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#0d1f35] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Descarregar PDF da fatura ${
                              invoice.number ?? invoice.id
                            }`}
                          >
                            <Download size={16} aria-hidden="true" />
                            {downloadingInvoiceId === invoice.id
                              ? 'A preparar...'
                              : 'PDF'}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Indisponível
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pagination.last_page > 1 && (
            <footer className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Página {pagination.current_page} de {pagination.last_page}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Seguinte
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </footer>
          )}
        </>
      )}
    </section>
  )
}
