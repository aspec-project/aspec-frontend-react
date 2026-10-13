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

/*
 * Obtém listas de referência utilizadas na Agenda de Eventos.
 */
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

/*
 * Obtém listas de referência utilizadas no Diretório público.
 */
async function getDirectoryReferenceList(endpoint, signal) {
  const response = await api.get(endpoint, {
    signal,
    skipAuthRedirect: true,
  })

  const body = response.data

  if (
    body?.success !== true ||
    !Array.isArray(body.data) ||
    !body.data.every(
      (item) =>
        typeof item?.id === 'string' &&
        item.id.trim() &&
        typeof item.name === 'string' &&
        item.name.trim(),
    ) ||
    new Set(body.data.map((item) => item.id)).size !== body.data.length
  ) {
    throw new Error('A lista de filtros tem um formato inesperado.')
  }

  return body.data
}

/*
 * Categorias utilizadas nos filtros da Agenda de Eventos.
 */
export function getEventCategories(signal) {
  return getEventReferenceList('/event-categories', signal)
}

/*
 * Setores utilizados no Diretório de Membros.
 */
export function getSectors(signal) {
  return getDirectoryReferenceList('/sectors', signal)
}

/*
 * Localizações utilizadas nas páginas públicas.
 */
export function getLocations(signal) {
  return getDirectoryReferenceList('/locations', signal)
}