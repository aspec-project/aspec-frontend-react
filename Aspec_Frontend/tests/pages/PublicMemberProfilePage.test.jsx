import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PublicMemberProfilePage from '../../src/pages/PublicMemberProfilePage'
import { api } from '../../src/services/api'
import { getPublicMemberProfile } from '../../src/services/members'
import { useAuthStore } from '../../src/store/authStore'

vi.mock('../../src/components/members/MemberReviews', () => ({
  default: ({ allowReview }) => <section data-review-allowed={allowReview ? 'yes' : 'no'}><h2>Avaliações</h2></section>,
}))

const id = '019512a1-9999-7123-8123-123456789abc'
const otherId = '019512a1-9998-7123-8123-123456789abc'
const profile = {
  id, name: 'Ana', business_name: 'Serviços Ana', description: 'Descrição pública',
  sector: { id, name: 'Consultoria' }, location: { id, name: 'Lisboa' }, logo_url: null,
  business_hours: [{ week_day_id: 1, week_day: 'Segunda-feira', open_time: '09:00', close_time: '18:00' }],
  portfolio: [{ id, image_url: 'https://example.test/image.jpg' }], average_rating: 4.8, reviews_count: 12,
  members_only: { website_url: 'https://example.test', address: 'Morada privada', social_links: [{ platform_id: id, platform: 'Rede social', url: 'https://social.test' }], commercial_phone: '912345678', commercial_email: 'comercial@example.test', phone: '999111222', commercial_contacts: 'Contacto antigo' },
  contacts: { email: 'legado@example.test', phone: '999999999', commercial_contacts: 'Contacto legado', address: 'Morada legada' },
  secret: 'Campo desconhecido',
}
const portfolioForNavigation = [
  profile.portfolio[0],
  { id: 'invalid-image', image_url: 'javascript:alert(1)' },
  { id: 'second-image', image_url: 'https://example.test/image-2.jpg' },
  { id: 'third-image', image_url: 'https://example.test/image-3.jpg' },
]
const response = (config, data = profile) => ({ data: { success: true, message: 'Perfil', data }, config, status: 200, statusText: '', headers: {} })
const active = { id, role: { name: 'Member' }, account_status: { name: 'Active' } }
const show = (memberId = id) => render(<MemoryRouter initialEntries={[`/membros/${memberId}`]}><Routes><Route path="/membros/:id" element={<PublicMemberProfilePage />} /></Routes></MemoryRouter>)
function fail(config, status) { return Promise.reject(new AxiosError('Erro', AxiosError.ERR_BAD_RESPONSE, config, undefined, { ...response(config), status })) }

