import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import UserRiskZone from '../../../../src/components/admin/users/UserRiskZone'

const maria = { id: 'u3', email: 'maria@santos.pt', role: { name: 'Member' }, member_profile: { name: 'Maria Santos' } }
const NEW_TEXT = 'Apaga de forma definitiva os dados pessoais do membro, a pedido do próprio. As faturas ficam guardadas por obrigação fiscal e o histórico de presenças fica guardado sem dados pessoais. Esta ação não pode ser desfeita.'
const helena = { id: 'admin-2', email: 'helena@brandao.pt', role: { name: 'Admin' }, member_profile: { name: 'Helena Brandão' } }

describe('UserRiskZone', () => {
  it('mostra a zona de risco com o aviso e anonimiza o membro ao clicar', async () => {
    const user = userEvent.setup()
    const onAnonymize = vi.fn()
    render(<UserRiskZone user={maria} onAnonymize={onAnonymize} />)

    const zone = within(screen.getByRole('region', { name: 'Anonimizar conta (RGPD)' }))

    const button = zone.getByRole('button', { name: 'Anonimizar membro' })
    expect(button).toBeEnabled()
    await user.click(button)

    expect(onAnonymize).toHaveBeenCalledTimes(1)
    expect(onAnonymize).toHaveBeenCalledWith(maria)
  })

  it('mostra o cartão Anonimizar conta (RGPD) com o texto novo', () => {
    render(<UserRiskZone user={maria} onAnonymize={vi.fn()} />)

    const zone = within(screen.getByRole('region', { name: 'Anonimizar conta (RGPD)' }))
    expect(zone.getByText(NEW_TEXT)).toBeInTheDocument()
    expect(zone.getByRole('button', { name: 'Anonimizar membro' })).toBeEnabled()
    expect(screen.queryByRole('region', { name: 'Zona de risco · RGPD' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Pede várias confirmações/)).not.toBeInTheDocument()
  })

  it('desativado não deixa anonimizar', async () => {
    const user = userEvent.setup()
    const onAnonymize = vi.fn()
    render(<UserRiskZone user={maria} disabled onAnonymize={onAnonymize} />)

    const button = screen.getByRole('button', { name: 'Anonimizar membro' })
    expect(button).toBeDisabled()
    await user.click(button)

    expect(onAnonymize).not.toHaveBeenCalled()
  })

  it('num administrador o botão fica desativado e explica porquê', async () => {
    const user = userEvent.setup()
    const onAnonymize = vi.fn()
    render(<UserRiskZone user={helena} onAnonymize={onAnonymize} />)

    const button = screen.getByRole('button', { name: 'Anonimizar membro' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Não é possível anonimizar um administrador. Para isso, despromova-o primeiro.')
    await user.click(button)

    expect(onAnonymize).not.toHaveBeenCalled()
  })
})
