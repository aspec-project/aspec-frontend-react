import { api, API_URL } from './api'
import { getSessionContext } from './sessionContext'

const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0
const validId = (value) => typeof value === 'string' && value.trim() !== ''
const validReference = (value) => validId(value?.id) && typeof value.name === 'string' && value.name.trim() !== ''

export async function getMembers(filters, references, signal) {
  const { search = '', sector_id = '', location_id = '', min_rating = '', page = 1, per_page = 12 } = filters
  if (typeof search !== 'string' || !positiveInteger(page) || !positiveInteger(per_page) || per_page > 50) {
    throw new Error('Os parâmetros de pesquisa são inválidos.')
  }
  const params = { page, per_page }
  if (search.trim()) params.search = search.trim()
  for (const [key, value, list] of [
    ['sector_id', sector_id, references.sectors],
    ['location_id', location_id, references.locations],
  ]) {
    if (value !== '') {
      if (!validId(value) || !list.some((item) => item.id === value)) {
        throw new Error('Selecione uma opção disponível nos filtros.')
      }
      params[key] = value
    }
  }
  if (min_rating !== '') {
    const rating = Number(min_rating)
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error('A avaliação mínima selecionada não está disponível.')
    }
    params.min_rating = rating
  }
  const response = await api.get('/members', { params, signal, skipAuthRedirect: true })
  const body = response.data
  const items = body?.data?.items
  const pagination = body?.data?.pagination
  if (body?.success !== true || !Array.isArray(items) || !pagination ||
    !positiveInteger(pagination.current_page) || !positiveInteger(pagination.per_page) ||
    pagination.per_page > 50 || !Number.isSafeInteger(pagination.total) || pagination.total < 0 ||
    !positiveInteger(pagination.last_page) || pagination.current_page !== page ||
    pagination.per_page !== per_page ||
    pagination.last_page !== Math.max(1, Math.ceil(pagination.total / pagination.per_page)) ||
    pagination.current_page > pagination.last_page ||
    items.length > pagination.per_page || items.length > pagination.total ||
    (pagination.total === 0 && items.length !== 0) ||
    new Set(items.map((item) => item?.id)).size !== items.length ||
    !items.every((item) => validId(item?.id) && typeof item.name === 'string' && item.name.trim() &&
      (item.business_name === null || typeof item.business_name === 'string') &&
      (item.description == null || typeof item.description === 'string') &&
      validReference(item.sector) && validReference(item.location) &&
      (item.logo_url === null || typeof item.logo_url === 'string') &&
      (item.average_rating === null || (typeof item.average_rating === 'number' && Number.isFinite(item.average_rating) && item.average_rating >= 0 && item.average_rating <= 5)) &&
      Number.isSafeInteger(item.reviews_count) && item.reviews_count >= 0)) {
    throw new Error('A resposta do diretório tem um formato inesperado.')
  }
  /*
   * O resumo do diretório só admite os campos públicos confirmados.
   * Contactos e campos adicionais são descartados para todas as sessões.
   */
  return {
    items: items.map((item) => ({
      id: item.id, name: item.name, business_name: item.business_name, description: item.description,
      sector: { id: item.sector.id, name: item.sector.name },
      location: { id: item.location.id, name: item.location.name },
      logo_url: item.logo_url, average_rating: item.average_rating, reviews_count: item.reviews_count,
    })),
    pagination,
  }
}

export const isMemberProfileId = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export function safeMemberUrl(value, asset = false) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = asset ? new URL(value, `${API_URL}/`) : new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

const nullableText = (value) => value === null || typeof value === 'string'
const weekDays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
const time = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

