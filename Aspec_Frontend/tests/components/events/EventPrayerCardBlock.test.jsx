import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EventPrayerCardBlock from '../../../src/components/events/EventPrayerCardBlock'
import { api } from '../../../src/services/api'
import { useAuthStore } from '../../../src/store/authStore'
import { advanceSession } from '../../../src/services/sessionContext'

const id = '019512a1-9999-7123-8123-123456789abc'
const event = { id, name: 'Encontro ASPEC', event_date: '2030-10-15', is_registered: true, prayer_cards_enabled: true, prayer_verse: 'Orai uns pelos outros.' }
const profile = { name: 'Membro ASPEC', email: 'membro@example.test', phone: '+351912345678' }
const initial = { prayer_verse: event.prayer_verse, event_date: event.event_date, window: { status: 'open', opens_at: '2030-10-15T10:00:00+01:00', closes_at: '2030-10-15T23:59:59+01:00' }, distribution_status: 'pending', card: null }
const card = { personal_request: 'Pela família.', work_request: null, salvation_request: null, submitted_at: '2030-10-15T10:00:00+01:00', updated_at: '2030-10-15T10:00:00+01:00' }
const user = { id, role: { name: 'Member' }, account_status: { name: 'Active' }, member_profile: { id } }
const reply = (config, data, status = 200) => ({ data: { success: true, data }, status, statusText: '', headers: {}, config })
const show = (value = event) => render(<MemoryRouter><EventPrayerCardBlock event={value} /></MemoryRouter>)

