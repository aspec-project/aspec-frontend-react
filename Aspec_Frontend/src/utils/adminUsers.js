import { ShieldCheck, ShieldOff } from 'lucide-react'

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

const SUBSCRIPTION_BADGE_CLASSES = {
  pending: 'bg-amber-50 text-amber-800',
  awaiting_activation: 'bg-sky-50 text-sky-800',
  trial: 'bg-indigo-50 text-indigo-800',
  active: 'bg-emerald-50 text-emerald-800',
  grace: 'bg-orange-50 text-orange-800',
  lapsed: INACTIVE_CLASS,
  inactive: INACTIVE_CLASS,
  blocked: 'bg-red-50 text-red-700',
  exempt: 'bg-amber-50 text-[#8a7043]',
}

const INACTIVE_LABELS = {
  rejected: 'Recusado',
  unpaid: 'Pagamento em falta',
  cancelled: 'Cancelado',
}

/**
 * Etiqueta do estado de um utilizador: o estado da subscrição quando a API o envia (texto da API,
 * cor pelo valor); senão, o estado da conta e o motivo de inatividade.
 *
 * @param {{account_status?: {name?: string}, inactive_reason?: string|null, subscription_state?: {value?: string, label?: string}|null}} user
 * @returns {{label: string, className: string, title?: string}}
 */
