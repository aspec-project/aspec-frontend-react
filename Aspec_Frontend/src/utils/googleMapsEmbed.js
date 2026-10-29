/** Formato de um `place_id` da Google aceite pelo backend (mesma expressão do EventInstanceRequest). */
export const PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{1,512}$/

/** Zona mostrada no mapa quando ainda não há delegação escolhida. */
export const DEFAULT_MAP_ZONE = 'Lisboa'

/** Endereço do modo `place` da Maps Embed API. */
const EMBED_PLACE_URL = 'https://www.google.com/maps/embed/v1/place'

/**
 * Indica se um valor é um `place_id` válido (só texto com letras, números, `_` e `-`, até 512 caracteres).
 * Só um `place_id` válido entra no URL do mapa.
 *
 * @param {unknown} value Valor vindo da API ou do evento guardado.
 * @returns {boolean}
 */
export function isValidPlaceId(value) {
  return typeof value === 'string' && PLACE_ID_PATTERN.test(value)
}

/**
 * Chave da Maps Embed API lida na hora a partir de `VITE_GOOGLE_MAPS_EMBED_KEY`, sem espaços nas pontas.
 *
 * @returns {string} A chave ou '' quando não está configurada.
 */
export function getEmbedKey() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY

  return typeof key === 'string' ? key.trim() : ''
}

/**
 * O que o mapa deve mostrar: o local pelo `place_id` quando a verificação (feita ou guardada) tem um
 * `place_id` válido; senão, a zona da delegação (Lisboa sem delegação).
 *
 * @param {{status: string, result: {place_id?: unknown}|null}} geocode Estado da verificação da morada.
 * @param {string} zoneName Nome da delegação escolhida (pode ser vazio).
 * @returns {{query: string, zone: string|null}} Texto a pesquisar no mapa e a zona mostrada (null com local).
 */
export function getLocationMapView(geocode, zoneName) {
  const placeId = geocode?.result?.place_id
  const hasPlace = (geocode?.status === 'found' || geocode?.status === 'saved') && isValidPlaceId(placeId)

  if (hasPlace) {
    return { query: `place_id:${placeId}`, zone: null }
  }

  const zone = typeof zoneName === 'string' && zoneName.trim() !== '' ? zoneName.trim() : DEFAULT_MAP_ZONE

  return { query: `${zone}, Portugal`, zone }
}

/**
 * URL do mapa da Maps Embed API (modo `place`) com a chave, o texto pesquisado, a língua e a região. Os
 * parâmetros são codificados pelo `URLSearchParams`.
 *
 * @param {string|undefined} key Chave da Maps Embed API.
 * @param {string|null|undefined} query Texto ou `place_id:<id>` a mostrar.
 * @returns {string|null} O URL ou null sem chave ou sem texto.
 */
export function buildMapEmbedUrl(key, query) {
  const cleanKey = typeof key === 'string' ? key.trim() : ''

  if (cleanKey === '' || typeof query !== 'string' || query === '') return null

  const url = new URL(EMBED_PLACE_URL)
  url.searchParams.set('key', cleanKey)
  url.searchParams.set('q', query)
  url.searchParams.set('language', 'pt-PT')
  url.searchParams.set('region', 'PT')

  return url.toString()
}
