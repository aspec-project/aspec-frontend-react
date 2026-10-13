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

async function getEventReferenceList(endpoint, signal) {
  const response = await api.get(endpoint, { signal })
  const resposta = response.data

  if (
    resposta?.success !== true ||
    !Array.isArray(resposta.data) ||
    resposta.data.some(
      (item) =>
        typeof item?.id !== 'string' ||
        !item.id.trim() ||
        typeof item.name !== 'string' ||
        !item.name.trim(),
    ) ||
    new Set(resposta.data.map((item) => item.id)).size !== resposta.data.length
  ) {
    throw new Error('A lista de filtros dos eventos tem um formato inesperado.')
  }

  return resposta.data
}

export function getEventCategories(signal) {
  return getEventReferenceList('/event-categories', signal)
}

export function getLocations(signal) {
  return getEventReferenceList('/locations', signal)
}
