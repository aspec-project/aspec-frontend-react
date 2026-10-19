import { api, extractList } from './api'
import { getCachedPublicReferenceList } from './publicReferenceCache'

/*
 * Obtém uma lista de referência devolvida no formato padrão da API:
 * { success, message, data }.
 */
async function getReferenceList(endpoint, config) {
  const response = await api.get(endpoint, config)

  return extractList(response.data.data)
}

/*
 * Devolve as plataformas sociais disponíveis no backend.
 * Cada item contém o id e o nome da plataforma.
 */
export function getSocialPlatforms(config) {
  return getReferenceList('/social-platforms', config)
}

/*
 * Devolve os dias da semana disponíveis no backend.
 * Cada item contém o id e o nome apresentado no formulário.
 */
export function getWeekDays(config) {
  return getReferenceList('/week-days', config)
}

/*
 * Categorias utilizadas nos filtros da Agenda de Eventos.
 */
export function getEventCategories(signal) {
  return getCachedPublicReferenceList('/event-categories', signal, 'A lista de filtros dos eventos tem um formato inesperado.')
}

/*
 * Setores utilizados no Diretório de Membros.
 */
export function getSectors(signal) {
  return getCachedPublicReferenceList('/sectors', signal, 'A lista de filtros tem um formato inesperado.')
}

/*
 * Localizações utilizadas nas páginas públicas.
 */
export function getLocations(signal) {
  return getCachedPublicReferenceList('/locations', signal, 'A lista de filtros tem um formato inesperado.')
}