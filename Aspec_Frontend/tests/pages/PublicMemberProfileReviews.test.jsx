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
  items: [{ id, rating: 4, comment: 'Comentário de teste', created_at: '2026-10-01T12:00:00Z', reviewer: { id, name: 'Avaliador de teste' } }],
  pagination: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
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
  it.each(['Member', 'Admin'])('trata 404 das avaliações como vazio para %s Active e preserva a classificação pública', async (role) => {
    useAuthStore.setState({ user: { ...member, role: { name: role } }, status: 'authenticated' })
    api.defaults.adapter = async (config) => {
      if (config.url.endsWith('/reviews')) throw new AxiosError('Erro', AxiosError.ERR_BAD_RESPONSE, config, undefined, { status: 404 })
      return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data: profile } }
    }
    show()
    expect(await screen.findByText('Ainda não existem avaliações.')).toBeInTheDocument()
    expect(screen.queryByText('Para avaliar este membro, é necessário ser membro ASPEC.')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Baseado em 1 avaliação')).toBeInTheDocument()
    expect(screen.getByText('4,0 (1 avaliação)')).toBeInTheDocument()
  })

  it.each([401, 403, 500])('mantém erro nas avaliações com HTTP %s', async (status) => {
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

})
