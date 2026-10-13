import { api } from './api'

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
      validReference(item.sector) && validReference(item.location) &&
      (item.logo_url === null || typeof item.logo_url === 'string') &&
      (item.average_rating === null || (typeof item.average_rating === 'number' && Number.isFinite(item.average_rating) && item.average_rating >= 0 && item.average_rating <= 5)) &&
      Number.isSafeInteger(item.reviews_count) && item.reviews_count >= 0)) {
    throw new Error('A resposta do diretório tem um formato inesperado.')
  }
  return { items, pagination }
}