describe('Perfil público de membro', () => {
  let original
  beforeEach(() => {
    original = api.defaults.adapter
    useAuthStore.setState({ user: null, status: 'idle' })
    api.defaults.adapter = (config) => Promise.resolve(response(config))
  })
  afterEach(() => { cleanup(); api.defaults.adapter = original; vi.restoreAllMocks() })

  it('aceita o horário da API em português e mostra segunda-feira aberta no perfil', async () => {
    show()
    expect(document.title).toBe('Perfil do membro | ASPEC')
    await screen.findByRole('heading', { name: profile.business_name })
    await waitFor(() => expect(document.title).toBe(`${profile.business_name} | ASPEC`))
    const mondayHours = screen.getByText('Segunda-feira').nextElementSibling
    expect(mondayHours).toHaveTextContent('09:00 – 18:00')
    expect(mondayHours).not.toHaveTextContent('Encerrado')
    expect(screen.getAllByText('Encerrado')).toHaveLength(6)
  })

  it.each([
    ['visitante', null, 'idle', false],
    ['sessão a confirmar', null, 'loading', false],
    ['membro ainda a confirmar', active, 'loading', false],
    ['logout em curso', active, 'logging-out', false],
    ['membro ativo', active, 'authenticated', true],
    ['membro pendente', { ...active, account_status: { name: 'Pending' } }, 'authenticated', true],
    ['administrador inativo', { ...active, role: { name: 'Admin' }, account_status: { name: 'Inactive' } }, 'authenticated', true],
    ['identidade sem ID', { role: { name: 'Member' } }, 'authenticated', false],
  ])('mantém a classificação pública e restringe a lista de comentários: %s', async (_, user, status, visible) => {
    useAuthStore.setState({ user, status })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.getByText('4,8 (12 avaliações)')).toBeInTheDocument()
    expect(screen.getByText('Baseado em 12 avaliações')).toBeInTheDocument()
    if (visible) expect(screen.getByRole('heading', { name: 'Avaliações' })).toBeInTheDocument()
    else expect(screen.queryByRole('heading', { name: 'Avaliações' })).not.toBeInTheDocument()
  })

  it.each([
    ['visitante', null, 'idle'], ['sessão a confirmar', active, 'loading'],
    ['visitante sem sessão confirmada', null, 'loading'], ['visitante após erro de sessão', null, 'error'],
    ['inativo', { ...active, account_status: { name: 'Inactive' } }, 'authenticated'],
    ['pendente', { ...active, account_status: { name: 'Pending' } }, 'authenticated'],
    ['aprovado', { ...active, account_status: { name: 'Approved' } }, 'authenticated'],
    ['administrador inativo', { ...active, role: { name: 'Admin' }, account_status: { name: 'Inactive' } }, 'authenticated'],
    ['estado desconhecido', { ...active, account_status: null }, 'authenticated'],
  ])('não expõe contactos para %s mesmo quando a resposta os contém', async (_, user, status) => {
    useAuthStore.setState({ user, status })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    for (const value of ['privado@example.test', '912345678', 'comercial@example.test', 'legado@example.test', '999999999', 'Contacto legado', 'Morada legada', 'Campo desconhecido', '999111222', 'Contacto antigo', 'comercial@example.test', 'Morada privada']) expect(screen.queryByText(value)).not.toBeInTheDocument()
    expect(screen.queryByText('Morada privada')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rede social' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    expect(screen.queryByText('https://social.test/')).not.toBeInTheDocument()
    expect(screen.queryByText('https://example.test/')).not.toBeInTheDocument()
    expect(document.querySelector('a[href="https://social.test/"]')).toBeNull()
    expect(document.querySelector('a[href="https://example.test/"]')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Contactos' })).not.toBeInTheDocument()
    if (!user && ['idle', 'error'].includes(status)) {
      const lockedContacts = screen.getByRole('region', { name: 'Contactos reservados' })
      expect(lockedContacts).toHaveTextContent('Os contactos estão disponíveis para membros ASPEC ativos.')
      expect(lockedContacts.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
      expect(screen.getByRole('link', { name: 'Candidatar-me' })).toHaveAttribute('href', '/registo')
    } else expect(screen.queryByRole('region', { name: 'Contactos reservados' })).not.toBeInTheDocument()
    expect(screen.getByText('Descrição pública')).toBeInTheDocument()
    expect(screen.getByText('Segunda-feira')).toBeInTheDocument()
    expect(screen.getByText('Domingo')).toBeInTheDocument()
    expect(screen.getAllByText('Encerrado')).toHaveLength(6)
    expect(screen.queryByRole('link', { name: 'Ver no Google Maps' })).not.toBeInTheDocument()
    if (status === 'authenticated') {
      expect(screen.getByRole('heading', { name: 'Avaliações' }).closest('section')).toHaveAttribute('data-review-allowed', 'no')
    } else expect(screen.queryByRole('heading', { name: 'Avaliações' })).not.toBeInTheDocument()
    expect(screen.getByText('Baseado em 12 avaliações')).toBeInTheDocument()
    expect(screen.getByText('4,8 (12 avaliações)')).toBeInTheDocument()
  })

  it.each(['Member', 'Admin'])('mostra contactos ao %s Active sem usar contactos legados nem criar controlos de edição ou avaliação', async (role) => {
    useAuthStore.setState({ user: { ...active, role: { name: role } }, status: 'authenticated' })
    show()
    await screen.findByText('912345678')
    expect(screen.getByText('comercial@example.test')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Avaliações' }).closest('section')).toHaveAttribute('data-review-allowed', role === 'Member' ? 'yes' : 'no')
    expect(screen.getByText('Morada privada')).toBeInTheDocument()
    for (const value of ['privado@example.test', 'legado@example.test', '999999999', 'Contacto legado', 'Morada legada', '999111222', 'Contacto antigo']) expect(screen.queryByText(value)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rede social' })).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Rede social' })).toHaveAttribute('href', 'https://social.test/')
    expect(screen.getByRole('link', { name: 'Visitar website' })).toHaveAttribute('href', 'https://example.test/')
    expect(screen.getByText('https://social.test/')).toBeInTheDocument()
    expect(screen.getByText('https://example.test/')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rede social' }).querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('09:00 – 18:00')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `Imagem 1 do portefólio de ${profile.business_name}` })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Ampliar imagem 1/ })).toBeInTheDocument()
  })

  it('mostra o card bloqueado ao visitante quando o backend devolve members_only null', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, members_only: null }))
    show()
    const lockedContacts = await screen.findByRole('region', { name: 'Contactos reservados' })
    expect(lockedContacts).toHaveTextContent('Os contactos estão disponíveis para membros ASPEC ativos.')
    expect(lockedContacts.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(lockedContacts.querySelectorAll('a')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rede social' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver no Google Maps' })).not.toBeInTheDocument()
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
    expect(screen.queryByText('comercial@example.test')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Avaliações' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Classificação Global' })).toBeInTheDocument()
    expect(screen.getByText('Descrição pública')).toBeInTheDocument()
  })

  it('limpa contactos na troca Member → Visitor → Member e recupera apenas dados da sessão atual', async () => {
    const pending = []
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await waitFor(() => expect(pending).toHaveLength(1))
    await act(async () => pending[0].resolve(response(pending[0].config)))
    await screen.findByText('912345678')
    expect(screen.getByRole('heading', { name: 'Avaliações' })).toBeInTheDocument()
    await act(async () => useAuthStore.setState({ user: null, status: 'idle' }))
    expect(screen.queryByRole('heading', { name: 'Avaliações' })).not.toBeInTheDocument()
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rede social' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('A carregar perfil')
    await waitFor(() => expect(pending).toHaveLength(2))
    await act(async () => pending[1].resolve(response(pending[1].config)))
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
    expect(screen.queryByText('Morada privada')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Contactos reservados' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Avaliações' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rede social' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    expect(document.querySelector('a[href="https://social.test/"]')).toBeNull()
    expect(document.querySelector('a[href="https://example.test/"]')).toBeNull()
    expect(pending[0].config.signal.aborted).toBe(true)
    await act(async () => useAuthStore.setState({ user: active, status: 'authenticated' }))
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
    await waitFor(() => expect(pending).toHaveLength(3))
    await act(async () => pending[2].resolve(response(pending[2].config)))
    await screen.findByText('912345678')
    expect(screen.getByRole('heading', { name: 'Avaliações' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rede social' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visitar website' })).toBeInTheDocument()
    expect(screen.getByText('comercial@example.test')).toBeInTheDocument()
    expect(screen.getByText('Morada privada')).toBeInTheDocument()
    expect(pending[1].config.signal.aborted).toBe(true)
  })

  it('ignora resposta privada antiga que chega depois da resposta de outra sessão', async () => {
    const pending = []
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await waitFor(() => expect(pending).toHaveLength(1))
    await act(async () => useAuthStore.setState({ user: null, status: 'idle' }))
    await waitFor(() => expect(pending).toHaveLength(2))
    await act(async () => pending[1].resolve(response(pending[1].config, { ...profile, business_name: 'Resultado atual' })))
    await screen.findByRole('heading', { name: 'Resultado atual' })
    await act(async () => pending[0].resolve(response(pending[0].config)))
    expect(screen.getByRole('heading', { name: 'Resultado atual' })).toBeInTheDocument()
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
  })

  it('cancela e esconde dados quando muda o utilizador autenticado', async () => {
    api.defaults.adapter = vi.fn((config) => Promise.resolve(response(config)))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await screen.findByText('912345678')
    api.defaults.adapter = (config) => new Promise(() => { expect(config.signal.aborted).toBe(false) })
    await act(async () => useAuthStore.setState({ user: { ...active, id: otherId }, status: 'authenticated' }))
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Avaliações' })).not.toBeInTheDocument()
  })

  it('retira contactos e pede novos dados quando muda apenas a geração da sessão', async () => {
    const pending = []
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await waitFor(() => expect(pending).toHaveLength(1))
    await act(async () => pending[0].resolve(response(pending[0].config)))
    await screen.findByText('912345678')
    await act(async () => useAuthStore.setState((state) => ({ sessionGeneration: state.sessionGeneration + 1 })))
    expect(document.title).toBe('Perfil do membro | ASPEC')
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
    expect(screen.queryByText('Morada privada')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    await waitFor(() => expect(pending).toHaveLength(2))
    expect(pending[0].config.signal.aborted).toBe(true)
    await act(async () => pending[1].resolve(response(pending[1].config, { ...profile, members_only: null })))
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.queryByRole('heading', { name: 'Contactos' })).not.toBeInTheDocument()
    expect(screen.getByText('Baseado em 12 avaliações')).toBeInTheDocument()
  })

  it('cancela pedido e ignora perfil antigo quando muda o ID na rota', async () => {
    const pending = []
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }))
    render(
      <MemoryRouter initialEntries={[`/membros/${id}`]}>
        <Link to={`/membros/${otherId}`}>Outro membro</Link>
        <Routes><Route path="/membros/:id" element={<PublicMemberProfilePage />} /></Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(pending).toHaveLength(1))
    await userEvent.setup().click(screen.getByRole('link', { name: 'Outro membro' }))
    await waitFor(() => expect(pending).toHaveLength(2))
    expect(pending[0].config.signal.aborted).toBe(true)
    await act(async () => pending[1].resolve(response(pending[1].config, { ...profile, id: otherId, business_name: 'Outro negócio' })))
    await screen.findByRole('heading', { name: 'Outro negócio' })
    expect(document.title).toBe('Outro negócio | ASPEC')
    await act(async () => pending[0].resolve(response(pending[0].config)))
    expect(document.title).toBe('Outro negócio | ASPEC')
    expect(screen.queryByRole('heading', { name: profile.business_name })).not.toBeInTheDocument()
  })

  it('trata falha de ligação como erro e cancela ao desmontar', async () => {
    api.defaults.adapter = () => Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK))
    const view = show()
    await screen.findByRole('alert')
    view.unmount()
    let signal
    api.defaults.adapter = (config) => { signal = config.signal; return new Promise(() => {}) }
    const pendingView = show()
    await waitFor(() => expect(signal).toBeDefined())
    pendingView.unmount()
    expect(signal.aborted).toBe(true)
  })

  it('trata ID inválido sem pedido e 404 sem revelar o estado da conta', async () => {
    const adapter = vi.fn((config) => fail(config, 404))
    api.defaults.adapter = adapter
    const view = show('invalido')
    await screen.findByRole('heading', { name: 'Perfil não encontrado' })
    expect(document.title).toBe('Perfil não encontrado | ASPEC')
    expect(adapter).not.toHaveBeenCalled()
    view.unmount()
    show()
    await screen.findByRole('heading', { name: 'Perfil não encontrado' })
    expect(document.title).toBe('Perfil não encontrado | ASPEC')
    expect(screen.queryByText(/pendente|inativ/i)).not.toBeInTheDocument()
  })

  it.each([401, 403, 500])('trata HTTP %s como erro e permite tentar novamente com teclado', async (status) => {
    let failure = true
    api.defaults.adapter = (config) => failure ? fail(config, status) : Promise.resolve(response(config))
    show()
    await screen.findByRole('alert')
    expect(document.title).toBe('Perfil do membro | ASPEC')
    failure = false
    screen.getByRole('button', { name: 'Tentar novamente' }).focus()
    await userEvent.setup().keyboard('{Enter}')
    await screen.findByRole('heading', { name: profile.business_name })
    expect(document.title).toBe(`${profile.business_name} | ASPEC`)
  })

  it('retira o nome carregado ao navegar e usa o nome do membro sem nome comercial', async () => {
    const pending = []
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }))
    render(<MemoryRouter initialEntries={[`/membros/${id}`]}><Link to={`/membros/${otherId}`}>Outro membro</Link><Routes><Route path="/membros/:id" element={<PublicMemberProfilePage />} /></Routes></MemoryRouter>)
    await waitFor(() => expect(pending).toHaveLength(1))
    await act(async () => pending[0].resolve(response(pending[0].config)))
    expect(document.title).toBe(`${profile.business_name} | ASPEC`)
    await userEvent.setup().click(screen.getByRole('link', { name: 'Outro membro' }))
    expect(document.title).toBe('Perfil do membro | ASPEC')
    await waitFor(() => expect(pending).toHaveLength(2))
    await act(async () => pending[1].resolve(response(pending[1].config, { ...profile, id: otherId, name: 'João & Ana', business_name: null })))
    expect(document.title).toBe('João & Ana | ASPEC')
  })

  it('apresenta estados vazios sem inventar horários ou avaliações', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, business_name: null, description: null, portfolio: [], business_hours: [], average_rating: null, reviews_count: 0 }))
    show()
    await screen.findByRole('heading', { name: 'Ana' })
    for (const text of ['Descrição não disponível.', 'Sem imagens no portefólio.']) expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getAllByText('Encerrado')).toHaveLength(7)
  })

  it('mostra os sete dias por ordem e preserva os vários intervalos do mesmo dia', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, {
      ...profile,
      business_hours: [
        { week_day_id: 5, week_day: 'Sexta-feira', open_time: null, close_time: null },
        { week_day_id: 1, week_day: 'Segunda-feira', open_time: '14:00', close_time: '18:00' },
        { week_day_id: 1, week_day: 'Segunda-feira', open_time: '09:00', close_time: '12:00' },
      ],
    }))
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.getByText('14:00 – 18:00 / 09:00 – 12:00')).toBeInTheDocument()
    const labels = screen.getAllByRole('term').map((element) => element.textContent)
    expect(labels).toEqual(['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'])
    expect(screen.getAllByText('Encerrado')).toHaveLength(6)
  })

  it('mostra a morada autorizada uma vez e codifica a pesquisa externa', async () => {
    const address = 'Rua da Sé, 2 & 3? Lisboa #A'
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, members_only: { ...profile.members_only, address } }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    const link = await screen.findByRole('link', { name: 'Ver no Google Maps' })
    expect(screen.getAllByText(address)).toHaveLength(1)
    expect(link).toHaveAttribute('href', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.queryByRole('img', { name: /mapa/i })).not.toBeInTheDocument()
  })

  it.each([null, '', '   '])('não mostra cartão de mapa quando a morada não está informada: %s', async (address) => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, members_only: { ...profile.members_only, address } }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.queryByRole('heading', { name: 'Localização' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver no Google Maps' })).not.toBeInTheDocument()
  })

  it('descarta URLs perigosos no serviço e no DOM', async () => {
    const data = { ...profile, logo_url: 'https://user:password@example.test', portfolio: [{ id, image_url: 'data:image/svg+xml,unsafe' }], members_only: { ...profile.members_only, website_url: 'javascript:alert(1)', social_links: [{ platform_id: id, platform: 'Insegura', url: 'javascript:alert(1)' }] } }
    api.defaults.adapter = (config) => Promise.resolve(response(config, data))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ampliar imagem/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Insegura' })).not.toBeInTheDocument()
  })

  it('amplia a imagem original, fecha pelo X e repõe o foco e o scroll anteriores', async () => {
    const user = userEvent.setup()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'auto'
    try {
      show()
      const thumbnail = await screen.findByRole('button', { name: /Ampliar imagem 1/ })
      expect(thumbnail).toHaveClass('cursor-pointer')
      await user.click(thumbnail)
      const dialog = screen.getByRole('dialog', { name: `Imagem 1 do portefólio de ${profile.business_name}` })
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      const image = within(dialog).getByRole('img')
      expect(image).toHaveAttribute('src', profile.portfolio[0].image_url)
      expect(image).toHaveAttribute('referrerpolicy', 'no-referrer')
      expect(image).toHaveClass('object-contain')
      expect(document.body.style.overflow).toBe('hidden')
      const close = within(dialog).getByRole('button', { name: 'Fechar imagem ampliada' })
      expect(within(dialog).queryByRole('button', { name: 'Imagem anterior' })).not.toBeInTheDocument()
      expect(within(dialog).queryByRole('button', { name: 'Imagem seguinte' })).not.toBeInTheDocument()
      expect(close).toHaveFocus()
      await user.keyboard('{ArrowLeft}{ArrowRight}')
      expect(within(dialog).getByRole('img')).toHaveAttribute('src', profile.portfolio[0].image_url)
      await user.tab()
      expect(close).toHaveFocus()
      await user.tab({ shift: true })
      expect(close).toHaveFocus()
      await user.click(close)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(thumbnail).toHaveFocus()
      expect(document.body.style.overflow).toBe('auto')
    } finally {
      document.body.style.overflow = previousOverflow
    }
  })

  it.each(['{Enter}', ' '])('abre a imagem por teclado (%s) e fecha com Escape', async (key) => {
    const user = userEvent.setup()
    show()
    const thumbnail = await screen.findByRole('button', { name: /Ampliar imagem 1/ })
    thumbnail.focus()
    await user.keyboard(key)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(thumbnail).toHaveFocus()
  })

  it('mantém os fallbacks do logótipo e das miniaturas sem disponibilizar abertura', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, logo_url: 'https://example.test/logo.jpg' }))
    show()
    fireEvent.error(await screen.findByRole('img', { name: `Logótipo de ${profile.business_name}` }))
    expect(screen.getByText('S')).toBeInTheDocument()
    const thumbnail = screen.getByRole('button', { name: /Ampliar imagem 1/ })
    fireEvent.error(within(thumbnail).getByRole('img'))
    expect(screen.getByText('Imagem indisponível')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ampliar imagem/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mostra fallback quando a imagem ampliada falha e mantém o fecho disponível', async () => {
    const user = userEvent.setup()
    show()
    await user.click(await screen.findByRole('button', { name: /Ampliar imagem 1/ }))
    const dialog = screen.getByRole('dialog')
    fireEvent.error(within(dialog).getByRole('img'))
    expect(within(dialog).getByRole('status')).toHaveTextContent('Imagem indisponível.')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: /Ampliar imagem 1/ }))
    expect(within(screen.getByRole('dialog')).getByRole('img')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar imagem ampliada' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navega circularmente por clique e teclado sem fechar e preserva a ordem original', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, portfolio: portfolioForNavigation }))
    const user = userEvent.setup()
    show()
    await user.click(await screen.findByRole('button', { name: /Ampliar imagem 3/ }))
    const dialog = screen.getByRole('dialog')
    const previous = within(dialog).getByRole('button', { name: 'Imagem anterior' })
    const next = within(dialog).getByRole('button', { name: 'Imagem seguinte' })
    const expectImage = (index) => {
      expect(screen.getByRole('dialog')).toBe(dialog)
      expect(within(dialog).getByRole('img')).toHaveAttribute('src', portfolioForNavigation[index].image_url)
      expect(within(dialog).getByRole('img')).toHaveAccessibleName(`Imagem ${index + 1} do portefólio de ${profile.business_name}`)
      expect(document.body.style.overflow).toBe('hidden')
    }
    expectImage(2)
    expect(previous).toBeEnabled()
    expect(next).toBeEnabled()
    await user.click(next)
    expectImage(3)
    expect(next).toBeEnabled()
    await user.click(next)
    expectImage(0)
    await user.click(previous)
    expectImage(3)
    await user.click(previous)
    expectImage(2)
    await user.click(previous)
    expectImage(0)
    expect(previous).toBeEnabled()
    await user.keyboard('{ArrowLeft}')
    expectImage(3)
    await user.keyboard('{ArrowRight}')
    expectImage(0)
    await user.keyboard('{ArrowRight}')
    expectImage(2)
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expectImage(0)
    await user.keyboard('{ArrowLeft}')
    expectImage(3)
  })

  it('retém o foco no modal e mantém o foco nas setas ao circular', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, portfolio: portfolioForNavigation }))
    const user = userEvent.setup()
    show()
    const thumbnail = await screen.findByRole('button', { name: /Ampliar imagem 1/ })
    await user.click(thumbnail)
    const dialog = screen.getByRole('dialog')
    const close = within(dialog).getByRole('button', { name: 'Fechar imagem ampliada' })
    const previous = within(dialog).getByRole('button', { name: 'Imagem anterior' })
    const next = within(dialog).getByRole('button', { name: 'Imagem seguinte' })
    await user.tab()
    expect(previous).toHaveFocus()
    await user.tab()
    expect(next).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(next).toHaveFocus()
    await user.click(next)
    expect(next).toHaveFocus()
    await user.tab({ shift: true })
    expect(previous).toHaveFocus()
    await user.tab()
    expect(next).toHaveFocus()
    await user.click(next)
    expect(next).toBeEnabled()
    expect(next).toHaveFocus()
    await user.click(next)
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', portfolioForNavigation[0].image_url)
    expect(next).toHaveFocus()
    await user.tab({ shift: true })
    expect(previous).toHaveFocus()
    await user.click(previous)
    expect(previous).toHaveFocus()
    expect(previous).toBeEnabled()
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', portfolioForNavigation[3].image_url)
    await user.keyboard('{Escape}')
    expect(thumbnail).toHaveFocus()
  })

  it('mantém ambas as setas ativas e circula nos dois sentidos com duas imagens', async () => {
    const portfolio = [portfolioForNavigation[0], portfolioForNavigation[2]]
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, portfolio }))
    const user = userEvent.setup()
    show()
    await user.click(await screen.findByRole('button', { name: /Ampliar imagem 1/ }))
    const dialog = screen.getByRole('dialog')
    const previous = within(dialog).getByRole('button', { name: 'Imagem anterior' })
    const next = within(dialog).getByRole('button', { name: 'Imagem seguinte' })
    for (const [control, index] of [[previous, 1], [previous, 0], [next, 1], [next, 0]]) {
      expect(previous).toBeEnabled()
      expect(next).toBeEnabled()
      await user.click(control)
      expect(within(dialog).getByRole('img')).toHaveAttribute('src', portfolio[index].image_url)
    }
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', portfolio[0].image_url)
    await user.keyboard('{ArrowLeft}')
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', portfolio[1].image_url)
    await user.keyboard('{ArrowRight}')
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', portfolio[0].image_url)
  })

  it('permite continuar a navegar após falha de imagem e limpa o fallback ao mudar', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, portfolio: portfolioForNavigation }))
    const user = userEvent.setup()
    show()
    await user.click(await screen.findByRole('button', { name: /Ampliar imagem 1/ }))
    const dialog = screen.getByRole('dialog')
    fireEvent.error(within(dialog).getByRole('img'))
    expect(within(dialog).getByRole('status')).toHaveTextContent('Imagem indisponível.')
    await user.click(within(dialog).getByRole('button', { name: 'Imagem seguinte' }))
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', portfolioForNavigation[2].image_url)
    await user.keyboard('{ArrowLeft}')
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', portfolioForNavigation[0].image_url)
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('limpa o diálogo e o bloqueio de scroll ao desmontar o perfil', async () => {
    const user = userEvent.setup()
    const view = show()
    const previousOverflow = document.body.style.overflow
    await user.click(await screen.findByRole('button', { name: /Ampliar imagem 1/ }))
    expect(document.body.style.overflow).toBe('hidden')
    view.unmount()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe(previousOverflow)
    const outsideButton = document.createElement('button')
    document.body.append(outsideButton)
    try {
      outsideButton.focus()
      await user.tab()
      expect(outsideButton).not.toHaveFocus()
    } finally {
      outsideButton.remove()
    }
  })

  it('o serviço conserva apenas os cinco campos autorizados dentro de members_only', async () => {
    const result = await getPublicMemberProfile(id, true)
    expect(result.members_only).toEqual({
      website_url: 'https://example.test/', address: 'Morada privada',
      social_links: [{ platform_id: id, platform: 'Rede social', url: 'https://social.test/' }],
      commercial_phone: '912345678', commercial_email: 'comercial@example.test',
    })
    for (const field of ['website_url', 'address', 'social_links', 'phone', 'commercial_contacts']) expect(result).not.toHaveProperty(field)
    expect(result.members_only).not.toHaveProperty('phone')
    expect(result.members_only).not.toHaveProperty('commercial_contacts')
  })

  it('o serviço descarta members_only para visitantes e valida o formato para contactos autorizados', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, members_only: 'malformado' }))
    const result = await getPublicMemberProfile(id)
    expect(result).not.toHaveProperty('contacts')
    expect(result).not.toHaveProperty('members_only')
    expect(result).not.toHaveProperty('secret')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('website_url')
    expect(result).not.toHaveProperty('social_links')
    await expect(getPublicMemberProfile(id, true)).rejects.toThrow('formato inesperado')
  })

  it.each([undefined, null])('oculta contactos quando members_only é %s, sem fallback legado', async (members_only) => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, website_url: 'https://legacy.test', address: 'Morada legada', social_links: profile.members_only.social_links, members_only }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    for (const value of ['999999999', 'Contacto legado', 'legado@example.test', 'Morada legada']) expect(screen.queryByText(value)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Contactos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Localização' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rede social' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    const result = await getPublicMemberProfile(id, true)
    expect(result).not.toHaveProperty('contacts')
    expect(result).not.toHaveProperty('members_only')
  })

  it('redes conhecidas e outras plataformas usam ícones locais decorativos e nomes acessíveis', async () => {
    const platforms = ['LinkedIn', 'Instagram', 'Facebook', 'YouTube', 'Outra plataforma', 'constructor', '__proto__']
    api.defaults.adapter = (config) => Promise.resolve(response(config, {
      ...profile,
      members_only: { ...profile.members_only, social_links: platforms.map((platform, index) => ({ platform_id: id, platform, url: `https://social.test/${index}` })) },
    }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    for (const [index, platform] of platforms.entries()) {
      const link = screen.getByRole('link', { name: platform })
      expect(link).toHaveAttribute('href', `https://social.test/${index}`)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      expect(link.querySelector('img')).toBeNull()
      expect(screen.getByText(`https://social.test/${index}`)).toBeInTheDocument()
    }
  })

  it('rejeita uma rede social sem nome para evitar links sem nome acessível', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, {
      ...profile,
      members_only: { ...profile.members_only, social_links: [{ platform_id: id, platform: '   ', url: 'https://social.test' }] },
    }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o perfil')
    expect(screen.queryByRole('link', { name: /^\s*$/ })).not.toBeInTheDocument()
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
  })

  it.each([{ id: otherId }, { average_rating: 6 }, { reviews_count: -1 }, { business_hours: [{ week_day_id: 1, week_day: 'Segunda-feira', open_time: '25:00', close_time: '18:00' }] }, { portfolio: [{}] }])('rejeita contrato malformado: %j', async (change) => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, ...change }))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o perfil')
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
  })
})