export async function getPublicMemberProfile(id, allowContacts = false, signal) {
  if (!isMemberProfileId(id)) throw new Error('O identificador do membro é inválido.')
  const response = await api.get(`/members/${encodeURIComponent(id)}`, { signal, skipAuthRedirect: true })
  const body = response.data
  const data = body?.data
  if (body?.success !== true || !data || data.id !== id || !isMemberProfileId(data.id) ||
    typeof data.name !== 'string' || !data.name.trim() ||
    !['business_name', 'description', 'logo_url'].every((key) => nullableText(data[key])) ||
    !validReference(data.sector) || !validReference(data.location) ||
    !(data.average_rating === null || (typeof data.average_rating === 'number' && Number.isFinite(data.average_rating) && data.average_rating >= 0 && data.average_rating <= 5)) ||
    !Number.isSafeInteger(data.reviews_count) || data.reviews_count < 0 ||
    !Array.isArray(data.business_hours) || !data.business_hours.every((item) => item && positiveInteger(item.week_day_id) && weekDays.includes(item.week_day) && (item.open_time === null || time(item.open_time)) && (item.close_time === null || time(item.close_time))) ||
    !Array.isArray(data.portfolio) || !data.portfolio.every((item) => item && validId(item.id) && typeof item.image_url === 'string') ||
    new Set(data.portfolio.map((item) => item.id)).size !== data.portfolio.length) {
    throw new Error('A resposta do perfil tem um formato inesperado.')
  }
  /*
   * A lista explícita impede que campos privados ou novos campos da API
   * entrem no perfil público por propagação do objeto recebido.
   */
  const profile = {
    id: data.id, name: data.name, business_name: data.business_name,
    description: data.description,
    logo_url: safeMemberUrl(data.logo_url, true),
    sector: { id: data.sector.id, name: data.sector.name },
    location: { id: data.location.id, name: data.location.name },
    average_rating: data.average_rating, reviews_count: data.reviews_count,
    business_hours: data.business_hours.map((item) => ({ week_day_id: item.week_day_id, week_day: item.week_day, open_time: item.open_time, close_time: item.close_time })),
    portfolio: data.portfolio.map((item) => ({ id: item.id, image_url: safeMemberUrl(item.image_url, true) })),
  }
  if (allowContacts === true && data.members_only !== undefined && data.members_only !== null) {
    const contacts = data.members_only
    if (typeof contacts !== 'object' || Array.isArray(contacts) ||
      !['website_url', 'address', 'commercial_phone', 'commercial_email'].every((key) => nullableText(contacts[key])) ||
      !['postal_code', 'city'].every((key) => contacts[key] === undefined || nullableText(contacts[key])) ||
      !Array.isArray(contacts.social_links) || !contacts.social_links.every((item) => item && isMemberProfileId(item.platform_id) && typeof item.platform === 'string' && item.platform.trim() !== '' && typeof item.url === 'string')) {
      throw new Error('A resposta do perfil tem um formato inesperado.')
    }
    profile.members_only = {
      website_url: safeMemberUrl(contacts.website_url), address: contacts.address,
      postal_code: contacts.postal_code, city: contacts.city,
      social_links: contacts.social_links.map((item) => ({ platform_id: item.platform_id, platform: item.platform, url: safeMemberUrl(item.url) })),
      commercial_phone: contacts.commercial_phone, commercial_email: contacts.commercial_email,
    }
  }
  return profile
}

function validReviewDate(value) {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value)
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1]
}

function validReview(item) {
  return item && isMemberProfileId(item.id) && Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5 &&
    nullableText(item.comment) && validReviewDate(item.created_at) &&
    (item.is_mine === undefined || typeof item.is_mine === 'boolean') &&
    (item.reviewer?.id === null || isMemberProfileId(item.reviewer?.id)) &&
    typeof item.reviewer?.business_name === 'string' && item.reviewer.business_name.trim() !== ''
}

function validRatingDistribution(value) {
  return Array.isArray(value) && value.length === 5 && value.every((item, index) =>
    item && item.rating === index + 1 && Number.isSafeInteger(item.count) && item.count >= 0,
  )
}

function publicReview(item) {
  return {
    id: item.id, rating: item.rating, comment: item.comment, created_at: item.created_at,
    reviewer: { id: item.reviewer.id, business_name: item.reviewer.business_name },
    ...(item.is_mine === undefined ? {} : { is_mine: item.is_mine }),
  }
}

