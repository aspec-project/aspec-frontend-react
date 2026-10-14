import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, expect, it } from 'vitest'
import Header from '../../../src/components/layout/Header'
import { api } from '../../../src/services/api'
import { useAuthStore } from '../../../src/store/authStore'

let original
function Location() { return <p data-testid="location">{useLocation().pathname}</p> }
beforeEach(() => {
  original = api.defaults.adapter
  useAuthStore.getState().clearSession()
  useAuthStore.setState({ user: { id: 'A', email: 'a@example.test', role: { name: 'Member' }, account_status: { name: 'Active' } }, status: 'authenticated' })
})
afterEach(() => { api.defaults.adapter = original; useAuthStore.getState().clearSession() })

it('mostra erro e retry sem navegar após falha; só navega depois de confirmar logout', async () => {
  api.defaults.adapter = async (config) => { throw new AxiosError('Falha', undefined, config, undefined, { status: 500 }) }
  render(<MemoryRouter initialEntries={['/perfil/contactos']}><Header /><Location /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /Opções de conta/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Terminar sessão' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível terminar a sessão no servidor')
  expect(screen.getByTestId('location')).toHaveTextContent('/perfil/contactos')
  api.defaults.adapter = async (config) => ({ config, status: 200, statusText: 'OK', headers: {}, data: {} })
  fireEvent.click(screen.getByRole('button', { name: 'Tentar terminar sessão novamente' }))
  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(useAuthStore.getState().user).toBeNull()
})
