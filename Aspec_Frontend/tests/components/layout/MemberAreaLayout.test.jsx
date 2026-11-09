import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberAreaLayout from '../../../src/components/layout/MemberAreaLayout'
import { getMemberProfile } from '../../../src/services/memberProfile'
import { useAuthStore } from '../../../src/store/authStore'

vi.mock('../../../src/services/memberProfile', () => ({
  getMemberProfile: vi.fn(),
}))

const memberProfileId = '9d2f1c3a-5b7e-4a1c-9f2d-3e4b5a6c7d8e'
const member = {
  id: 'membro-1',
  email: 'maria@example.pt',
  role: { name: 'Member' },
  account_status: { name: 'Active' },
  member_profile: { id: memberProfileId, name: 'Maria Santos', business_name: 'Santos Lda' },
}
const adminWithProfile = {
  ...member,
  id: 'admin-1',
  role: { name: 'Admin' },
  member_profile: { ...member.member_profile, name: 'Admin' },
}
const technicalAdmin = {
  id: 'tecnico-1',
  email: 'tecnico@example.pt',
  phone: null,
  role: { name: 'Admin' },
  account_status: { name: 'Active' },
  member_profile: null,
}

function show(user) {
  useAuthStore.setState({ user, status: 'authenticated' })
  return render(
    <MemoryRouter initialEntries={['/perfil/conta']}>
      <Routes>
        <Route element={<MemberAreaLayout />}>
          <Route path="/perfil/conta" element={<p>Conteúdo</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const tabs = () => within(screen.getByRole('navigation', { name: 'Secções do perfil' })).getAllByRole('link')

describe('Layout da área de membro', () => {
  beforeEach(() => {
    getMemberProfile.mockResolvedValue({ ...adminWithProfile.member_profile, sector: { name: 'Consultoria' } })
  })
  afterEach(() => {
    useAuthStore.getState().clearSession()
    vi.clearAllMocks()
  })

  it('o admin com perfil carrega o perfil e vê todas as abas e o perfil público', async () => {
    show(adminWithProfile)
    expect(await screen.findByText('Conteúdo')).toBeInTheDocument()
    expect(getMemberProfile).toHaveBeenCalledTimes(1)
    expect(tabs()).toHaveLength(7)
    expect(screen.getByRole('link', { name: 'Ver perfil público' })).toBeInTheDocument()
  })

  it('o admin técnico vê só Informações de conta sem pedir o perfil', async () => {
    show(technicalAdmin)
    expect(await screen.findByText('Conteúdo')).toBeInTheDocument()
    expect(getMemberProfile).not.toHaveBeenCalled()
    expect(tabs().map((link) => link.textContent)).toEqual(['Informações de conta'])
    expect(screen.queryByRole('link', { name: 'Ver perfil público' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('tecnico@example.pt')
    expect(screen.getByText('Conta de administração')).toBeInTheDocument()
    expect(screen.queryByText('A carregar o perfil...')).not.toBeInTheDocument()
    expect(screen.queryByText('Não foi possível carregar o perfil')).not.toBeInTheDocument()
  })

  it('o membro vê o estado de membro ativo e todas as abas', async () => {
    getMemberProfile.mockResolvedValue({ ...member.member_profile })
    show(member)
    expect(await screen.findByText('Conteúdo')).toBeInTheDocument()
    expect(screen.getByText('Membro ativo')).toBeInTheDocument()
    expect(tabs()).toHaveLength(7)
  })
})
