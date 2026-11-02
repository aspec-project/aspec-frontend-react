import { formatDayMonthTime, formatShortDate } from './dateFormat'

/** Textos da secção dos cartões de oração na página do evento do backoffice e do diálogo de distribuição. */
export const PRAYER_CARDS_TEXTS = {
  title: 'Cartões de oração',
  filledLabel: 'Cartões preenchidos',
  statusLabel: 'Estado',
  disabledNote: 'Os cartões de oração não estão ativos neste evento. Pode ativá-los ao editar o evento.',
  lockNote: 'Por confidencialidade, a administração não vê o conteúdo dos cartões nem quem recebe cada um.',
  participantsTitle: 'Entregaram o cartão',
  noParticipants: 'Ainda ninguém entregou o cartão.',
  unknownName: 'Nome indisponível',
  distributeLabel: 'Distribuir agora',
  dialogTitle: 'Distribuir os cartões já?',
  dialogDescription: 'Depois de distribuídos, quem ainda não preencheu deixa de poder fazê-lo.',
  loading: 'A carregar cartões de oração...',
  loadError: 'Não foi possível carregar os cartões de oração.',
  retry: 'Tentar novamente',
}

/**
 * Fase dos cartões de um evento, calculada com a hora do browser e as mesmas regras do backend: distribuídos
 * assim que há data de distribuição; senão ainda não abriram antes de `opens_at`, estão abertos até
 * `closes_at` (inclusive) e depois disso o prazo terminou. Compara instantes, por isso a mudança de hora não
 * altera o resultado.
 *
 * @param {{window: {opens_at: string, closes_at: string}, distributed_at: string|null}} status Estado dos cartões.
 * @param {number} [now] Momento atual em milissegundos.
 * @returns {'not_open'|'open'|'closed'|'distributed'}
 */
export function getPrayerCardsPhase(status, now = Date.now()) {
  if (status.distributed_at) return 'distributed'
  if (now < Date.parse(status.window.opens_at)) return 'not_open'
  if (now <= Date.parse(status.window.closes_at)) return 'open'

  return 'closed'
}

/**
 * Badge do estado dos cartões: o tom (cor e ícone) e o texto de cada fase.
 *
 * @param {{window: {opens_at: string, closes_at: string}, distributed_at: string|null}} status Estado dos cartões.
 * @param {number} [now] Momento atual em milissegundos.
 * @returns {{tone: 'waiting'|'warning'|'success', text: string}}
 */
export function getPrayerCardsBadge(status, now = Date.now()) {
  switch (getPrayerCardsPhase(status, now)) {
    case 'distributed':
      return { tone: 'success', text: `Distribuídos em ${formatDayMonthTime(status.distributed_at)}` }
    case 'not_open':
      return { tone: 'waiting', text: `Abre a ${formatShortDate(status.window.opens_at)}` }
    case 'open':
      return { tone: 'waiting', text: 'A aguardar o fim do prazo (23h59)' }
    default:
      return { tone: 'warning', text: 'Prazo terminado · distribuição automática em breve' }
  }
}

/**
 * Indica se o admin pode distribuir os cartões: com o prazo aberto ou já terminado, desde que ainda não tenham
 * sido distribuídos. É só UX: o backend decide e responde 409 nos outros casos.
 *
 * @param {'not_open'|'open'|'closed'|'distributed'} phase Fase dos cartões.
 * @returns {boolean}
 */
export function canDistributePrayerCards(phase) {
  return phase === 'open' || phase === 'closed'
}

/**
 * Percentagem de inscritos que preencheram o cartão, arredondada, entre 0 e 100.
 *
 * @param {number} cards Número de cartões preenchidos.
 * @param {number} registrations Número de inscritos.
 * @returns {number} Percentagem (0 sem inscritos).
 */
export function getCardsProgress(cards, registrations) {
  if (!Number.isInteger(registrations) || registrations <= 0 || !Number.isInteger(cards) || cards <= 0) return 0

  return Math.min(100, Math.round((cards / registrations) * 100))
}

/**
 * Resumo do diálogo de distribuição, ex.: "6 de 18 inscritos preencheram o cartão.".
 *
 * @param {number} cards Número de cartões preenchidos.
 * @param {number} registrations Número de inscritos.
 * @returns {string}
 */
export function formatCardsSummary(cards, registrations) {
  return `${cards} de ${registrations} inscritos preencheram o cartão.`
}
