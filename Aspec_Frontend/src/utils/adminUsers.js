/**
 * Separadores de estado da Gestão de Utilizadores, por ordem. A `key` é a chave em `counts`
 * e `filters` são os filtros enviados à API.
 *
 * @type {{key: string, label: string, filters: {status?: string, blocked?: boolean}}[]}
 */
export const USER_STATUS_TABS = [
  { key: 'all', label: 'Todos', filters: {} },
  { key: 'active', label: 'Ativos', filters: { status: 'Active' } },
  { key: 'pending', label: 'Pendentes', filters: { status: 'Pending' } },
  { key: 'approved', label: 'Aprovados', filters: { status: 'Approved' } },
  { key: 'blocked', label: 'Bloqueados', filters: { status: 'Inactive', blocked: true } },
  { key: 'inactive', label: 'Inativos', filters: { status: 'Inactive', blocked: false } },
]

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const INACTIVE_CLASS = 'bg-slate-100 text-slate-700'

const INACTIVE_LABELS = {
  rejected: 'Recusado',
  unpaid: 'Pagamento em falta',
  cancelled: 'Cancelado',
}

/**
 * Etiqueta do estado de um utilizador, a partir do estado da conta e do motivo de inatividade.
 *
 * @param {{account_status?: {name?: string}, inactive_reason?: string|null}} user
 * @returns {{label: string, className: string, title?: string}}
 */
export function getStatusBadge(user) {
  switch (user?.account_status?.name) {
    case 'Pending':
      return { label: 'Pendente', className: 'bg-amber-50 text-amber-800' }
    case 'Approved':
      return { label: 'Aprovado', className: 'bg-sky-50 text-sky-800', title: 'Aprovado, a aguardar pagamento' }
    case 'Active':
      return { label: 'Ativo', className: 'bg-emerald-50 text-emerald-800' }
    default:
      if (user?.inactive_reason === 'blocked') {
        return { label: 'Bloqueado', className: 'bg-red-50 text-red-700' }
      }

      return { label: INACTIVE_LABELS[user?.inactive_reason] ?? 'Inativo', className: INACTIVE_CLASS }
  }
}

/**
 * Converte uma data ISO numa Date válida, ou null.
 *
 * @param {string|null|undefined} isoString
 * @returns {Date|null}
 */
function parseDate(isoString) {
  if (!isoString) {
    return null
  }

  const date = new Date(isoString)

  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Data de registo curta, em hora local: "Hoje", "Ontem" ou mês e ano (ex.: "Jan 2024").
 *
 * @param {string|null|undefined} isoString Data ISO 8601 devolvida pela API.
 * @param {Date} [now] Data de referência (hoje).
 * @returns {string} A data formatada, ou "—" se for inválida.
 */
export function formatRegistrationDate(isoString, now = new Date()) {
  const date = parseDate(isoString)

  if (!date) {
    return '—'
  }

  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)

  if (sameDay(date, now)) {
    return 'Hoje'
  }

  if (sameDay(date, yesterday)) {
    return 'Ontem'
  }

  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Data completa em dd/mm/aaaa, em hora local.
 *
 * @param {string|null|undefined} isoString Data ISO 8601 devolvida pela API.
 * @returns {string} A data formatada, ou "" se for inválida.
 */
export function formatFullDate(isoString) {
  const date = parseDate(isoString)

  if (!date) {
    return ''
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${day}/${month}/${date.getFullYear()}`
}

/**
 * Nome a mostrar: o nome profissional ou, sem perfil, o email.
 *
 * @param {{email?: string, member_profile?: {name?: string}|null}} user
 * @returns {string}
 */
export function getDisplayName(user) {
  return user?.member_profile?.name || user?.email || ''
}

/**
 * Primeira letra do nome a mostrar, em maiúscula (para o avatar).
 *
 * @param {{email?: string, member_profile?: {name?: string}|null}} user
 * @returns {string}
 */
export function getInitial(user) {
  return getDisplayName(user).charAt(0).toUpperCase()
}
