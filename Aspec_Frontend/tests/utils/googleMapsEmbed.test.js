import { describe, expect, it, vi } from 'vitest'
import {
  PLACE_ID_PATTERN,
  buildMapEmbedUrl,
  getEmbedKey,
  getLocationMapView,
  isValidPlaceId,
} from '../../src/utils/googleMapsEmbed'

const EXACT_PLACE_ID = 'ChIJTesteCoimbraRuaBrasil25_Aspec'
const APPROXIMATE_PLACE_ID = 'ChIJTestePontaDelgadaCidade_Aspec'

describe('isValidPlaceId', () => {
  it.each([
    [EXACT_PLACE_ID],
    ['a'],
    ['abc-_1'],
    ['A'.repeat(512)],
  ])('aceita %s', (value) => {
    expect(isValidPlaceId(value)).toBe(true)
  })

  it.each([
    ['vazio', ''],
    ['null', null],
    ['undefined', undefined],
    ['número', 123],
    ['513 caracteres', 'A'.repeat(513)],
    ['com espaço', 'a b'],
    ['com parâmetro', 'x&key=y'],
    ['com HTML', 'id"><img>'],
    ['com barras', 'ChIJ/../x'],
    ['com quebra de linha no fim', 'ChIJ\n'],
  ])('rejeita um valor %s', (_label, value) => {
    expect(isValidPlaceId(value)).toBe(false)
  })

  it('usa a mesma expressão do backend', () => {
    expect(PLACE_ID_PATTERN.source).toBe('^[A-Za-z0-9_-]{1,512}$')
  })
})

describe('buildMapEmbedUrl', () => {
  it('constrói o URL do modo place com a chave, o local, a língua e a região', () => {
    const url = new URL(buildMapEmbedUrl('chave-falsa-418', `place_id:${EXACT_PLACE_ID}`))

    expect(url.origin).toBe('https://www.google.com')
    expect(url.pathname).toBe('/maps/embed/v1/place')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      key: 'chave-falsa-418',
      q: `place_id:${EXACT_PLACE_ID}`,
      language: 'pt-PT',
      region: 'PT',
    })
    expect([...url.searchParams.keys()]).toHaveLength(4)
  })

  it('codifica o texto pesquisado sem deixar & nem # por codificar', () => {
    const query = 'Évora & Filhos #1, Portugal'
    const result = buildMapEmbedUrl('k', query)

    expect(new URL(result).searchParams.get('q')).toBe(query)
    expect(result).not.toContain('#')
    expect(result.split('&')).toHaveLength(4)
  })

  it.each([
    ['chave vazia', '', 'Lisboa, Portugal'],
    ['chave só com espaços', '   ', 'Lisboa, Portugal'],
    ['sem chave', undefined, 'Lisboa, Portugal'],
    ['local vazio', 'chave-falsa-418', ''],
    ['local null', 'chave-falsa-418', null],
  ])('devolve null com %s', (_label, key, query) => {
    expect(buildMapEmbedUrl(key, query)).toBeNull()
  })
})

describe('getLocationMapView', () => {
  const lisbon = { query: 'Lisboa, Portugal', zone: 'Lisboa' }
  const nominatim = { latitude: 38.71, longitude: -9.14, place_id: null, display_name: 'Rua das Flores, Lisboa' }

  it.each([
    ['idle sem delegação', { status: 'idle', result: null }, '', lisbon],
    ['idle no Porto', { status: 'idle', result: null }, 'Porto', { query: 'Porto, Portugal', zone: 'Porto' }],
    ['a pesquisar em Faro', { status: 'loading', result: null }, 'Faro', { query: 'Faro, Portugal', zone: 'Faro' }],
    ['erro em Faro', { status: 'error', result: null, message: 'Erro' }, 'Faro', { query: 'Faro, Portugal', zone: 'Faro' }],
    ['encontrado com place_id', { status: 'found', result: { place_id: APPROXIMATE_PLACE_ID, latitude: null, longitude: null } }, 'Lisboa', { query: `place_id:${APPROXIMATE_PLACE_ID}`, zone: null }],
    ['encontrado pelo Nominatim', { status: 'found', result: nominatim }, 'Lisboa', lisbon],
    ['encontrado com place_id inválido', { status: 'found', result: { place_id: 'x&key=y', latitude: null, longitude: null } }, 'Lisboa', lisbon],
    ['guardado com place_id', { status: 'saved', result: { place_id: EXACT_PLACE_ID } }, 'Lisboa', { query: `place_id:${EXACT_PLACE_ID}`, zone: null }],
    ['guardado só com coordenadas', { status: 'saved', result: { latitude: 38.7223, longitude: -9.1533 } }, 'Lisboa', lisbon],
  ])('%s', (_label, geocode, zoneName, expected) => {
    expect(getLocationMapView(geocode, zoneName)).toEqual(expected)
  })
})

describe('getEmbedKey', () => {
  it('lê a chave na hora, sem espaços nas pontas, e devolve vazio sem chave', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_EMBED_KEY', '  chave-falsa-418  ')
    expect(getEmbedKey()).toBe('chave-falsa-418')

    vi.stubEnv('VITE_GOOGLE_MAPS_EMBED_KEY', '')
    expect(getEmbedKey()).toBe('')
  })
})
