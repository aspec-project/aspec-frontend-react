import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventMapPreview from '../../../../src/components/admin/events/EventMapPreview'
import { EVENT_EDIT_TEXTS, GEOCODE_ATTRIBUTION } from '../../../../src/utils/adminEventForm'

const MAP_TITLE = 'Mapa da localização do evento'
const IDLE_HINT = 'Se não verificar, a morada é localizada automaticamente ao criar o evento.'
const APPROXIMATE_TITLE = 'A localização no mapa é aproximada'
const APPROXIMATE_HINT = 'Confirme se o ponto apresentado corresponde ao local do evento.'
const CONFIRM = 'Confirmar localização'
const CONFIRMED = 'Localização confirmada.'
const UNAVAILABLE = 'Pré-visualização do mapa indisponível.'
const NOT_FOUND = 'Não foi possível encontrar esta morada no mapa. Verifique a morada e tente novamente.'

const IDLE = { status: 'idle', result: null, message: '', query: null, confirmed: false }

const EXACT = {
  status: 'found',
  result: {
    latitude: null,
    longitude: null,
    display_name: 'R. do Brasil 25, 3030-175 Coimbra, Portugal',
    attribution: 'Google Maps',
    approximate: false,
    place_id: 'ChIJTesteCoimbraRuaBrasil25_Aspec',
  },
  message: '',
  query: { address: 'Rua do Brasil nº 25, 3º Esq', locationId: 'l1' },
  confirmed: false,
}

const APPROXIMATE = {
  status: 'found',
  result: {
    latitude: null,
    longitude: null,
    display_name: 'Ponta Delgada, Portugal',
    attribution: 'Google Maps',
    approximate: true,
    place_id: 'ChIJTestePontaDelgadaCidade_Aspec',
  },
  message: '',
  query: { address: 'Rua da Sé 10, Ponta Delgada', locationId: 'l4' },
  confirmed: false,
}

const NOMINATIM = {
  status: 'found',
  result: {
    latitude: 38.71,
    longitude: -9.14,
    display_name: 'Rua das Flores, Lisboa',
    attribution: '© OpenStreetMap contributors',
    approximate: false,
    place_id: null,
  },
  message: '',
  query: { address: 'Rua das Flores 42', locationId: 'l1' },
  confirmed: false,
}

function show(props = {}) {
  const onConfirmLocation = vi.fn()
  const view = render(
    <EventMapPreview geocode={IDLE} zoneName="" onConfirmLocation={onConfirmLocation} idleHint={IDLE_HINT} {...props} />,
  )

  return { ...view, onConfirmLocation }
}

function map() {
  return screen.getByTitle(MAP_TITLE)
}

function mapUrl() {
  return new URL(map().getAttribute('src'))
}

function statusLine() {
  return screen.getByRole('status')
}

