import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import UserRiskZone from '../../../../src/components/admin/users/UserRiskZone'

const maria = { id: 'u3', email: 'maria@santos.pt', role: { name: 'Member' }, member_profile: { name: 'Maria Santos' } }
const helena = { id: 'admin-2', email: 'helena@brandao.pt', role: { name: 'Admin' }, member_profile: { name: 'Helena Brandão' } }

describe('UserRiskZone', () => {
  it('mostra a zona de risco com o aviso e anonimiza o membro ao clicar', async () => {
    const user = userEvent.setup()
    const onAnonymize = vi.fn()
    render(<UserRiskZone user={maria} onAnonymize={onAnonymize} />)

    const zone = within(screen.getByRole('region', { name: 'Zona de risco · RGPD' }))
    expect(zone.getByText('Elimina de forma irreversível os dados pessoais do membro, a pedido do titular. Pede várias confirmações.')).toBeInTheDocument()

    const button = zone.getByRole('button', { name: 'Anonimizar membro' })
    expect(button).toBeEnabled()
    await user.click(button)

    expect(onAnonymize).toHaveBeenCalledTimes(1)
    expect(onAnonymize).toHaveBeenCalledWith(maria)
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
