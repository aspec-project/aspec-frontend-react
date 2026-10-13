import { api, extractList } from './api'

/*
 * Obtém uma lista de referência devolvida no formato padrão da API:
 * { success, message, data }.
 */
async function getReferenceList(endpoint) {
  const response = await api.get(endpoint)

  return extractList(response.data.data)
}

/*
 * Devolve as plataformas sociais disponíveis no backend.
 * Cada item contém o id e o nome da plataforma.
 */
export function getSocialPlatforms() {
  return getReferenceList('/social-platforms')
}

/*
 * Devolve os dias da semana disponíveis no backend.
 * Cada item contém o id e o nome apresentado no formulário.
 */
export function getWeekDays() {
  return getReferenceList('/week-days')
}

async function getDirectoryReferenceList(endpoint, signal) {
  const response = await api.get(endpoint, { signal, skipAuthRedirect: true })
  const body = response.data
  if (body?.success !== true || !Array.isArray(body.data) ||
    !body.data.every((item) => typeof item?.id === 'string' && item.id.trim() &&
      typeof item.name === 'string' && item.name.trim()) ||
    new Set(body.data.map((item) => item.id)).size !== body.data.length) {
    throw new Error('A lista de filtros tem um formato inesperado.')
  }
  return body.data
}

export function getSectors(signal) {
  return getDirectoryReferenceList('/sectors', signal)
}

export function getLocations(signal) {
  return getDirectoryReferenceList('/locations', signal)
}
