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
  applicationsLoadError: 'Não foi possível carregar as candidaturas.',
  noOverdue: 'Nenhuma em atraso',
  noRegistrations: 'Nenhum evento com inscrições',
  paginationLabel: 'Paginação das candidaturas pendentes',
}

/** Classes comuns às linhas das candidaturas e das avaliações do painel (mesma altura mínima nas duas listas). */
export const DASHBOARD_ROW_CLASS = 'flex min-h-24 items-center gap-3 py-3'

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
 * Linha de baixo do cartão das quotas em atraso.
 *
 * @param {{total: number, grace: number, unpaid: number}} overdue Quotas em atraso devolvidas pela API.
 * @returns {string} "N em carência · M inativas por falta de pagamento" (as duas partes sempre presentes) ou
 *   "Nenhuma em atraso" quando o total é 0.
 */
function getOverdueHint(overdue) {
  if (overdue.total === 0) return DASHBOARD_TEXTS.noOverdue

  const inactive = overdue.unpaid === 1 ? 'inativa' : 'inativas'

  return `${formatCount(overdue.grace)} em carência · ${formatCount(overdue.unpaid)} ${inactive} por falta de pagamento`
}

/**
 * Linha de baixo do cartão das inscrições desta semana.
 *
 * @param {{this_week: number, events_with_registrations: number}} registrations Inscrições devolvidas pela API.
 * @returns {string} "Em 1 evento", "Em N eventos" ou "Nenhum evento com inscrições" quando não há inscrições.
 */
function getRegistrationsHint(registrations) {
  if (registrations.this_week === 0) return DASHBOARD_TEXTS.noRegistrations

  const events = registrations.events_with_registrations

  return `Em ${formatCount(events)} ${events === 1 ? 'evento' : 'eventos'}`
}

/**
 * Nome acessível da ligação de um cartão: rótulo, número, linha de baixo e a ação. O separador " · " passa a
 * ", " porque um leitor de ecrã lê "·" como símbolo.
 *
 * @param {string} label Rótulo visível do cartão.
 * @param {string} value Número já formatado.
 * @param {string} hint Linha de baixo já formatada.
 * @param {string} action Para onde a ligação leva (ex.: "Ver utilizadores ativos").
 * @returns {string}
 */
function getCardLinkLabel(label, value, hint, action) {
  return `${label}: ${value} (${hint.replaceAll(' · ', ', ')}). ${action}`
}

/**
 * Cria um cartão com destino; o nome acessível é montado a partir do rótulo, do número e da linha de baixo.
 *
 * @param {string} key Identificador do cartão.
 * @param {string} label Rótulo visível.
 * @param {number} count Número do cartão.
 * @param {string} hint Linha de baixo já formatada.
 * @param {string} to Destino da ligação.
 * @param {string} action Texto da ação no nome acessível.
 * @returns {{key: string, label: string, value: string, hint: string, to: string, linkLabel: string}}
 */
function linkedCard(key, label, count, hint, to, action) {
  const value = formatCount(count)

  return { key, label, value, hint, to, linkLabel: getCardLinkLabel(label, value, hint, action) }
}

/**
 * Cartões de totais do painel, por esta ordem: membros ativos, candidaturas pendentes, eventos deste mês,
 * avaliações para moderar (as sinalizadas), quotas em atraso e inscrições desta semana, cada um com o número
 * e a linha de baixo já formatados, o destino da ligação e o nome acessível dessa ligação. As inscrições não
 * têm destino (`to` e `linkLabel` a null) porque não há uma lista que mostre exatamente esse número.
 *
 * @param {{
 *   active_members: {total: number, new_this_month: number},
 *   pending_applications: {total: number},
 *   events: {this_month: number, this_week: number},
 *   reviews: {flagged: number, new_this_week: number},
 *   overdue_payments: {total: number, grace: number, unpaid: number},
 *   event_registrations: {this_week: number, events_with_registrations: number},
 * }} stats Totais devolvidos pela API.
 * @returns {{key: string, label: string, value: string, hint: string, to: string|null, linkLabel: string|null}[]}
 */
export function getDashboardStatCards(stats) {
  const newReviews = stats.reviews.new_this_week

  return [
    linkedCard(
      'members',
      'Membros Ativos',
      stats.active_members.total,
      `+${formatCount(stats.active_members.new_this_month)} este mês`,
      '/admin/utilizadores?estado=active',
      'Ver utilizadores ativos',
    ),
    linkedCard(
      'pending',
      'Candidaturas Pendentes',
      stats.pending_applications.total,
      getPendingHint(stats.pending_applications.total),
      '/admin/utilizadores?estado=pending',
      'Ver candidaturas pendentes',
    ),
    linkedCard(
      'events',
      'Eventos este mês',
      stats.events.this_month,
      `${formatCount(stats.events.this_week)} esta semana`,
      '/admin/eventos',
      'Ver eventos agendados',
    ),
    linkedCard(
      'reviews',
      'Avaliações para moderar',
      stats.reviews.flagged,
      `${formatCount(newReviews)} ${newReviews === 1 ? 'nova' : 'novas'} esta semana`,
      '/admin/moderacao',
      'Abrir a moderação',
    ),
    linkedCard(
      'overdue',
      'Quotas em atraso',
      stats.overdue_payments.total,
      getOverdueHint(stats.overdue_payments),
      '/admin/utilizadores?estado=grace',
      'Ver utilizadores em carência',
    ),
    {
      key: 'registrations',
      label: 'Inscrições esta semana',
      value: formatCount(stats.event_registrations.this_week),
      hint: getRegistrationsHint(stats.event_registrations),
      to: null,
      linkLabel: null,
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
