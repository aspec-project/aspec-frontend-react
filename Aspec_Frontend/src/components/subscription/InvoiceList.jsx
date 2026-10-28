import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react'
import { normalizeError } from '../../services/api'
import {
  downloadInvoicePdf,
  getInvoices,
} from '../../services/subscription'

const PER_PAGE = 5

const initialPagination = {
  current_page: 1,
  per_page: PER_PAGE,
  total: 0,
  last_page: 1,
}

/* Mostra o mês da cobrança como no protótipo, usando sempre a data da API. */
function getInvoiceLabel(invoice) {
  const date = new Date(invoice.issued_at ?? invoice.paid_at)

  if (!Number.isNaN(date.getTime())) {
    const month = new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(
      date,
    )

    return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`
  }

  return invoice.number ? `Fatura ${invoice.number}` : 'Fatura emitida'
}

function getDownloadFilename(invoice) {
  const reference = String(invoice.number ?? invoice.id)
  const safeReference = reference
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `fatura-${safeReference || 'documento'}.pdf`
}

function getPageNumbers(currentPage, lastPage) {
  const start = Math.max(1, Math.min(currentPage - 2, lastPage - 4))
  const end = Math.min(lastPage, start + 4)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

/*
 * Cartão de faturas da área de subscrição. Carrega cinco documentos por
 * página, exatamente como a paginação apresentada no protótipo.
 */
export default function InvoiceList() {
  const [invoices, setInvoices] = useState([])
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null)

  const loadInvoices = useCallback(async (page = 1) => {
    setIsLoading(true)
    setLoadError('')

    try {
      const invoiceData = await getInvoices(page, PER_PAGE)

      setInvoices(invoiceData.items ?? [])
      setPagination(invoiceData.pagination ?? initialPagination)
    } catch (error) {
      setLoadError(normalizeError(error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function loadInitialInvoices() {
      try {
        const invoiceData = await getInvoices(1, PER_PAGE)

        if (!isCurrent) return

        setInvoices(invoiceData.items ?? [])
        setPagination(invoiceData.pagination ?? initialPagination)
        setLoadError('')
      } catch (error) {
        if (isCurrent) setLoadError(normalizeError(error).message)
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadInitialInvoices()

    return () => {
      isCurrent = false
    }
  }, [])

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
      setDownloadError(normalizeError(error).message)
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  function handlePageChange(page) {
    if (
      page < 1 ||
      page > pagination.last_page ||
      page === pagination.current_page
    ) {
      return
    }

    void loadInvoices(page)
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className="text-base font-semibold text-[#0d1f35]">Faturas</h2>
        <p className="mt-3 text-sm text-slate-600">A carregar faturas...</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 lg:col-span-2" role="alert">
        <h2 className="text-base font-semibold text-red-950">
          Não foi possível carregar as faturas
        </h2>
        <p className="mt-2 text-sm text-red-800">{loadError}</p>
        <button
          type="button"
          onClick={() => void loadInvoices()}
          className="mt-5 rounded-xl bg-[#0d1f35] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#193451]"
        >
          Tentar novamente
        </button>
      </section>
    )
  }

  const firstItem = invoices.length
    ? (pagination.current_page - 1) * pagination.per_page + 1
    : 0
  const lastItem = invoices.length ? firstItem + invoices.length - 1 : 0

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
      <h2 className="text-base font-semibold text-[#0d1f35]">Faturas</h2>
      <p className="mb-4 mt-1 text-xs text-gray-500">
        Documentos de cada cobrança mensal.
      </p>

      {downloadError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">
          {downloadError}
        </p>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <FileText size={24} aria-hidden="true" className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">
            Ainda não existem faturas.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            As faturas emitidas ficarão disponíveis aqui.
          </p>
        </div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th scope="col" className="pb-2 font-medium">
                  Fatura
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Download
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 text-[#0d1f35]">
                    {getInvoiceLabel(invoice)}
                  </td>
                  <td className="py-1.5">
                    <div className="-mr-2 flex justify-end">
                      {invoice.pdf_available ? (
                        <button
                          type="button"
                          onClick={() => void handleDownload(invoice)}
                          disabled={downloadingInvoiceId === invoice.id}
                          title={`Descarregar fatura de ${getInvoiceLabel(invoice)}`}
                          aria-label={`Descarregar fatura de ${getInvoiceLabel(invoice)}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0d1f35] transition-colors hover:bg-[#f5f3ee] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Download size={15} aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="pr-2 text-xs text-slate-400">
                          Indisponível
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">
              {firstItem}–{lastItem} de {pagination.total} faturas
            </p>

            {pagination.last_page > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  aria-label="Página anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0d1f35] transition hover:bg-[#f5f3ee] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>

                {getPageNumbers(
                  pagination.current_page,
                  pagination.last_page,
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    aria-current={page === pagination.current_page ? 'page' : undefined}
                    className={`h-8 w-8 rounded-lg text-xs font-medium transition ${
                      page === pagination.current_page
                        ? 'bg-[#0d1f35] text-white'
                        : 'text-[#0d1f35] hover:bg-[#f5f3ee]'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                  aria-label="Página seguinte"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0d1f35] transition hover:bg-[#f5f3ee] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
            )}
          </footer>
        </>
      )}
    </section>
  )
}