export async function getMemberReviews(id, page = 1, signal, filters = {}) {
  if (!isMemberProfileId(id) || !positiveInteger(page) || page > 10000 ||
    !filters || typeof filters !== 'object' ||
    (filters.sort !== undefined && !['newest', 'oldest', 'highest', 'lowest'].includes(filters.sort)) ||
    (filters.rating !== undefined && filters.rating !== '' &&
      (!Number.isInteger(filters.rating) || filters.rating < 1 || filters.rating > 5))) {
    throw new Error('Os parâmetros das avaliações são inválidos.')
  }
  const response = await api.get(`/members/${encodeURIComponent(id)}/reviews`, {
    params: { page, ...(filters.sort === undefined ? {} : { sort: filters.sort }),
      ...(filters.rating === undefined || filters.rating === '' ? {} : { rating: filters.rating }) },
    signal, skipAuthRedirect: true,
  })
  const data = response.data?.data
  const pagination = data?.pagination
  const items = data?.items
  const ratingDistribution = data?.rating_distribution
  if (response.data?.success !== true || !data ||
    !(data.average_rating === null || (typeof data.average_rating === 'number' && Number.isFinite(data.average_rating) && data.average_rating >= 0 && data.average_rating <= 5)) ||
    !Number.isSafeInteger(data.reviews_count) || data.reviews_count < 0 ||
    !validRatingDistribution(ratingDistribution) ||
    !Array.isArray(items) || !pagination || !positiveInteger(pagination.current_page) ||
    pagination.current_page !== page || !positiveInteger(pagination.per_page) ||
    !Number.isSafeInteger(pagination.total) || pagination.total < 0 ||
    !positiveInteger(pagination.last_page) || pagination.current_page > pagination.last_page ||
    pagination.last_page !== Math.max(1, Math.ceil(pagination.total / pagination.per_page)) ||
    items.length > pagination.per_page || items.length > pagination.total ||
    new Set(items.map((item) => item?.id)).size !== items.length ||
    !items.every(validReview)) {
    throw new Error('A resposta das avaliações tem um formato inesperado.')
  }
  /*
   * Só os campos públicos confirmados de cada avaliação e autor são
   * conservados, mesmo quando o servidor devolver campos adicionais.
   */
  return {
    average_rating: data.average_rating, reviews_count: data.reviews_count,
    rating_distribution: ratingDistribution.map((item) => ({
      rating: item.rating,
      count: item.count,
    })),
    items: items.map(publicReview),
    pagination: { current_page: pagination.current_page, per_page: pagination.per_page, total: pagination.total, last_page: pagination.last_page },
  }
}


export async function getMemberReviewPage(id, page = 1, signal, filters = {}) {
  if (!positiveInteger(page) || page > 10000) throw new Error('A página das avaliações é inválida.')
  /* A janela completa pertence à mesma sessão, incluindo os pedidos seguintes. */
  const context = getSessionContext()
  signal = signal ? AbortSignal.any([signal, context.signal]) : context.signal
  const first = await getMemberReviews(id, 1, signal, filters)
  const mine = first.items.find((item) => item.is_mine === true) ?? null
  const total = Math.max(0, first.pagination.total - (mine ? 1 : 0))
  const lastPage = Math.max(1, Math.ceil(total / 5))
  const currentPage = Math.min(page, lastPage)
  const start = (currentPage - 1) * 5 + (mine ? 1 : 0)
  const end = Math.min(start + 5, first.pagination.total)
  const perPage = first.pagination.per_page
  const firstSourcePage = Math.floor(start / perPage) + 1
  const lastSourcePage = Math.ceil(end / perPage)
  const rows = []
  /*
   * A API inclui a avaliação própria na primeira página, mesmo fora do filtro.
   * A janela compensa essa posição para manter cinco outras avaliações por página.
   */
  for (let sourcePage = firstSourcePage; sourcePage <= lastSourcePage; sourcePage += 1) {
    const data = sourcePage === 1 ? first : await getMemberReviews(id, sourcePage, signal, filters)
    const offset = (sourcePage - 1) * perPage
    rows.push(...data.items.filter((item, index) => offset + index >= start && offset + index < end && item.id !== mine?.id && item.is_mine !== true))
  }
  return {
    average_rating: first.average_rating, reviews_count: first.reviews_count,
    rating_distribution: first.rating_distribution,
    mine, items: rows,
    pagination: { current_page: currentPage, per_page: 5, total, last_page: lastPage },
  }
}

