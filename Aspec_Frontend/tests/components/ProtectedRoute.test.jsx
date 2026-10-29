import { act, render, screen, renderHook } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '../../src/components/ProtectedRoute'
import { useAuthStore } from '../../src/store/authStore'
import { useLoginForm } from '../../src/hooks/useLoginForm'

const member = { id: 'A', role: { name: 'Member' }, account_status: { name: 'Active' } }
function show() {
  return render(<MemoryRouter initialEntries={['/perfil/contactos']}><Routes>
    <Route path="/" element={<p>Público</p>} />
    <Route path="/login" element={<p>Login</p>} />
    <Route element={<ProtectedRoute allowedRoles={['Member']} allowedStatuses={['Active']} />}>
      <Route path="/perfil/contactos" element={<p>Conteúdo privado</p>} />
    </Route>
  </Routes></MemoryRouter>)
}
describe('Rotas Member Active', () => {
  beforeEach(() => useAuthStore.getState().clearSession())
  it('redireciona visitante para login', () => { show(); expect(screen.getByText('Login')).toBeInTheDocument() })
  it('permite Member Active', () => {
    useAuthStore.setState({ user: member, status: 'authenticated' })
    show(); expect(screen.getByText('Conteúdo privado')).toBeInTheDocument()
  })
  it('não aceita uma identidade sem sessão confirmada', () => {
    useAuthStore.setState({ user: member, status: 'idle' })
    show(); expect(screen.getByText('Login')).toBeInTheDocument()
  })
  it.each(['Pending', 'Approved', 'Inactive', undefined])('recusa estado %s', (name) => {
    useAuthStore.setState({ user: { ...member, account_status: { name } }, status: 'authenticated' })
    show(); expect(screen.getByText('Público')).toBeInTheDocument()
  })
  it.each(['Admin', undefined])('recusa papel %s na área de membro', (name) => {
    useAuthStore.setState({ user: { ...member, role: { name } }, status: 'authenticated' })
    show(); expect(screen.getByText('Público')).toBeInTheDocument()
  })
  it('oculta conteúdo enquanto logout está pendente', () => {
    useAuthStore.setState({ user: member, status: 'authenticated' })
    show()
    act(() => useAuthStore.setState({ status: 'logging-out' }))
    expect(screen.queryByText('Conteúdo privado')).not.toBeInTheDocument()
  })
})

describe('Destino após login válido', () => {
  it.each([
    ['Member', 'Destino do membro'],
    ['Admin', 'Destino de administração'],
  ])('envia %s Active para o respetivo destino', async (role, destination) => {
    const loginOriginal = useAuthStore.getState().login
    const login = vi.fn(async () => {
      useAuthStore.setState({ user: { ...member, role: { name: role } }, status: 'authenticated' })
      return { success: true }
    })
    useAuthStore.setState({ login, user: null, status: 'idle' })
    const wrapper = ({ children }) => <MemoryRouter initialEntries={['/login']}>
      {children}
      <Routes>
        <Route path="/login" element={<p>Login</p>} />
        <Route path="/perfil" element={<p>Destino do membro</p>} />
        <Route path="/admin" element={<p>Destino de administração</p>} />
      </Routes>
    </MemoryRouter>
    try {
      const { result } = renderHook(() => useLoginForm(), { wrapper })
      act(() => {
        result.current.setEmail('teste@example.test')
        result.current.setPassword('password-de-teste')
      })
      await act(async () => result.current.handleLogin())
      expect(login).toHaveBeenCalledWith('teste@example.test', 'password-de-teste')
      expect(screen.getByText(destination)).toBeInTheDocument()
    } finally {
      useAuthStore.setState({ login: loginOriginal })
      useAuthStore.getState().clearSession()
    }
  })
})
