/** Filtros da página de moderação, pela ordem dos chips (a `key` é o valor do `status` da API). */
export const REVIEW_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'flagged', label: 'Sinalizadas' },
  { key: 'visible', label: 'Visíveis' },
  { key: 'hidden', label: 'Ocultas' },
]

const URL_FILTERS = ['flagged', 'visible', 'hidden']

const UNKNOWN_BUSINESS = 'Empresa desconhecida'

const FLAGGED_LEAD = 'Oculta enquanto estiver sinalizada.'

const EMPTY_TEXTS = {
  all: 'Não há avaliações.',
  flagged: 'Não há avaliações sinalizadas.',
  visible: 'Não há avaliações visíveis.',
  hidden: 'Não há avaliações ocultas.',
}

const ACTIONS_BY_STATUS = {
  Visible: ['hide'],
  Hidden: ['show'],
  Flagged: ['unflag', 'hide'],
}

const ACTION_PREFIXES = {
  hide: 'Ocultar avaliação de',
  show: 'Mostrar avaliação de',
  unflag: 'Retirar sinalização da avaliação de',
}

const DIALOGS = {
  hide: {
    title: 'Ocultar avaliação',
    description: 'A avaliação deixa de ser visível publicamente. Pode indicar uma justificação, que será mostrada ao membro avaliado na sua área pessoal.',
    confirmLabel: 'Ocultar avaliação',
    label: 'Justificação (opcional)',
    placeholder: 'Ex: A avaliação viola o Código de Conduta da ASPEC...',
    maxLength: 2000,
    tone: 'primary',
  },
  show: {
    title: 'Mostrar avaliação',
    description: 'A avaliação volta a ficar visível publicamente e a justificação de ocultação é removida.',
    confirmLabel: 'Mostrar avaliação',
    tone: 'primary',
  },
  unflag: {
    title: 'Retirar sinalização',
    description: 'A avaliação deixa de estar sinalizada e volta a ficar visível publicamente.',
    confirmLabel: 'Retirar sinalização',
    tone: 'primary',
  },
}

/**
 * Lê o filtro vindo do URL (`?estado=`). Só aceita os três estados conhecidos; tudo o resto abre em "Todas".
 *
 * @param {unknown} value Valor do parâmetro `estado`.
 * @returns {'all'|'flagged'|'visible'|'hidden'}
 */
export function parseReviewFilter(value) {
  return URL_FILTERS.includes(value) ? value : 'all'
}

/**
 * Texto da faixa vermelha das avaliações sinalizadas, com o plural correto.
 *
 * @param {number} count Número de avaliações sinalizadas.
 * @returns {{strong: string, rest: string}|null} Início a negrito e resto da frase, ou null com 0.
 */
export function getFlaggedBannerText(count) {
  if (!count) return null

  return count === 1
    ? { strong: '1 avaliação sinalizada', rest: ' oculta ao público até decisão do admin.' }
    : { strong: `${count} avaliações sinalizadas`, rest: ' ocultas ao público até decisão do admin.' }
}

/**
 * Badge do estado de uma avaliação.
 *
 * @param {string} status Estado da API (Visible, Hidden ou Flagged).
 * @returns {{label: string, tone: 'danger'|'muted'}|null} Badge, ou null nas visíveis.
 */
export function getReviewBadge(status) {
  if (status === 'Flagged') return { label: 'Sinalizada', tone: 'danger' }
  if (status === 'Hidden') return { label: 'Oculta', tone: 'muted' }

  return null
}

/**
 * Origem da sinalização de uma avaliação sinalizada, a partir das origens dos reports.
 *
 * @param {string[]} sources Origens (`automatic`, `member`).
 * @returns {string}
 */
function getFlaggingText(sources) {
  const automatic = sources.includes('automatic')
  const member = sources.includes('member')

  if (automatic && member) return 'Sinalizada pelo filtro automático e denunciada por membros.'
  if (automatic) return 'Sinalizada pelo filtro automático.'
  if (member) return 'Denunciada por membros.'

  return 'Sinalizada para moderação.'
}

/**
 * Nota de estado do cartão. As origens da sinalização só são lidas nas sinalizadas (nas outras podem ser
 * reports antigos já resolvidos).
 *
 * @param {{status: string, hidden_reason: string|null, flagging_sources: string[]}} review Avaliação.
 * @returns {{tone: 'muted'|'danger', lead: string|null, text: string}|null} Nota, ou null nas visíveis.
 */
export function getReviewNote(review) {
  if (review.status === 'Hidden') {
    const reason = typeof review.hidden_reason === 'string' ? review.hidden_reason.trim() : ''

    return { tone: 'muted', lead: null, text: reason === '' ? 'Oculta sem justificação.' : review.hidden_reason }
  }

  if (review.status === 'Flagged') {
    return { tone: 'danger', lead: FLAGGED_LEAD, text: getFlaggingText(review.flagging_sources ?? []) }
  }

  return null
}

/**
 * Ações disponíveis para um estado, pela ordem dos botões.
 *
 * @param {string} status Estado da API.
 * @returns {('hide'|'show'|'unflag')[]}
 */
export function getReviewActions(status) {
  return ACTIONS_BY_STATUS[status] ?? []
}

/**
 * Nome de um negócio para mostrar, com "Empresa desconhecida" quando não há nome.
 *
 * @param {{business_name: string|null}|null|undefined} business Negócio do autor ou avaliado.
 * @returns {string}
 */
export function getBusinessLabel(business) {
  const name = business?.business_name

  return typeof name === 'string' && name !== '' ? name : UNKNOWN_BUSINESS
}

/**
 * Nome acessível de um botão de ação: começa pelo texto visível e diz qual é a avaliação.
 *
 * @param {'hide'|'show'|'unflag'} action Ação do botão.
 * @param {{reviewer: object|null, reviewed: object|null}} review Avaliação do cartão.
 * @returns {string} Ex.: "Ocultar avaliação de Construções Silva & Filhos a TechBless Solutions".
 */
export function getReviewActionLabel(action, review) {
  return `${ACTION_PREFIXES[action]} ${getBusinessLabel(review.reviewer)} a ${getBusinessLabel(review.reviewed)}`
}

/**
 * Texto alternativo das estrelas.
 *
 * @param {number} rating Nota de 1 a 5.
 * @returns {string} Ex.: "4 de 5 estrelas".
 */
export function getRatingLabel(rating) {
  return `${rating} de 5 estrelas`
}

/**
 * Textos do diálogo de confirmação de uma ação.
 *
 * @param {'hide'|'show'|'unflag'} action Ação a confirmar.
 * @returns {{title: string, description: string, confirmLabel: string, tone: 'primary', label?: string, placeholder?: string, maxLength?: number}|null}
 */
export function getReviewDialog(action) {
  return DIALOGS[action] ?? null
}

/**
 * Texto da lista vazia de cada filtro.
 *
 * @param {string} filter Filtro ativo.
 * @returns {string}
 */
export function getEmptyReviewsText(filter) {
  return EMPTY_TEXTS[filter] ?? EMPTY_TEXTS.all
}

/**
 * Total de avaliações do filtro, com o plural correto.
 *
 * @param {number} total Número de avaliações.
 * @returns {string} Ex.: "1 avaliação", "31 avaliações".
 */
export function formatReviewsTotal(total) {
  return `${total} ${total === 1 ? 'avaliação' : 'avaliações'}`
}