describe('Preenchimento do cartão no evento', () => {
  let adapter, state, requests, putHandler
  beforeEach(() => {
    adapter = api.defaults.adapter
    state = structuredClone(initial)
    requests = []
    putHandler = null
    useAuthStore.setState({ status: 'authenticated', sessionChanging: false, user })
    api.defaults.adapter = async (config) => {
      requests.push(config)
      if (config.url === '/member-profile') return reply(config, profile)
      if (config.method === 'put') {
        if (putHandler) return putHandler(config)
        const payload = JSON.parse(config.data)
        state = { ...state, card: { ...card, ...payload } }
        return reply(config, state, 201)
      }
      return reply(config, state)
    }
  })
  afterEach(() => { api.defaults.adapter = adapter; vi.restoreAllMocks() })
  async function open() {
    await userEvent.click(await screen.findByRole('button', { name: 'Preencher cartão de oração' }))
    return screen.getByRole('dialog')
  }
  it('mostra informação pública sem pedir dados privados a visitantes ou não inscritos', async () => {
    useAuthStore.setState({ status: 'anonymous', user: null })
    const view = show()
    expect(screen.getByText(event.prayer_verse)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Preencher/ })).not.toBeInTheDocument()
    expect(requests).toHaveLength(0)
    view.unmount()
    act(() => useAuthStore.setState({ status: 'authenticated', user }))
    show({ ...event, is_registered: false })
    expect(screen.getByText(/Inscreva-se no evento/)).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })
  it('exige um pedido e consentimento, apresenta perfil e envia apenas uma vez', async () => {
    show()
    const dialog = await open()
    expect(within(dialog).getByText(profile.email)).toBeInTheDocument()
    const send = within(dialog).getByRole('button', { name: 'Enviar cartão' })
    expect(send).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText('Pedido pessoal'), { target: { value: 'Pela família.' } })
    expect(send).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('checkbox'))
    let finish
    putHandler = (config) => new Promise(resolve => { finish = () => resolve(reply(config, { ...initial, card }, 201)) })
    fireEvent.click(send); fireEvent.click(send)
    await waitFor(() => expect(requests.filter(r => r.method === 'put')).toHaveLength(1))
    expect(send).toBeDisabled()
    await act(async () => finish())
    expect(await screen.findByRole('button', { name: 'Ver o meu cartão' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(JSON.parse(requests.find(r => r.method === 'put').data)).toMatchObject({ personal_request: 'Pela família.', consent: true })
    expect(screen.queryByRole('button', { name: /Retirar/ })).not.toBeInTheDocument()
  })
  it('carrega cartão existente, permite consultar e exige nova autorização para editar', async () => {
    state.card = card
    show()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver o meu cartão' }))
    expect(within(screen.getByRole('dialog')).getByText(card.personal_request)).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Fechar', exact: true })[0])
    await userEvent.click(screen.getByRole('button', { name: 'Editar cartão' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Pedido pessoal')).toHaveValue(card.personal_request)
    expect(within(dialog).getByRole('checkbox')).not.toBeChecked()
    expect(within(dialog).getByRole('button', { name: 'Guardar alterações' })).toBeDisabled()
    expect(within(dialog).getByLabelText('Pedido pessoal')).not.toHaveAttribute('maxlength')
  })
  it.each(['not_open', 'closed'])('respeita janela %s devolvida pelo backend', async (status) => {
    state.window.status = status
    show()
    await screen.findByText(status === 'closed' ? /O prazo para preencher o cartão terminou/ : /abrem no início do evento/)
    expect(screen.queryByRole('button', { name: 'Preencher cartão de oração' })).not.toBeInTheDocument()
    expect(requests.filter(r => r.method === 'put')).toHaveLength(0)
  })
  it('mostra erros de validação da API junto do formulário sem perder os pedidos', async () => {
    show(); const dialog = await open()
    fireEvent.change(within(dialog).getByLabelText('Pedido pessoal'), { target: { value: 'Pedido conservado.' } })
    await userEvent.click(within(dialog).getByRole('checkbox'))
    putHandler = config => Promise.reject(new AxiosError('Validação', 'ERR_BAD_RESPONSE', config, null, { ...reply(config, null, 422), data: { message: 'Verifique os pedidos.', errors: { personal_request: ['Pedido inválido.'] } } }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar cartão' }))
    expect(await screen.findByText('Pedido inválido.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Pedido pessoal')).toHaveValue('Pedido conservado.')
  })
  it('oculta cartão e formulário imediatamente ao mudar a sessão', async () => {
    state.card = card; show()
    await userEvent.click(await screen.findByRole('button', { name: 'Editar cartão' }))
    act(() => { advanceSession(); useAuthStore.setState({ status: 'anonymous', user: null }) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain(card.personal_request)
    expect(document.body.textContent).not.toContain(profile.email)
  })
  it('omite o bloco desativado e impede contas inativas de consultar dados privados', () => {
    const view = show({ ...event, prayer_cards_enabled: false })
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    act(() => useAuthStore.setState({ user: { ...user, account_status: { name: 'Inactive' } } }))
    view.rerender(<MemoryRouter><EventPrayerCardBlock event={event} /></MemoryRouter>)
    expect(screen.getByText(/requer uma conta ativa/)).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })
  it('permite a conta Admin inscrita com perfil, sem limitar artificialmente a Member', async () => {
    useAuthStore.setState({ user: { ...user, role: { name: 'Admin' } } })
    show()
    expect(await screen.findByRole('button', { name: 'Preencher cartão de oração' })).toBeInTheDocument()
  })
  it('reconcilia 409 com a janela fechada sem perder o rascunho nem permitir novo envio', async () => {
    show(); const dialog = await open()
    fireEvent.change(within(dialog).getByLabelText('Pedido pessoal'), { target: { value: 'Rascunho.' } })
    await userEvent.click(within(dialog).getByRole('checkbox'))
    putHandler = config => {
      state = { ...state, window: { ...state.window, status: 'closed' } }
      return Promise.reject(new AxiosError('Prazo', 'ERR_BAD_RESPONSE', config, null, { ...reply(config, null, 409), data: { message: 'Prazo encerrado.' } }))
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar cartão' }))
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Enviar cartão' })).toBeDisabled())
    expect(await within(dialog).findByText(/O prazo para preencher o cartão terminou/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Pedido pessoal')).toHaveValue('Rascunho.')
  })
  it('contém o foco no modal e devolve-o ao botão ao cancelar por Escape', async () => {
    show(); const dialog = await open()
    const trigger = screen.getByRole('button', { name: 'Preencher cartão de oração', hidden: true })
    expect(dialog).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(dialog.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  const requestFields = [
    ['Pedido pessoal', 'personal_request'],
    ['Pedido de emprego', 'work_request'],
    ['Pedido de salvação', 'salvation_request'],
  ]
  function expectCount(field, count) {
    const counter = document.getElementById(field.getAttribute('aria-describedby').split(' ')[0])
    expect(counter).toHaveTextContent(`${count}/500`)
  }

  it.each(requestFields)('%s aceita 300 emojis sem truncar o texto ou o envio', async (label, key) => {
    const input = userEvent.setup()
    show(); const dialog = await open()
    const field = within(dialog).getByLabelText(label)
    const value = '🙏'.repeat(300)
    await input.click(field)
    await input.paste(value)
    expect(field).toHaveValue(value)
    expectCount(field, 300)
    await input.click(within(dialog).getByRole('checkbox'))
    await input.click(within(dialog).getByRole('button', { name: 'Enviar cartão' }))
    await waitFor(() => expect(requests.filter(r => r.method === 'put')).toHaveLength(1))
    expect(JSON.parse(requests.find(r => r.method === 'put').data)[key]).toBe(value)
  })

  it.each(requestFields)('%s aceita exatamente 500 caracteres Unicode e recusa o seguinte', async (label) => {
    const input = userEvent.setup()
    show(); const dialog = await open()
    const field = within(dialog).getByLabelText(label)
    const value = '🙏'.repeat(250) + 'á'.repeat(250)
    await input.click(field)
    await input.paste(value)
    expect(field).toHaveValue(value)
    expectCount(field, 500)
    await input.type(field, 'x')
    expect(field).toHaveValue(value)
    expectCount(field, 500)
  })

  it.each(requestFields)('%s corta texto colado acima do limite sem dividir o emoji final', async (label) => {
    const input = userEvent.setup()
    show(); const dialog = await open()
    const field = within(dialog).getByLabelText(label)
    const expected = 'a'.repeat(499) + '🙏'
    await input.click(field)
    await input.paste(expected + 'texto excedente 🙏')
    expect(field).toHaveValue(expected)
    expectCount(field, 500)
  })

  it.each(requestFields)('%s preserva os emojis existentes e aplica o limite na edição', async (label, key) => {
    const input = userEvent.setup()
    const existing = 'a'.repeat(199) + '🙏'.repeat(300)
    state.card = { ...card, [key]: existing }
    show()
    await input.click(await screen.findByRole('button', { name: 'Editar cartão' }))
    const dialog = screen.getByRole('dialog')
    const field = within(dialog).getByLabelText(label)
    expect(field).toHaveValue(existing)
    expectCount(field, 499)
    await input.click(field)
    await input.keyboard('{End}')
    await input.paste('🙏x')
    expect(field).toHaveValue(existing + '🙏')
    expectCount(field, 500)
    await input.click(within(dialog).getByRole('checkbox'))
    await input.click(within(dialog).getByRole('button', { name: 'Guardar alterações' }))
    await waitFor(() => expect(requests.filter(r => r.method === 'put')).toHaveLength(1))
    expect(JSON.parse(requests.find(r => r.method === 'put').data)[key]).toBe(existing + '🙏')
  })
})
