import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, CanceledError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MembersPage from '../../src/pages/MembersPage'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'

const sectorId = '019512a1-1234-7123-8123-123456789abc'
const locationId = '019512a1-5678-7123-8123-123456789abc'
const member = { id: '019512a1-9999-7123-8123-123456789abc', name: 'Ana', business_name: 'Serviços Ana', sector: { id: sectorId, name: 'Consultoria' }, location: { id: locationId, name: 'Lisboa' }, logo_url: null, average_rating: 4.8, reviews_count: 12, email: 'privado@example.test', phone: '912345678', description: 'Descrição privada', tags: ['Tag privada'] }
function body(config, items = [member], total = 25) {
  return { success: true, data: { items, pagination: { current_page: config.params.page, per_page: config.params.per_page, total, last_page: Math.max(1, Math.ceil(total / config.params.per_page)) } } }
}
const response = (data, config) => ({ data, config, status: 200, statusText: '', headers: {} })
function httpError(config, status, data = {}) { return new AxiosError('Erro', AxiosError.ERR_BAD_RESPONSE, config, undefined, { ...response(data, config), status }) }
function setupAdapter(membersHandler, referenceFailure = false) {
  const adapter = vi.fn((config) => {
    if (config.url === '/members') return membersHandler(config)
    if (referenceFailure) return Promise.reject(httpError(config, 500))
    const data = config.url === '/sectors' ? [member.sector] : [member.location]
    return Promise.resolve(response({ success: true, data }, config))
  })
  api.defaults.adapter = adapter
  return adapter
}
function show() { return render(<MemoryRouter><MembersPage /></MemoryRouter>) }

