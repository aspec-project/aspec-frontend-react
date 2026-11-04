import { act, cleanup, render, screen } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PublicMemberProfilePage from '../../src/pages/PublicMemberProfilePage'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'

const id = '019512a1-9999-7123-8123-123456789abc'
const reference = { id, name: 'Referência' }
const profile = {
  id, name: 'Membro de teste', business_name: null, description: null,
  members_only: null, logo_url: null, sector: reference, location: reference,
  average_rating: 4, reviews_count: 1, business_hours: [], portfolio: [],
}
const reviews = {
  average_rating: 4, reviews_count: 1,
  rating_distribution: [
    { rating: 1, count: 0 }, { rating: 2, count: 0 }, { rating: 3, count: 0 },
    { rating: 4, count: 1 }, { rating: 5, count: 0 },
  ],
  items: [{ id, rating: 4, comment: 'Comentário de teste', created_at: '2026-10-01T12:00:00Z', reviewer: { id, business_name: 'Empresa avaliadora' } }],
  pagination: { current_page: 1, per_page: 5, total: 1, last_page: 1 },
}
const member = { id, role: { name: 'Member' }, account_status: { name: 'Active' } }
const show = () => render(<MemoryRouter initialEntries={[`/membros/${id}`]}><Routes><Route path="/membros/:id" element={<PublicMemberProfilePage />} /></Routes></MemoryRouter>)

describe('Pedidos de comentários no perfil público', () => {
  let original
  let adapter
  beforeEach(() => {
    original = api.defaults.adapter
    useAuthStore.setState({ user: null, status: 'idle' })
    adapter = vi.fn(async (config) => ({
      config, status: 200, statusText: 'OK', headers: {},
      data: { success: true, data: config.url.endsWith('/reviews') ? reviews : profile },
    }))
    api.defaults.adapter = adapter
  })
  afterEach(() => { cleanup(); api.defaults.adapter = original; vi.restoreAllMocks() })

  it.each([
    ['visitante', null, 'idle'],
    ['sessão ainda por confirmar', member, 'loading'],
    ...['Member', 'Admin'].flatMap((role) => ['Pending', 'Inactive', 'Approved', 'Blocked'].map((name) => [
      `${role} ${name}`, { ...member, role: { name: role }, account_status: { name } }, 'authenticated',
    ])),
    ['papel não autorizado', { ...member, role: { name: 'Visitor' } }, 'authenticated'],
    ['estado ausente', { ...member, account_status: null }, 'authenticated'],
  ])('não monta comentários nem pede avaliações para %s', async (_, user, status) => {
    useAuthStore.setState({ user, status })
    show()
    await screen.findByRole('heading', { name: 'Classificação Global' })
    expect(screen.getByText('Baseado em 1 avaliação')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Avaliações' })).not.toBeInTheDocument()
    expect(adapter.mock.calls.some(([config]) => config.url.endsWith('/reviews'))).toBe(false)
  })

  it.each(['Member', 'Admin'])('carrega comentários para %s e retira-os imediatamente no logout', async (role) => {
    useAuthStore.setState({ user: { ...member, role: { name: role } }, status: 'authenticated' })
    show()
    await screen.findByText('Comentário de teste')
    expect(screen.queryByText('Para avaliar este membro, é necessário ser membro ASPEC.')).not.toBeInTheDocument()
    expect(document.querySelector('form')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Classificação Global' })).toBeInTheDocument()
    const requestsBeforeLogout = adapter.mock.calls.filter(([config]) => config.url.endsWith('/reviews')).length
    expect(requestsBeforeLogout).toBe(1)

    await act(async () => useAuthStore.setState({ user: null, status: 'idle' }))
    expect(screen.queryByText('Comentário de teste')).not.toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Classificação Global' })
    expect(adapter.mock.calls.filter(([config]) => config.url.endsWith('/reviews'))).toHaveLength(requestsBeforeLogout)
  })
  it.each([401, 403, 404, 500])('mantém erro nas avaliações com HTTP %s', async (status) => {
    useAuthStore.setState({ user: member, status: 'authenticated' })
    api.defaults.adapter = async (config) => {
      if (config.url.endsWith('/reviews')) throw new AxiosError('Erro', AxiosError.ERR_BAD_RESPONSE, config, undefined, { status })
      return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data: profile } }
    }
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as avaliações.')
    expect(screen.queryByText('Ainda não existem avaliações.')).not.toBeInTheDocument()
    expect(screen.getByText('Baseado em 1 avaliação')).toBeInTheDocument()
  })

  it.each(['Member', 'Admin'])('remove comentários e cancela pedidos quando %s perde o estado Active', async (role) => {
    const user = { ...member, role: { name: role } }
    useAuthStore.setState({ user, status: 'authenticated' })
    show()
    await screen.findByText('Comentário de teste')
    const reviewConfig = adapter.mock.calls.find(([config]) => config.url.endsWith('/reviews'))[0]
    await act(async () => useAuthStore.setState({ user: { ...user, account_status: { name: 'Inactive' } } }))
    expect(screen.queryByText('Comentário de teste')).not.toBeInTheDocument()
    expect(reviewConfig.signal.aborted).toBe(true)
    await screen.findByRole('heading', { name: 'Classificação Global' })
    expect(screen.getByText('Baseado em 1 avaliação')).toBeInTheDocument()
    expect(adapter.mock.calls.filter(([config]) => config.url.endsWith('/reviews'))).toHaveLength(1)
  })

})
