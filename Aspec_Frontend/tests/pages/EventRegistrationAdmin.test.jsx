import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EventDetailPage from '../../src/pages/EventDetailPage'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'

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

const id = '019512a1-9999-7123-8123-123456789abc'
const seriesId = '019512a1-7777-7123-8123-123456789abc'
const nextId = '019512a1-9998-7123-8123-123456789abc'
const registrationId = '019512a1-8888-7123-8123-123456789abc'
const initial = { id, name: 'Encontro', category: { name: 'Categoria' }, location: { name: 'Lisboa' }, available_spots: 3, max_attendees: 20, registrations_count: 17, registration_deadline: '2030-10-15T12:00:00Z', registration_open: true, is_registered: false }
const genericMessage = 'A inscrição está disponível apenas para membros ASPEC ativos com sessão confirmada.'
const noProfileMessage = 'Esta conta de administração não tem perfil de membro, por isso não se pode inscrever em eventos.'
const response = (config, data, status = 200) => ({ data: { success: true, data }, status, config, statusText: '', headers: {} })

function show() {
  return render(<MemoryRouter initialEntries={[`/eventos/${id}`]}><Routes><Route path="/eventos/:id" element={<EventDetailPage />} /></Routes></MemoryRouter>)
}

describe('Inscrição em eventos por admins', () => {
  let original, originalAuth, data, calls
  const mutations = () => calls.filter((config) => config.method !== 'get')

  beforeEach(() => {
    original = api.defaults.adapter
    originalAuth = useAuthStore.getState()
    data = { ...initial }
    calls = []
    api.defaults.adapter = (config) => {
      calls.push(config)
      if (config.method === 'get') return Promise.resolve(response(config, { ...data }))
      if (config.method === 'post') {
        data = { ...data, is_registered: true, registrations_count: 18, available_spots: 2 }
        return Promise.resolve(response(config, { id: registrationId, event_instance_id: id }, 201))
      }
      data = { ...data, is_registered: false, registrations_count: 17, available_spots: 3 }
      return Promise.resolve(response(config, null))
    }
  })
  afterEach(() => {
    api.defaults.adapter = original
    act(() => useAuthStore.setState(originalAuth, true))
    vi.restoreAllMocks()
  })

  it('o admin com perfil inscreve-se num evento pontual e cancela a inscrição', async () => {
    useAuthStore.setState({ user: adminWithProfile, status: 'authenticated', sessionChanging: false })
    const interaction = userEvent.setup()
    show()
    await interaction.click(await screen.findByRole('button', { name: 'Inscrever-me', exact: true }))
    await interaction.click(screen.getByRole('button', { name: 'Confirmar inscrição' }))
    await screen.findByText('Inscrição confirmada')
    expect(mutations()).toHaveLength(1)
    expect(mutations()[0]).toMatchObject({ method: 'post', url: `/events/${id}/registrations` })
    expect(mutations()[0].data).toBeUndefined()

    await interaction.click(await screen.findByRole('button', { name: 'Cancelar a minha inscrição' }))
    await interaction.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
    await screen.findByRole('button', { name: 'Inscrever-me', exact: true })
    expect(mutations()).toHaveLength(2)
    expect(mutations()[1]).toMatchObject({ method: 'delete', url: `/events/${id}/registrations` })
  })

  it('o admin com perfil inscreve-se nesta e nas seguintes sessões de uma série', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-10-10T12:00:00Z'))
    const base = {
      id, series_id: seriesId, name: 'Encontros da série', description: 'Encontros entre membros.',
      category: { name: 'Encontro' }, is_online: true,
      event_date: '2030-10-15', event_start_time: '10:00', event_end_time: '12:00',
      registration_deadline: '2030-10-14T23:59:00+01:00', registration_open: true,
      is_registered: false, max_attendees: 20, registrations_count: 10, available_spots: 10,
    }
    const events = [{ ...base }, { ...base, id: nextId, event_date: '2030-10-22', registration_deadline: '2030-10-21T23:59:00+01:00' }]
    api.defaults.adapter = (config) => {
      calls.push(config)
      if (config.url === '/events') {
        return Promise.resolve(response(config, { items: [...events], pagination: { current_page: 1, per_page: 9, total: events.length, last_page: 1 } }))
      }
      const target = events.find((event) => event.id === config.url.split('/')[2])
      if (config.method === 'get') return Promise.resolve(response(config, { ...target }))
      for (const event of events) {
        event.is_registered = true
        event.registrations_count += 1
        event.available_spots -= 1
      }
      return Promise.resolve(response(config, { registrations: events.map((event, index) => ({ id: index ? seriesId : registrationId, event_instance_id: event.id })) }, 201))
    }
    useAuthStore.setState({ user: adminWithProfile, status: 'authenticated', sessionChanging: false })
    const interaction = userEvent.setup()
    show()
    await interaction.click(await screen.findByRole('button', { name: 'Inscrever-me' }))
    await interaction.click(screen.getByRole('radio', { name: 'Nesta e nas seguintes' }))
    await interaction.click(screen.getByRole('button', { name: 'Confirmar inscrição' }))
    await screen.findByText('Inscrição confirmada')
    const post = calls.find((config) => config.method === 'post')
    expect(post.url).toBe(`/events/${id}/registrations`)
    expect(JSON.parse(post.data)).toEqual({ scope: 'this_and_following' })
  })

  it('o admin técnico não vê ações de inscrição e lê que a conta não tem perfil de membro', async () => {
    useAuthStore.setState({ user: technicalAdmin, status: 'authenticated', sessionChanging: false })
    show()
    expect(await screen.findByText(noProfileMessage)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inscrever-me' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar a minha inscrição' })).not.toBeInTheDocument()
    expect(mutations()).toHaveLength(0)
  })

  it.each([
    ['membro pendente', { ...member, account_status: { name: 'Pending' } }],
    ['admin com perfil inativo', { ...adminWithProfile, account_status: { name: 'Inactive' } }],
  ])('o %s lê a frase genérica e não faz pedidos de inscrição', async (_label, user) => {
    useAuthStore.setState({ user, status: 'authenticated', sessionChanging: false })
    show()
    expect(await screen.findByText(genericMessage)).toBeInTheDocument()
    expect(screen.queryByText(noProfileMessage)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inscrever-me' })).not.toBeInTheDocument()
    expect(mutations()).toHaveLength(0)
  })

  it('o link da reunião online aparece ao admin com perfil inscrito e nunca ao admin técnico', async () => {
    const onlineUrl = 'https://reuniao.example.pt/x'
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(initial.registration_deadline) + 60_000)
    data = { ...data, is_online: true, is_registered: true, registration_open: false, online_url: onlineUrl }

    useAuthStore.setState({ user: adminWithProfile, status: 'authenticated', sessionChanging: false })
    const view = show()
    const access = await screen.findByRole('region', { name: 'Acesso à reunião online' })
    await waitFor(() => expect(within(access).getByRole('link', { name: 'Entrar na reunião' })).toHaveAttribute('href', onlineUrl))
    view.unmount()

    useAuthStore.setState({ user: technicalAdmin, status: 'authenticated', sessionChanging: false })
    show()
    await screen.findByRole('region', { name: 'Acesso à reunião online' })
    expect(screen.queryByRole('link', { name: 'Entrar na reunião' })).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain(onlineUrl)
  })
})