export function getStatusBadge(user) {
  const state = user?.subscription_state

  if (typeof state?.label === 'string' && state.label.trim() !== '') {
    return { label: state.label, className: SUBSCRIPTION_BADGE_CLASSES[state.value] ?? INACTIVE_CLASS }
  }

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
 * Mês abreviado e ano, em hora local (ex.: "Jan 2024").
 *
 * @param {string|null|undefined} isoString Data ISO 8601 devolvida pela API.
 * @returns {string} A data formatada, ou "" se for inválida.
 */
export function formatMonthYear(isoString) {
  const date = parseDate(isoString)

  return date ? `${MONTHS[date.getMonth()]} ${date.getFullYear()}` : ''
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

  return formatMonthYear(isoString)
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

/**
 * Papel do utilizador em português.
 *
 * @param {{role?: {name?: string}}} user
 * @returns {string} "Administrador", "Membro" ou "Não indicado".
 */
export function getRoleLabel(user) {
  switch (user?.role?.name) {
    case 'Admin':
      return 'Administrador'
    case 'Member':
      return 'Membro'
    default:
      return 'Não indicado'
  }
}

const WEEK_DAY_SHORT_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

const CLOSED_LABEL = 'Encerrado'

/**
 * Agrupa o horário semanal em intervalos de dias consecutivos com o mesmo horário (segunda a domingo).
 *
 * @param {{week_day_id: number, open_time: string, close_time: string}[]|undefined} hours Horário da API.
 * @returns {{label: string, value: string, closed: boolean}[]} Intervalos por ordem; [] se não houver horário.
 */
export function groupBusinessHours(hours = []) {
  const days = WEEK_DAY_SHORT_LABELS.map((label, index) => {
    const day = (hours ?? []).find((item) => item?.week_day_id === index + 1 && item.open_time && item.close_time)

    return { label, value: day ? `${day.open_time} — ${day.close_time}` : CLOSED_LABEL, closed: !day }
  })

  if (days.every((day) => day.closed)) {
    return []
  }

  const groups = []

  for (const day of days) {
    const last = groups.at(-1)

    if (last && last.value === day.value) {
      last.end = day.label
    } else {
      groups.push({ start: day.label, end: day.label, value: day.value, closed: day.closed })
    }
  }

  return groups.map(({ start, end, value, closed }) => ({
    label: start === end ? start : `${start} — ${end}`,
    value,
    closed,
  }))
}

/**
 * Nomes das ações de administração sobre um utilizador, por chave da API.
 *
 * @type {{approve: string, reject: string, block: string, unblock: string, promote: string, demote: string}}
 */
export const USER_ACTION_LABELS = {
  approve: 'Aprovar',
  reject: 'Recusar',
  block: 'Bloquear',
  unblock: 'Desbloquear',
  promote: 'Promover a administrador',
  demote: 'Despromover',
}

const BLOCKABLE_INACTIVE_REASONS = ['unpaid', 'cancelled']

/**
 * Indica se o utilizador é o administrador técnico (isento de subscrição, nunca despromovível).
 *
 * @param {{subscription_state?: {value?: string}|null}} user
 * @returns {boolean}
 */
function isExemptAdmin(user) {
  return user?.subscription_state?.value === 'exempt'
}

/**
 * Ações disponíveis para um utilizador, pela ordem de apresentação. Admins só podem ser
 * despromovidos (exceto o administrador técnico); na própria conta de membro não há ações.
 * Esconder botões é só UX: a autorização e as guardas 409 estão no backend.
 *
 * @param {{id?: string, role?: {name?: string}, account_status?: {name?: string}, inactive_reason?: string|null, subscription_state?: {value?: string}|null}} user
 * @param {string|undefined} currentUserId Id do admin com sessão iniciada.
 * @returns {('approve'|'reject'|'block'|'unblock'|'promote'|'demote')[]}
 */
export function getAvailableActions(user, currentUserId) {
  if (!user) {
    return []
  }

  if (user.role?.name === 'Admin') {
    return isExemptAdmin(user) ? [] : ['demote']
  }

  if (user.id === currentUserId) {
    return []
  }

  switch (user.account_status?.name) {
    case 'Pending':
      return ['approve', 'reject']
    case 'Approved':
      return ['block']
    case 'Active':
      return ['block', 'promote']
    case 'Inactive':
      if (user.inactive_reason === 'blocked') {
        return ['unblock']
      }

      return BLOCKABLE_INACTIVE_REASONS.includes(user.inactive_reason) ? ['block'] : []
    default:
      return []
  }
}

/**
 * Ações que aparecem desativadas: o "Despromover" na própria conta de admin (o backend recusaria
 * com 409), para explicar a regra em vez de esconder o botão.
 *
 * @param {{id?: string, role?: {name?: string}, subscription_state?: {value?: string}|null}} user
 * @param {string|undefined} currentUserId Id do admin com sessão iniciada.
 * @returns {'demote'[]}
 */
export function getLockedActions(user, currentUserId) {
  if (user && user.id === currentUserId && user.role?.name === 'Admin' && !isExemptAdmin(user)) {
    return ['demote']
  }

  return []
}

/**
 * Nota do diálogo de despromover: o número de administradores antes e depois, quando é conhecido.
 *
 * @param {unknown} adminsCount Total de administradores devolvido pela API.
 * @returns {string}
 */
function demoteNote(adminsCount) {
  if (Number.isSafeInteger(adminsCount) && adminsCount >= 2) {
    return `Existem ${adminsCount} administradores. Depois desta ação ficam ${adminsCount - 1}. A plataforma tem sempre de ter pelo menos um.`
  }

  return 'A plataforma tem sempre de ter pelo menos um administrador.'
}

/**
 * Textos do diálogo de confirmação de uma ação, com o efeito real no backend (incluindo emails).
 *
 * @param {'approve'|'reject'|'block'|'unblock'|'promote'|'demote'} action
 * @param {{email?: string, member_profile?: {name?: string}|null}} user
 * @param {{adminsCount?: number}} [context] Total de administradores, para a nota do despromover.
 * @returns {{title: string, description: string, confirmLabel: string, tone: 'primary'|'danger', icon?: import('react').ComponentType, confirmDelay?: number, note?: string}}
 */
export function getActionConfirmation(action, user, context = {}) {
  const who = user?.member_profile?.name ? `${getDisplayName(user)} (${user.email})` : getDisplayName(user)

  switch (action) {
    case 'promote':
      return {
        title: 'Promover a administrador',
        description: `${who} passa a ter acesso total ao backoffice: aprovar e bloquear membros, gerir eventos, moderar avaliações e promover ou despromover outros administradores.`,
        confirmLabel: USER_ACTION_LABELS.promote,
        tone: 'primary',
        icon: ShieldCheck,
      }
    case 'demote':
      return {
        title: 'Despromover administrador',
        description: `${getDisplayName(user)} deixa de ter acesso ao backoffice, à gestão de utilizadores, eventos e moderação. Continua a ser membro e só então pode ser gerido(a) como tal. Esta é uma decisão importante: só outro administrador a poderá reverter, promovendo-o(a) de novo.`,
        confirmLabel: USER_ACTION_LABELS.demote,
        tone: 'danger',
        icon: ShieldOff,
        confirmDelay: 2,
        note: demoteNote(context?.adminsCount),
      }
    case 'approve':
      return {
        title: 'Aprovar candidatura',
        description: `Aprovar a candidatura de ${who}? A conta passa a Aprovada e é enviado um email com o link para pagar a quota. Só fica ativa depois do pagamento.`,
        confirmLabel: USER_ACTION_LABELS.approve,
        tone: 'primary',
      }
    case 'reject':
      return {
        title: 'Recusar candidatura',
        description: `Recusar a candidatura de ${who}? A conta fica inativa e não é enviado nenhum email.`,
        confirmLabel: USER_ACTION_LABELS.reject,
        tone: 'danger',
      }
    case 'block':
      return {
        title: 'Bloquear membro',
        description: `Bloquear ${who}? A conta fica inativa, as sessões abertas terminam e a subscrição ou o pagamento pendente são cancelados. Não é enviado nenhum email.`,
        confirmLabel: USER_ACTION_LABELS.block,
        tone: 'danger',
      }
    case 'unblock':
    default:
      return {
        title: 'Desbloquear membro',
        description: `Desbloquear ${who}? A conta não fica logo ativa: é enviado um email com o link para pagar a quota e só fica ativa depois do pagamento.`,
        confirmLabel: USER_ACTION_LABELS.unblock,
        tone: 'primary',
      }
  }
}
