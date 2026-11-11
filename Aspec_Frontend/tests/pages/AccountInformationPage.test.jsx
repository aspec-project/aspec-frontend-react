import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountInformationPage from '../../src/pages/AccountInformationPage'
import { getNotificationPreferences } from '../../src/services/account'
import { updateMemberProfile } from '../../src/services/memberProfile'
import { useAuthStore } from '../../src/store/authStore'

vi.mock('../../src/services/account', () => ({
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
  updateAccountPassword: vi.fn(),
}))
vi.mock('../../src/services/memberProfile', () => ({
  getMemberProfile: vi.fn(),
  updateMemberProfile: vi.fn(),
}))

const memberProfileId = '9d2f1c3a-5b7e-4a1c-9f2d-3e4b5a6c7d8e'
const member = {
  id: 'membro-1',
  email: 'maria@example.pt',
  role: { name: 'Member' },
  account_status: { name: 'Active' },
  member_profile: { id: memberProfileId, name: 'Maria Santos', business_name: 'Santos Lda' },
}
const technicalAdmin = {
  id: 'tecnico-1',
  email: 'tecnico@example.pt',
  phone: null,
  role: { name: 'Admin' },
  account_status: { name: 'Active' },
  member_profile: null,
}
const noProfileNote = 'Esta conta de administração não tem perfil de membro: o email e o telefone não podem ser alterados nesta página.'

function show(user, profile) {
  useAuthStore.setState({ user, status: 'authenticated' })
  return render(
    <MemoryRouter initialEntries={['/perfil/conta']}>
      <Routes>
        <Route element={<Outlet context={{ profile, reloadProfile: vi.fn() }} />}>
          <Route path="/perfil/conta" element={<AccountInformationPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Informações de conta', () => {
  beforeEach(() => {
    getNotificationPreferences.mockResolvedValue({ notify_new_events: true, notify_weekly_agenda: false })
  })
  afterEach(() => {
    useAuthStore.getState().clearSession()
    vi.clearAllMocks()
  })

  it('o admin técnico sem perfil vê os dados da conta só para leitura', async () => {
    show(technicalAdmin, null)
    expect(screen.getByRole('heading', { level: 1, name: 'Informações de conta' })).toBeInTheDocument()
    expect(screen.getByText('tecnico@example.pt')).toBeInTheDocument()
    expect(screen.getAllByText('Não indicado')).toHaveLength(2)
    expect(screen.getByText(noProfileNote)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Alterar dados' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alterar palavra-passe' })).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(2)
    await waitFor(() => expect(getNotificationPreferences).toHaveBeenCalled())
    expect(updateMemberProfile).not.toHaveBeenCalled()
  })

  it('o membro com perfil vê os seus dados e pode alterá-los', async () => {
    show(member, { ...member.member_profile, email: 'maria@example.pt', phone: '+351912345678' })
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    expect(screen.getByText('maria@example.pt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alterar dados' })).toBeInTheDocument()
    expect(screen.queryByText(noProfileNote)).not.toBeInTheDocument()
    await waitFor(() => expect(getNotificationPreferences).toHaveBeenCalled())
  })
})
