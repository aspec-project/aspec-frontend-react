const MAX_PAGES_WITHOUT_GAPS = 7

/**
 * Páginas a mostrar numa paginação numerada. Até 7 páginas mostra todas; acima disso mostra a primeira,
 * a última e a atual com as vizinhas, com "gap" onde há páginas escondidas.
 *
 * @param {number} current Página atual.
 * @param {number} last Última página.
 * @returns {(number|'gap')[]} Números de página e marcadores de salto, por ordem.
 */
export function getPageItems(current, last) {
  if (last <= MAX_PAGES_WITHOUT_GAPS) {
    return Array.from({ length: Math.max(last, 0) }, (_, index) => index + 1)
  }

  const pages = [...new Set([1, current - 1, current, current + 1, last])]
    .filter((page) => page >= 1 && page <= last)
    .sort((a, b) => a - b)

  return pages.flatMap((page, index) => (index > 0 && page - pages[index - 1] > 1 ? ['gap', page] : [page]))
}