/**
 * Cria ou atualiza a avaliação do membro autenticado a outro membro.
 * @param {string} id Identificador do perfil avaliado.
 * @param {{ rating: number, comment: string }} values Classificação e comentário.
 * @param {AbortSignal} [signal] Sinal para cancelar o pedido.
 * @returns {Promise<object>} Campos públicos da avaliação e, quando a API o envia, o estado de moderação.
 */
export async function saveMemberReview(id, values, signal) {
  if (!isMemberProfileId(id) || !Number.isInteger(values?.rating) || values.rating < 1 || values.rating > 5 ||
    typeof values?.comment !== 'string' || !values.comment.trim() || [...values.comment.trim()].length > 2000) {
    throw new Error('Escolha entre 1 e 5 estrelas e escreva um comentário com até 2000 caracteres.')
  }
  const response = await api.post(`/members/${encodeURIComponent(id)}/reviews`, {
    rating: values.rating, comment: values.comment.trim(),
  }, { signal, skipAuthRedirect: true })
  const saved = response.data?.data
  if (![200, 201].includes(response.status) || response.data?.success !== true || !validReview(saved) ||
    (saved.status !== undefined && !['Visible', 'Hidden', 'Flagged'].includes(saved.status))) {
    throw new Error('A resposta da avaliação tem um formato inesperado.')
  }
  return { ...publicReview(saved), ...(saved.status === undefined ? {} : { status: saved.status }) }
}

export async function deleteMemberReview(id, signal) {
  if (!isMemberProfileId(id)) throw new Error('O identificador do membro é inválido.')
  const response = await api.delete(`/members/${encodeURIComponent(id)}/reviews`, { signal, skipAuthRedirect: true })
  if (response.status !== 200 || response.data?.success !== true || response.data?.data !== null) {
    throw new Error('A resposta da remoção da avaliação tem um formato inesperado.')
  }
}

export const MEMBER_REVIEW_REPORT_REASONS = [
  { value: 'offensive_or_disrespectful_content', label: 'Conteúdo ofensivo ou desrespeitoso' },
  { value: 'false_or_unsubstantiated_claims', label: 'Afirmações falsas ou sem fundamento' },
  { value: 'no_business_relationship', label: 'Não fui cliente / não houve relação comercial' },
  { value: 'spam_or_advertising', label: 'Spam ou publicidade' },
  { value: 'other', label: 'Outro motivo' },
]

export async function reportMemberReview(reviewId, values, signal) {
  const validReason = (reason) => MEMBER_REVIEW_REPORT_REASONS.some((option) => option.value === reason)
  const comment = values?.comment
  if (!isMemberProfileId(reviewId) || !validReason(values?.reason) ||
    (comment !== undefined && comment !== null && (typeof comment !== 'string' || [...comment].length > 2000))) {
    throw new Error('Selecione um motivo válido e escreva um comentário com até 2000 caracteres.')
  }
  const payload = { reason: values.reason }
  if (typeof comment === 'string' && comment.trim()) payload.comment = comment.trim()
  const response = await api.post(`/reviews/${encodeURIComponent(reviewId)}/reports`, payload, { signal, skipAuthRedirect: true })
  const body = response.data
  const report = body?.data
  if (response.status !== 201 || body?.success !== true || typeof body.message !== 'string' || !body.message.trim() ||
    !report || !isMemberProfileId(report.id) || report.review_id !== reviewId || !validReason(report.reason) ||
    !nullableText(report.comment) || (typeof report.comment === 'string' && [...report.comment].length > 2000) ||
    report.source !== 'member' || report.resolved_at !== null || !validReviewDate(report.created_at)) {
    throw new Error('A resposta da sinalização tem um formato inesperado.')
  }
  /*
   * A confirmação conserva apenas os campos contratados da sinalização.
   * A mensagem é texto e deve ser apresentada pelo React sem interpretar HTML.
   */
  return {
    message: body.message,
    report: {
      id: report.id, review_id: report.review_id, reason: report.reason, comment: report.comment,
      source: report.source, resolved_at: report.resolved_at, created_at: report.created_at,
    },
  }
}