describe('EventMapPreview', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_MAPS_EMBED_KEY', 'chave-falsa-418')
  })

  it('antes de pesquisar mostra o mapa de Lisboa com o chip, os atributos seguros e a dica', () => {
    show()

    const iframe = map()
    expect(iframe.tagName).toBe('IFRAME')
    expect(mapUrl().searchParams.get('q')).toBe('Lisboa, Portugal')
    expect(iframe).toHaveAttribute('loading', 'lazy')
    expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox')
    expect(iframe).not.toHaveAttribute('allow')
    expect(iframe).not.toHaveAttribute('allowfullscreen')
    expect(screen.getByText('A mostrar a zona de Lisboa')).toBeInTheDocument()
    expect(screen.queryByText(APPROXIMATE_TITLE)).not.toBeInTheDocument()
    expect(within(statusLine()).getByText(IDLE_HINT)).toBeInTheDocument()
  })

  it('antes de pesquisar segue a delegação escolhida', () => {
    show({ zoneName: 'Porto' })

    expect(screen.getByText('A mostrar a zona de Porto')).toBeInTheDocument()
    expect(mapUrl().searchParams.get('q')).toBe('Porto, Portugal')
  })

  it('um resultado exato da Google mostra o local pelo place_id, sem chip nem caixa', () => {
    show({ geocode: EXACT, zoneName: 'Coimbra' })

    expect(mapUrl().searchParams.get('q')).toBe('place_id:ChIJTesteCoimbraRuaBrasil25_Aspec')
    expect(screen.queryByText(/^A mostrar a zona de/)).not.toBeInTheDocument()
    expect(screen.queryByText(APPROXIMATE_TITLE)).not.toBeInTheDocument()
    expect(statusLine()).toHaveTextContent('Morada encontrada: R. do Brasil 25, 3030-175 Coimbra, Portugal')
    expect(statusLine()).toHaveTextContent('Google Maps')
  })

  it('um resultado aproximado pede confirmação e o botão mantém o foco depois de confirmar', async () => {
    const user = userEvent.setup()
    const { onConfirmLocation, rerender } = show({ geocode: APPROXIMATE, zoneName: 'Açores' })

    expect(screen.getByText(APPROXIMATE_TITLE)).toBeInTheDocument()
    expect(screen.getByText(APPROXIMATE_HINT)).toBeInTheDocument()
    expect(statusLine()).toHaveTextContent('Local aproximado: Ponta Delgada, Portugal')

    const button = screen.getByRole('button', { name: CONFIRM })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await user.click(button)

    expect(onConfirmLocation).toHaveBeenCalledTimes(1)

    rerender(
      <EventMapPreview geocode={{ ...APPROXIMATE, confirmed: true }} zoneName="Açores" onConfirmLocation={onConfirmLocation} idleHint={IDLE_HINT} />,
    )

    const confirmed = screen.getByRole('button', { name: CONFIRM })
    expect(confirmed).toHaveAttribute('aria-pressed', 'true')
    expect(confirmed).toBeEnabled()
    expect(confirmed).toHaveFocus()
    expect(screen.getByText(CONFIRMED).closest('[aria-live="polite"]')).not.toBeNull()

    rerender(
      <EventMapPreview geocode={APPROXIMATE} zoneName="Açores" onConfirmLocation={onConfirmLocation} idleHint={IDLE_HINT} disabled />,
    )

    expect(screen.getByRole('button', { name: CONFIRM })).toBeDisabled()
  })

  it('sem chave mostra a caixa de mapa indisponível e o resto continua a funcionar', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_EMBED_KEY', '')
    const { container } = show({ geocode: APPROXIMATE, zoneName: 'Açores' })

    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByText(UNAVAILABLE)).toBeInTheDocument()
    expect(screen.getByText(APPROXIMATE_TITLE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: CONFIRM })).toBeEnabled()
    expect(statusLine()).toHaveTextContent('Local aproximado: Ponta Delgada, Portugal')
  })

  it('mostra o local só como texto e não deixa um place_id inválido entrar no URL do mapa', () => {
    const displayName = '<img src=x onerror=alert(1)>'
    const { container, unmount } = show({ geocode: { ...EXACT, result: { ...EXACT.result, display_name: displayName } } })

    expect(statusLine()).toHaveTextContent(`Morada encontrada: ${displayName}`)
    expect(container.querySelector('img')).toBeNull()
    unmount()

    show({ geocode: { ...EXACT, result: { ...EXACT.result, place_id: 'x" onload="alert(1)' } }, zoneName: 'Lisboa' })

    expect(mapUrl().searchParams.get('q')).toBe('Lisboa, Portugal')
    expect(map().getAttribute('src')).not.toMatch(/onload|alert/)
  })

  it('um resultado do Nominatim fica na zona com a atribuição do OpenStreetMap e sem mapas do OpenStreetMap', () => {
    show({ geocode: NOMINATIM, zoneName: 'Lisboa' })

    expect(mapUrl().searchParams.get('q')).toBe('Lisboa, Portugal')
    expect(screen.getByText('A mostrar a zona de Lisboa')).toBeInTheDocument()
    expect(statusLine()).toHaveTextContent('© OpenStreetMap contributors')
    expect(document.querySelector('.leaflet-container')).toBeNull()
    expect(document.querySelectorAll('[src*="openstreetmap"], [href*="openstreetmap"]')).toHaveLength(0)
  })

  it.each([
    ['a pesquisar', { ...IDLE, status: 'loading' }, 'A verificar a morada...'],
    ['com erro', { ...IDLE, status: 'error', message: NOT_FOUND }, NOT_FOUND],
    ['guardado', { status: 'saved', result: { latitude: 38.7223, longitude: -9.1533 }, message: '', query: null, confirmed: false }, EVENT_EDIT_TEXTS.geocodeSaved],
    ['encontrado sem atribuição', { ...NOMINATIM, result: { ...NOMINATIM.result, attribution: undefined } }, GEOCODE_ATTRIBUTION],
  ])('o estado %s mostra o texto de sempre na linha de estado', (_label, geocode, text) => {
    show({ geocode, zoneName: 'Lisboa' })

    expect(within(statusLine()).getByText(text)).toBeInTheDocument()
  })
})