describe('Diretório de membros', () => {
  let original
  beforeEach(() => { original = api.defaults.adapter; useAuthStore.setState({ user: null, status: 'idle' }) })
  afterEach(() => { cleanup(); api.defaults.adapter = original; vi.restoreAllMocks() })

  it('mostra total servidor, campos públicos, fallback de logo e paginação com um pedido por página', async () => {
    const user = userEvent.setup()
    const adapter = setupAdapter((config) => Promise.resolve(response(body(config), config)))
    show()
    expect(screen.getByText('A carregar membros...')).toBeInTheDocument()
    await screen.findByRole('heading', { name: member.business_name })
    expect(screen.getByText('25 membros encontrados')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
    for (const privateText of [member.email, member.phone, member.description, member.tags[0]]) expect(screen.queryByText(privateText)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: `Ver perfil: ${member.business_name}` })).toHaveAttribute('href', `/membros/${member.id}`)
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Pelo menos 4,5 estrelas' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Pelo menos 4,5 estrelas' })).toHaveTextContent('★ 4,5+')
    expect(screen.queryByText('O filtro de 4,5 estrelas está temporariamente indisponível.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pelo menos 3 estrelas' })).toHaveTextContent('★ 3+')
    expect(screen.getByRole('button', { name: 'Pelo menos 4 estrelas' })).toHaveTextContent('★ 4+')
    await user.click(screen.getByRole('button', { name: 'Seguinte' }))
    await screen.findByText('Página 2 de 3')
    await user.click(screen.getByRole('button', { name: 'Seguinte' }))
    await screen.findByText('Página 3 de 3')
    expect(screen.getByRole('button', { name: 'Seguinte' })).toBeDisabled()
    expect(adapter.mock.calls.filter(([config]) => config.url === '/members').map(([config]) => config.params.page)).toEqual([1, 2, 3])
  })

  it('pesquisa no servidor, preserva filtros e reinicia a paginação', async () => {
    const user = userEvent.setup()
    const adapter = setupAdapter((config) => Promise.resolve(response(body(config), config)))
    show()
    await screen.findByRole('heading', { name: member.business_name })
    await user.click(screen.getByRole('button', { name: 'Seguinte' }))
    await screen.findByText('Página 2 de 3')
    await user.type(screen.getByLabelText('Pesquisar'), 'contabilidade')
    expect(adapter.mock.calls.filter(([config]) => config.url === '/members')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Pesquisar' }))
    await screen.findByText('Página 1 de 3')
    expect(screen.getByRole('heading', { name: member.business_name })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Setor'), sectorId)
    await waitFor(() => expect(adapter.mock.calls.filter(([config]) => config.url === '/members')).toHaveLength(4))
    await screen.findByRole('heading', { name: member.business_name })
    await user.selectOptions(screen.getByLabelText('Distrito'), locationId)
    await screen.findByRole('heading', { name: member.business_name })
    await user.click(screen.getByRole('button', { name: 'Pelo menos 4 estrelas' }))
    await screen.findByRole('heading', { name: member.business_name })
    const requests = adapter.mock.calls.filter(([config]) => config.url === '/members')
    expect(requests.at(-1)[0].params).toEqual({ page: 1, per_page: 12, search: 'contabilidade', sector_id: sectorId, location_id: locationId, min_rating: 4 })
    await user.click(screen.getByRole('button', { name: 'Todas' }))
    await screen.findByRole('heading', { name: member.business_name })
    expect(adapter.mock.calls.filter(([config]) => config.url === '/members').at(-1)[0].params.min_rating).toBeUndefined()
  })

  it('aplica o mínimo decimal no servidor e reinicia a página sem filtrar localmente', async () => {
    const user = userEvent.setup()
    const lowerRatedMember = { ...member, average_rating: 3.2 }
    const adapter = setupAdapter((config) => Promise.resolve(response(body(config, [lowerRatedMember]), config)))
    show()
    await screen.findByRole('heading', { name: member.business_name })
    await user.click(screen.getByRole('button', { name: 'Seguinte' }))
    await screen.findByText('Página 2 de 3')
    await user.click(screen.getByRole('button', { name: 'Pelo menos 4,5 estrelas' }))
    await screen.findByText('Página 1 de 3')
    const requests = adapter.mock.calls.filter(([config]) => config.url === '/members')
    expect(requests).toHaveLength(3)
    expect(requests.at(-1)[0].params).toEqual({ page: 1, per_page: 12, min_rating: 4.5 })
    expect(screen.getByRole('button', { name: 'Pelo menos 4,5 estrelas' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: member.business_name })).toBeInTheDocument()
    expect(screen.getByText('25 membros encontrados')).toBeInTheDocument()
  })

  it('mantém controlos e foco durante o carregamento de outra página', async () => {
    const user = userEvent.setup()
    let finish
    let pendingConfig
    setupAdapter((config) => {
      if (config.params.page === 1) return Promise.resolve(response(body(config), config))
      pendingConfig = config
      return new Promise((resolve) => { finish = resolve })
    })
    show()
    await screen.findByRole('heading', { name: member.business_name })
    const next = screen.getByRole('button', { name: 'Seguinte' })
    next.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    expect(screen.getByRole('button', { name: 'Seguinte' })).toBe(next)
    expect(next).toBeDisabled()
    expect(next).toHaveFocus()
    await act(async () => finish(response(body(pendingConfig), pendingConfig)))
    await screen.findByText('Página 2 de 3')
    expect(next).toHaveFocus()
    expect(next).toBeEnabled()
  })

  it.each([401, 403, 404, 500])('mostra erro HTTP %s com repetição sem redirecionar visitantes', async (status) => {
    const user = userEvent.setup()
    let fail = true
    const adapter = setupAdapter((config) => fail ? Promise.reject(httpError(config, status, { success: false, message: 'Recurso não encontrado' })) : Promise.resolve(response(body(config, [], 0), config)))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o diretório. Tente novamente.')
    expect(screen.queryByText('Recurso não encontrado')).not.toBeInTheDocument()
    expect(screen.queryByText(`Erro do servidor (${status}).`)).not.toBeInTheDocument()
    expect(screen.queryByText('Não foram encontrados membros para esta pesquisa.')).not.toBeInTheDocument()
    expect(adapter.mock.calls.find(([config]) => config.url === '/members')[0].skipAuthRedirect).toBe(true)
    fail = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await screen.findByText('Não foram encontrados membros para esta pesquisa.')
    expect(screen.getByText('0 membros encontrados')).toBeInTheDocument()
  })

  it('preserva listagem e pesquisa quando referências falham e permite repeti-las', async () => {
    const user = userEvent.setup()
    setupAdapter((config) => Promise.resolve(response(body(config), config)), true)
    show()
    await screen.findByRole('heading', { name: member.business_name })
    expect(screen.getByLabelText('Setor')).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Os filtros de setor e distrito estão temporariamente indisponíveis.')
    await user.type(screen.getByLabelText('Pesquisar'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Pesquisar' }))
    await screen.findByRole('heading', { name: member.business_name })
    const adapter = setupAdapter((config) => Promise.resolve(response(body(config), config)))
    await user.click(screen.getByRole('button', { name: 'Tentar carregar filtros novamente' }))
    await waitFor(() => expect(screen.getByLabelText('Setor')).toBeEnabled())
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('trata contrato inválido como erro', async () => {
    setupAdapter((config) => Promise.resolve(response({ success: true, data: { items: [] } }, config)))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o diretório. Tente novamente.')
    expect(screen.queryByText('Não foram encontrados membros para esta pesquisa.')).not.toBeInTheDocument()
  })

  it('associa erros da API aos filtros e preserva a pesquisa introduzida', async () => {
    const user = userEvent.setup()
    let fail = false
    setupAdapter((config) => fail ? Promise.reject(httpError(config, 422, { message: 'Corrija a pesquisa.', errors: { search: ['Pesquisa inválida.'] } })) : Promise.resolve(response(body(config), config)))
    show()
    await screen.findByRole('heading', { name: member.business_name })
    await user.type(screen.getByLabelText('Pesquisar'), 'Introduzido')
    fail = true
    await user.click(screen.getByRole('button', { name: 'Pesquisar' }))
    await screen.findByText('Pesquisa inválida.')
    expect(screen.getByLabelText('Pesquisar')).toHaveValue('Introduzido')
    expect(screen.getByLabelText('Pesquisar')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Pesquisar')).toHaveAccessibleDescription('Pesquisa inválida.')
  })

  it('cancela pedido ao desmontar', async () => {
    const adapter = setupAdapter((config) => new Promise((_, reject) => config.signal.addEventListener('abort', () => reject(new CanceledError('Cancelado', config)))))
    const { unmount } = show()
    await waitFor(() => expect(adapter.mock.calls.some(([config]) => config.url === '/members')).toBe(true))
    const signal = adapter.mock.calls.find(([config]) => config.url === '/members')[0].signal
    await act(async () => unmount())
    expect(signal.aborted).toBe(true)
  })

  it('ignora respostas antigas quando outro filtro é aplicado', async () => {
    const user = userEvent.setup()
    let resolveOld
    let oldConfig
    setupAdapter((config) => {
      if (!resolveOld) {
        oldConfig = config
        return new Promise((resolve) => { resolveOld = resolve })
      }
      return Promise.resolve(response(body(config, [], 0), config))
    })
    show()
    await user.click(screen.getByRole('button', { name: 'Pelo menos 3 estrelas' }))
    await screen.findByText('Não foram encontrados membros para esta pesquisa.')
    await act(async () => resolveOld(response(body(oldConfig), oldConfig)))
    expect(screen.queryByRole('heading', { name: member.business_name })).not.toBeInTheDocument()
    expect(oldConfig.signal.aborted).toBe(true)
  })

  it('mostra convite apenas aos visitantes após confirmar sessão', async () => {
    setupAdapter((config) => Promise.resolve(response(body(config), config)))
    useAuthStore.setState({ user: { id: member.id }, status: 'authenticated' })
    show()
    await screen.findByRole('heading', { name: member.business_name })
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    await act(async () => useAuthStore.setState({ user: null, status: 'loading' }))
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    await act(async () => useAuthStore.setState({ user: null, status: 'idle' }))
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Candidatar-me' })).toHaveAttribute('href', '/registo')
  })
})