const MY_REVIEW_DIRECTIONS = ['all', 'received', 'written']
const MY_REVIEW_STATUSES = ['all', 'visible', 'hidden', 'flagged']

function validMyReview(item) {
  return item &&
    isMemberProfileId(item.id) &&
    MY_REVIEW_DIRECTIONS.includes(item.direction) &&
    Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5 &&
    typeof item.comment === 'string' &&
    ['Visible', 'Hidden', 'Flagged'].includes(item.status) &&
    nullableText(item.hidden_reason) &&
    Array.isArray(item.flagging_reasons) && item.flagging_reasons.every((reason) => typeof reason === 'string') &&
    validReviewDate(item.created_at) &&
    validReviewDate(item.updated_at) &&
    (item.reviewer?.id === null || isMemberProfileId(item.reviewer?.id)) &&
    typeof item.reviewer?.business_name === 'string' && item.reviewer.business_name.trim() !== '' &&
    (item.reviewed?.id === null || isMemberProfileId(item.reviewed?.id)) &&
    typeof item.reviewed?.business_name === 'string' && item.reviewed.business_name.trim() !== ''
}

/*
 * Lista autenticada das avaliações recebidas e escritas pelo membro.
 * A API só devolve dados das contas envolvidas e a validação preserva
 * exatamente os campos necessários para a área privada.
 */
export async function getMyReviews({ direction = 'received', status = 'all', page = 1, perPage = 10 } = {}, signal) {
  if (!MY_REVIEW_DIRECTIONS.includes(direction) ||
    !MY_REVIEW_STATUSES.includes(status) ||
    !positiveInteger(page) || page > 10000 ||
    !positiveInteger(perPage) || perPage > 50) {
    throw new Error('Os parâmetros das suas avaliações são inválidos.')
  }

  const response = await api.get('/me/reviews', {
    params: {
      direction,
      status,
      page,
      per_page: perPage,
    },
    signal,
  })
  const data = response.data?.data
  const pagination = data?.pagination
  const items = data?.items
  const counts = data?.counts

  if (response.data?.success !== true || !Array.isArray(items) || !pagination ||
    !positiveInteger(pagination.current_page) || pagination.current_page !== page ||
    !positiveInteger(pagination.per_page) || pagination.per_page !== perPage ||
    !Number.isSafeInteger(pagination.total) || pagination.total < 0 ||
    !positiveInteger(pagination.last_page) || pagination.current_page > pagination.last_page ||
    pagination.last_page !== Math.max(1, Math.ceil(pagination.total / pagination.per_page)) ||
    items.length > pagination.per_page || items.length > pagination.total ||
    new Set(items.map((item) => item?.id)).size !== items.length ||
    !items.every(validMyReview) ||
    !Number.isSafeInteger(counts?.received) || counts.received < 0 ||
    !Number.isSafeInteger(counts?.written) || counts.written < 0) {
    throw new Error('A resposta das suas avaliações tem um formato inesperado.')
  }

  return {
    items: items.map((item) => ({
      id: item.id,
      direction: item.direction,
      rating: item.rating,
      comment: item.comment,
      status: item.status,
      hidden_reason: item.hidden_reason,
      flagging_reasons: item.flagging_reasons,
      reviewer: {
        id: item.reviewer.id,
        business_name: item.reviewer.business_name,
      },
      reviewed: {
        id: item.reviewed.id,
        business_name: item.reviewed.business_name,
      },
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    pagination: {
      current_page: pagination.current_page,
      per_page: pagination.per_page,
      total: pagination.total,
      last_page: pagination.last_page,
    },
    counts: {
      received: counts.received,
      written: counts.written,
    },
  }
}
