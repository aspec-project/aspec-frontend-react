import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AddressGeocodeCheck from '../../../../src/components/admin/events/AddressGeocodeCheck'

const DISPLAY_NAME = 'Rua da Guiné, Ponta Delgada'
const ATTRIBUTION = '© OpenStreetMap contributors'
const APPROXIMATE_PREFIX = 'Local aproximado:'
const APPROXIMATE_HINT = 'Confirme se é o local certo. Se não for, corrija a morada (sem andar, lote ou loja) e verifique outra vez.'

function found(result) {
  return { status: 'found', result: { display_name: DISPLAY_NAME, attribution: ATTRIBUTION, ...result }, message: '' }
}

function show(geocode) {
  return render(<AddressGeocodeCheck geocode={geocode} canVerify onVerify={vi.fn()} />)
}

describe('AddressGeocodeCheck', () => {
  it('mostra o aviso de local aproximado com a atribuição dentro do estado', () => {
    show(found({ approximate: true }))

    const status = within(screen.getByRole('status'))
    expect(status.getByText(`${APPROXIMATE_PREFIX} ${DISPLAY_NAME}`)).toBeInTheDocument()
    expect(status.getByText(APPROXIMATE_HINT)).toBeInTheDocument()
    expect(status.getByText(ATTRIBUTION)).toBeInTheDocument()
    expect(screen.queryByText(/Morada encontrada:/)).not.toBeInTheDocument()
  })

  it.each([
    ['approximate false', { approximate: false }],
    ['sem approximate', {}],
    ['approximate em texto', { approximate: 'true' }],
  ])('mostra a morada encontrada sem aviso com %s', (_label, result) => {
    show(found(result))

    const status = within(screen.getByRole('status'))
    expect(status.getByText(`Morada encontrada: ${DISPLAY_NAME}`)).toBeInTheDocument()
    expect(status.getByText(ATTRIBUTION)).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(`^${APPROXIMATE_PREFIX}`))).not.toBeInTheDocument()
    expect(screen.queryByText(APPROXIMATE_HINT)).not.toBeInTheDocument()
  })

  it.each([
    ['idle', { status: 'idle', result: null, message: '' }, 'Se não verificar, a morada é localizada automaticamente ao criar o evento.'],
    ['saved', { status: 'saved', result: null, message: '' }, 'Mantém-se a localização guardada do evento enquanto não mudar a morada nem a delegação.'],
    ['loading', { status: 'loading', result: null, message: '' }, 'A verificar a morada...'],
    ['error', { status: 'error', result: null, message: 'O serviço de localização não está disponível de momento. Tente novamente dentro de instantes.' }, 'O serviço de localização não está disponível de momento. Tente novamente dentro de instantes.'],
  ])('o estado %s mostra o texto de sempre', (_status, geocode, text) => {
    show(geocode)

    expect(within(screen.getByRole('status')).getByText(text)).toBeInTheDocument()
    expect(screen.queryByText(APPROXIMATE_HINT)).not.toBeInTheDocument()
  })

  it('mostra o local aproximado só como texto, sem criar elementos', () => {
    const displayName = '<img src=x onerror=alert(1)> Rua X'
    const { container } = show(found({ display_name: displayName, approximate: true }))

    expect(screen.getByText(`${APPROXIMATE_PREFIX} ${displayName}`)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
