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