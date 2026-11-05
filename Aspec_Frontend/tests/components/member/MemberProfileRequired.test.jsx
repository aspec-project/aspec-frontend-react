import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes, useOutletContext } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MemberProfileRequired from '../../../src/components/member/MemberProfileRequired'
import { useAuthStore } from '../../../src/store/authStore'

const member = {
  id: 'membro-1',
  email: 'maria@example.pt',
  role: { name: 'Member' },
  account_status: { name: 'Active' },
  member_profile: { id: '9d2f1c3a-5b7e-4a1c-9f2d-3e4b5a6c7d8e', name: 'Maria Santos', business_name: 'Santos Lda' },
}

function ContextReader() {
  const { profile, reloadProfile } = useOutletContext()
  return (
    <>
      <p>Contexto: {profile.business_name}</p>
      <button type="button" onClick={() => reloadProfile()}>Recarregar</button>
    </>
  )
}

describe('Guarda de perfil de membro', () => {
  afterEach(() => useAuthStore.getState().clearSession())

  it('passa às páginas o contexto do layout', async () => {
    const reloadProfile = vi.fn()
    useAuthStore.setState({ user: member, status: 'authenticated' })
    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <Routes>
          <Route element={<Outlet context={{ profile: { business_name: 'Santos Lda' }, reloadProfile }} />}>
            <Route element={<MemberProfileRequired />}>
              <Route path="/perfil" element={<ContextReader />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Contexto: Santos Lda')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(reloadProfile).toHaveBeenCalledTimes(1)
  })
})
