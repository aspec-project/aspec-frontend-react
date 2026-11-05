import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberReviews from '../../../src/components/members/MemberReviews'
import { api } from '../../../src/services/api'
import { useAuthStore } from '../../../src/store/authStore'

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

const target = '019512a1-9999-7123-8123-123456789abc'
const reviewId = '019512a1-9997-7123-8123-123456789abc'
const initialMine = { id: reviewId, rating: 4, comment: 'A minha experiência', created_at: '2026-10-01T12:00:00Z', is_mine: true, reviewer: { id: memberProfileId, business_name: 'Santos Lda' } }
const other = { ...initialMine, id: target, is_mine: false, rating: 5, comment: 'Outra experiência', reviewer: { id: target, business_name: 'Outra empresa' } }
const response = (config, data, status = 200) => ({ config, status, statusText: '', headers: {}, data: { success: true, data } })

describe('Avaliações escritas por admins com perfil de membro', () => {
  let original, mine, profileId, adapter
  const requests = (method, url) => adapter.mock.calls.filter(([config]) => config.method === method && (!url || config.url === url))

  beforeEach(() => {
    original = api.defaults.adapter
    mine = null
    profileId = memberProfileId
    adapter = vi.fn(async (config) => {
      if (config.url === '/member-profile') return response(config, { id: profileId })
      if (config.method === 'delete') { mine = null; return response(config, null) }
      if (config.method === 'post') {
        const existed = !!mine
        mine = { ...initialMine, ...JSON.parse(config.data) }
        return response(config, mine, existed ? 200 : 201)
      }
      const items = mine ? [mine, other] : [other]
      return response(config, {
        items,
        average_rating: 5,
        reviews_count: items.length,
        rating_distribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: items.filter((item) => item.rating === rating).length })),
        pagination: { current_page: 1, per_page: 5, total: items.length, last_page: 1 },
      })
    })
    api.defaults.adapter = adapter
  })
  afterEach(() => {
    cleanup()
    api.defaults.adapter = original
    useAuthStore.getState().clearSession()
    vi.restoreAllMocks()
  })

  function show(user) {
    useAuthStore.setState({ user, status: 'authenticated' })
    return render(<MemberReviews memberId={target} allowReview />)
  }

  it('o admin com perfil avalia outro membro', async () => {
    show(adminWithProfile)
    const interaction = userEvent.setup()
    await interaction.click(await screen.findByRole('button', { name: 'Avaliar', exact: true }))
    await interaction.click(screen.getByRole('radio', { name: '4 estrelas' }))
    await interaction.type(screen.getByRole('textbox'), 'Bom serviço')
    await interaction.click(screen.getByRole('button', { name: 'Publicar avaliação' }))
    await screen.findByText('A minha avaliação')
    expect(requests('post')).toHaveLength(1)
    expect(requests('post')[0][0].url).toBe(`/members/${target}/reviews`)
    expect(JSON.parse(requests('post')[0][0].data)).toEqual({ rating: 4, comment: 'Bom serviço' })
  })

  it('o admin com perfil edita e apaga a sua avaliação como um membro', async () => {
    mine = { ...initialMine }
    show(adminWithProfile)
    const interaction = userEvent.setup()
    await interaction.click(await screen.findByRole('button', { name: 'Editar a minha avaliação' }))
    await interaction.clear(screen.getByRole('textbox'))
    await interaction.type(screen.getByRole('textbox'), 'Experiência atualizada')
    await interaction.click(screen.getByRole('button', { name: 'Guardar alterações' }))
    await screen.findByText('Experiência atualizada')
    expect(requests('post', `/members/${target}/reviews`)).toHaveLength(1)

    await interaction.click(await screen.findByRole('button', { name: 'Editar a minha avaliação' }))
    await interaction.click(screen.getByRole('button', { name: 'Remover avaliação', exact: true }))
    await interaction.click(screen.getByRole('button', { name: 'Confirmar remoção' }))
    await screen.findByRole('button', { name: 'Avaliar', exact: true })
    expect(requests('delete', `/members/${target}/reviews`)).toHaveLength(1)
  })

  it('o admin com perfil não se avalia a si próprio', async () => {
    profileId = target
    show(adminWithProfile)
    await screen.findByText('Outra experiência')
    await waitFor(() => expect(requests('get', '/member-profile').length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: 'Avaliar', exact: true })).not.toBeInTheDocument()
  })

  it('o admin técnico não pode avaliar nem pede o perfil próprio', async () => {
    show(technicalAdmin)
    await screen.findByText('Outra experiência')
    expect(screen.queryByRole('button', { name: 'Avaliar', exact: true })).not.toBeInTheDocument()
    expect(requests('get', '/member-profile')).toHaveLength(0)
  })

  it('só o membro vê o botão de sinalizar avaliações de outros', async () => {
    const view = show(adminWithProfile)
    await screen.findByText('Outra experiência')
    expect(screen.queryByRole('button', { name: 'Sinalizar avaliação de Outra empresa' })).not.toBeInTheDocument()
    view.unmount()

    show(member)
    await screen.findByText('Outra experiência')
    expect(screen.getByRole('button', { name: 'Sinalizar avaliação de Outra empresa' })).toBeInTheDocument()
  })
})
