import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProtectedRoute } from '../../src/components/ProtectedRoute'
import { useAuthStore } from '../../src/store/authStore'

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
