import { api, API_URL } from './api'

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

export async function getMemberReviews(id, page = 1, signal) {
  if (!isMemberProfileId(id) || !positiveInteger(page)) {
    throw new Error('Os parâmetros das avaliações são inválidos.')
  }
  const response = await api.get(`/members/${encodeURIComponent(id)}/reviews`, {
    params: { page }, signal, skipAuthRedirect: true,
  })
  const data = response.data?.data
  const pagination = data?.pagination
  const items = data?.items
  if (response.data?.success !== true || !data ||
    !(data.average_rating === null || (typeof data.average_rating === 'number' && Number.isFinite(data.average_rating) && data.average_rating >= 0 && data.average_rating <= 5)) ||
    !Number.isSafeInteger(data.reviews_count) || data.reviews_count < 0 ||
    !Array.isArray(items) || !pagination || !positiveInteger(pagination.current_page) ||
    pagination.current_page !== page || !positiveInteger(pagination.per_page) ||
    !Number.isSafeInteger(pagination.total) || pagination.total < 0 ||
    !positiveInteger(pagination.last_page) || pagination.current_page > pagination.last_page ||
    pagination.last_page !== Math.max(1, Math.ceil(pagination.total / pagination.per_page)) ||
    items.length > pagination.per_page || items.length > pagination.total ||
    new Set(items.map((item) => item?.id)).size !== items.length ||
    !items.every((item) => item && isMemberProfileId(item.id) && Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5 &&
      nullableText(item.comment) && validReviewDate(item.created_at) &&
      isMemberProfileId(item.reviewer?.id) && typeof item.reviewer.name === 'string' && item.reviewer.name.trim() !== '' &&
      (item.reviewer.business_name === undefined || nullableText(item.reviewer.business_name)))) {
    throw new Error('A resposta das avaliações tem um formato inesperado.')
  }
  /*
   * Só os campos públicos confirmados de cada avaliação e autor são
   * conservados, mesmo quando o servidor devolver campos adicionais.
   */
  return {
    average_rating: data.average_rating, reviews_count: data.reviews_count,
    items: items.map((item) => ({
      id: item.id, rating: item.rating, comment: item.comment, created_at: item.created_at,
      reviewer: { id: item.reviewer.id, name: item.reviewer.name, business_name: item.reviewer.business_name },
    })),
    pagination: { current_page: pagination.current_page, per_page: pagination.per_page, total: pagination.total, last_page: pagination.last_page },
  }
}
