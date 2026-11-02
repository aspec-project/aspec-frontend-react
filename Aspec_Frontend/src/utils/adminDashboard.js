/** Textos da página do painel do backoffice. */
export const DASHBOARD_TEXTS = {
  loading: 'A carregar o painel...',
  loadError: 'Não foi possível carregar o painel.',
  retry: 'Tentar novamente',
  noApplications: 'Não há candidaturas pendentes.',
  noReviews: 'Ainda não há avaliações.',
  unknownName: 'Nome não indicado',
  unknownBusiness: 'Empresa desconhecida',
  flagged: 'Sinalizado',
}

/**
 * Formatador de números em pt-PT, criado uma vez.
 *
 * @type {Intl.NumberFormat}
 */
const countFormatter = new Intl.NumberFormat('pt-PT')

/**
 * Formata um número inteiro em pt-PT (ex.: 12345 → "12 345"; até 4 dígitos não agrupa).
 *
 * @param {number} value Número a formatar.
 * @returns {string} Número formatado.
 */
export function formatCount(value) {
  return countFormatter.format(value)
}

/**
 * Linha de baixo do cartão das candidaturas pendentes.
 *
 * @param {number} total Número de candidaturas pendentes.
 * @returns {string} "Nenhuma por analisar", "Requer ação" ou "Requerem ação".
 */
function getPendingHint(total) {
  if (total === 0) return 'Nenhuma por analisar'

  return total === 1 ? 'Requer ação' : 'Requerem ação'
}

/**
 * Cartões de totais do painel, por esta ordem: membros ativos, candidaturas pendentes, eventos deste mês e
 * avaliações para moderar (as sinalizadas), cada um com o número e a linha de baixo já formatados.
 *
 * @param {{
 *   active_members: {total: number, new_this_month: number},
 *   pending_applications: {total: number},
 *   events: {this_month: number, this_week: number},
 *   reviews: {flagged: number, new_this_week: number},
 * }} stats Totais devolvidos pela API.
 * @returns {{key: string, label: string, value: string, hint: string}[]}
 */
export function getDashboardStatCards(stats) {
  const newReviews = stats.reviews.new_this_week

  return [
    {
      key: 'members',
      label: 'Membros Ativos',
      value: formatCount(stats.active_members.total),
      hint: `+${formatCount(stats.active_members.new_this_month)} este mês`,
    },
    {
      key: 'pending',
      label: 'Candidaturas Pendentes',
      value: formatCount(stats.pending_applications.total),
      hint: getPendingHint(stats.pending_applications.total),
    },
    {
      key: 'events',
      label: 'Eventos este mês',
      value: formatCount(stats.events.this_month),
      hint: `${formatCount(stats.events.this_week)} esta semana`,
    },
    {
      key: 'reviews',
      label: 'Avaliações para moderar',
      value: formatCount(stats.reviews.flagged),
      hint: `${formatCount(newReviews)} ${newReviews === 1 ? 'nova' : 'novas'} esta semana`,
    },
  ]
}

/**
 * Nome de um negócio para mostrar, ou "Empresa desconhecida" quando não existe.
 *
 * @param {unknown} value Nome do negócio vindo da API.
 * @returns {string}
 */
export function getBusinessName(value) {
  return typeof value === 'string' && value !== '' ? value : DASHBOARD_TEXTS.unknownBusiness
}
