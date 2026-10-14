import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
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
  id, name: 'Ana', business_name: 'Serviços Ana', description: 'Descrição pública', website_url: 'https://example.test',
  sector: { id, name: 'Consultoria' }, location: { id, name: 'Lisboa' }, logo_url: null,
  business_hours: [{ week_day_id: 1, week_day: 'Monday', open_time: '09:00', close_time: '18:00' }],
  portfolio: [{ id, image_url: 'https://example.test/image.jpg' }], average_rating: 4.8, reviews_count: 12,
  address: 'Morada pública',
  social_links: [{ platform_id: id, platform: 'Rede social', url: 'https://social.test' }],
  members_only: { phone: '912345678', commercial_contacts: 'Contacto privado', email: 'privado@example.test' },
  contacts: { email: 'legado@example.test', phone: '999999999', commercial_contacts: 'Contacto legado', address: 'Morada legada' },
  secret: 'Campo desconhecido',
}
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

  it.each([
    ['visitante', null, 'idle'], ['sessão a confirmar', active, 'loading'],
    ['inativo', { ...active, account_status: { name: 'Inactive' } }, 'authenticated'],
    ['pendente', { ...active, account_status: { name: 'Pending' } }, 'authenticated'],
    ['aprovado', { ...active, account_status: { name: 'Approved' } }, 'authenticated'],
    ['administrador inativo', { ...active, role: { name: 'Admin' }, account_status: { name: 'Inactive' } }, 'authenticated'],
    ['estado desconhecido', { ...active, account_status: null }, 'authenticated'],
  ])('não expõe contactos para %s mesmo quando a resposta os contém', async (_, user, status) => {
    useAuthStore.setState({ user, status })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    for (const value of ['privado@example.test', '912345678', 'Contacto privado', 'legado@example.test', '999999999', 'Contacto legado', 'Morada legada', 'Campo desconhecido']) expect(screen.queryByText(value)).not.toBeInTheDocument()
    expect(screen.getByText('Morada pública')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rede social' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    expect(screen.queryByText('https://social.test/')).not.toBeInTheDocument()
    expect(screen.queryByText('https://example.test/')).not.toBeInTheDocument()
    expect(document.querySelector('a[href="https://social.test/"]')).toBeNull()
    expect(document.querySelector('a[href="https://example.test/"]')).toBeNull()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Candidatar-me' })).toHaveAttribute('href', '/registo')
    const lockedContacts = screen.getByRole('region', { name: 'Contactos reservados' })
    expect(lockedContacts.querySelector('h2')).toBeNull()
    expect(lockedContacts.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(lockedContacts.querySelectorAll('a')).toHaveLength(2)
    expect(lockedContacts).toHaveTextContent('Os contactos estão disponíveis para membros ASPEC ativos.')
    expect(screen.getByText('Descrição pública')).toBeInTheDocument()
    expect(screen.getByText('Segunda-feira')).toBeInTheDocument()
    expect(screen.getByText('Domingo')).toBeInTheDocument()
    expect(screen.getAllByText('Encerrado')).toHaveLength(6)
    expect(screen.getByRole('link', { name: 'Ver no Google Maps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Avaliações' }).closest('section')).toHaveAttribute('data-review-allowed', 'no')
  })

  it.each(['Member', 'Admin'])('mostra contactos ao %s Active sem usar contactos legados nem criar controlos de edição ou avaliação', async (role) => {
    useAuthStore.setState({ user: { ...active, role: { name: role } }, status: 'authenticated' })
    show()
    await screen.findByText('912345678')
    expect(screen.getByText('Contacto privado')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Avaliações' }).closest('section')).toHaveAttribute('data-review-allowed', role === 'Member' ? 'yes' : 'no')
    expect(screen.getByText('Morada pública')).toBeInTheDocument()
    for (const value of ['privado@example.test', 'legado@example.test', '999999999', 'Contacto legado', 'Morada legada']) expect(screen.queryByText(value)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rede social' })).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Rede social' })).toHaveAttribute('href', 'https://social.test/')
    expect(screen.getByRole('link', { name: 'Visitar website' })).toHaveAttribute('href', 'https://example.test/')
    expect(screen.getByText('https://social.test/')).toBeInTheDocument()
    expect(screen.getByText('https://example.test/')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rede social' }).querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('09:00 – 18:00')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `Imagem 1 do portefólio de ${profile.business_name}` })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('limpa contactos na troca Member → Visitor → Member e recupera apenas dados da sessão atual', async () => {
    const pending = []
    api.defaults.adapter = (config) => new Promise((resolve) => pending.push({ config, resolve }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await waitFor(() => expect(pending).toHaveLength(1))
    await act(async () => pending[0].resolve(response(pending[0].config)))
    await screen.findByText('912345678')
    await act(async () => useAuthStore.setState({ user: null, status: 'idle' }))
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rede social' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('A carregar perfil')
    await waitFor(() => expect(pending).toHaveLength(2))
    await act(async () => pending[1].resolve(response(pending[1].config)))
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
    expect(screen.getByText('Morada pública')).toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: 'Rede social' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visitar website' })).toBeInTheDocument()
    expect(screen.getByText('Contacto privado')).toBeInTheDocument()
    expect(screen.getByText('Morada pública')).toBeInTheDocument()
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
    await act(async () => pending[0].resolve(response(pending[0].config)))
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
    expect(adapter).not.toHaveBeenCalled()
    view.unmount()
    show()
    await screen.findByRole('heading', { name: 'Perfil não encontrado' })
    expect(screen.queryByText(/pendente|inativ/i)).not.toBeInTheDocument()
  })

  it.each([401, 403, 500])('trata HTTP %s como erro e permite tentar novamente com teclado', async (status) => {
    let failure = true
    api.defaults.adapter = (config) => failure ? fail(config, status) : Promise.resolve(response(config))
    show()
    await screen.findByRole('alert')
    failure = false
    screen.getByRole('button', { name: 'Tentar novamente' }).focus()
    await userEvent.setup().keyboard('{Enter}')
    await screen.findByRole('heading', { name: profile.business_name })
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
        { week_day_id: 5, week_day: 'Friday', open_time: null, close_time: null },
        { week_day_id: 1, week_day: 'Monday', open_time: '14:00', close_time: '18:00' },
        { week_day_id: 1, week_day: 'Monday', open_time: '09:00', close_time: '12:00' },
      ],
    }))
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.getByText('14:00 – 18:00 / 09:00 – 12:00')).toBeInTheDocument()
    const labels = screen.getAllByRole('term').map((element) => element.textContent)
    expect(labels).toEqual(['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'])
    expect(screen.getAllByText('Encerrado')).toHaveLength(6)
  })

  it('mostra a morada pública uma vez e codifica a pesquisa externa para visitante', async () => {
    const address = 'Rua da Sé, 2 & 3? Lisboa #A'
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, address }))
    show()
    const link = await screen.findByRole('link', { name: 'Ver no Google Maps' })
    expect(screen.getAllByText(address)).toHaveLength(1)
    expect(link).toHaveAttribute('href', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.queryByRole('img', { name: /mapa/i })).not.toBeInTheDocument()
  })

  it.each([undefined, null, '', '   '])('não mostra cartão de mapa quando a morada não está informada: %s', async (address) => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, address }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.queryByRole('heading', { name: 'Localização' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver no Google Maps' })).not.toBeInTheDocument()
  })

  it('descarta URLs perigosos no serviço e no DOM', async () => {
    const data = { ...profile, website_url: 'javascript:alert(1)', logo_url: 'https://user:password@example.test', portfolio: [{ id, image_url: 'data:image/svg+xml,unsafe' }], social_links: [{ platform_id: id, platform: 'Insegura', url: 'javascript:alert(1)' }] }
    api.defaults.adapter = (config) => Promise.resolve(response(config, data))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visitar website' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Insegura' })).not.toBeInTheDocument()
  })

  it('o serviço descarta members_only para visitantes e valida o formato para contactos autorizados', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, members_only: 'malformado' }))
    const result = await getPublicMemberProfile(id)
    expect(result).not.toHaveProperty('contacts')
    expect(result).not.toHaveProperty('members_only')
    expect(result).not.toHaveProperty('secret')
    expect(result.address).toBe('Morada pública')
    expect(result.social_links).toHaveLength(1)
    await expect(getPublicMemberProfile(id, true)).rejects.toThrow('formato inesperado')
  })

  it('não usa contacts como fallback quando members_only não existe', async () => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, members_only: undefined }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    await screen.findByRole('heading', { name: profile.business_name })
    for (const value of ['999999999', 'Contacto legado', 'legado@example.test', 'Morada legada']) expect(screen.queryByText(value)).not.toBeInTheDocument()
    expect(screen.getByText('Morada pública')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rede social' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visitar website' })).toBeInTheDocument()
    expect(screen.getByText('Contactos não disponíveis.')).toBeInTheDocument()
    const result = await getPublicMemberProfile(id, true)
    expect(result).not.toHaveProperty('contacts')
    expect(result).not.toHaveProperty('members_only')
  })

  it('redes conhecidas e outras plataformas usam ícones locais decorativos e nomes acessíveis', async () => {
    const platforms = ['LinkedIn', 'Instagram', 'Facebook', 'YouTube', 'Outra plataforma', 'constructor', '__proto__']
    api.defaults.adapter = (config) => Promise.resolve(response(config, {
      ...profile,
      social_links: platforms.map((platform, index) => ({ platform_id: id, platform, url: `https://social.test/${index}` })),
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
      social_links: [{ platform_id: id, platform: '   ', url: 'https://social.test' }],
    }))
    useAuthStore.setState({ user: active, status: 'authenticated' })
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o perfil')
    expect(screen.queryByRole('link', { name: /^\s*$/ })).not.toBeInTheDocument()
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
  })

  it.each([{ id: otherId }, { average_rating: 6 }, { reviews_count: -1 }, { business_hours: [{ week_day_id: 1, week_day: 'Monday', open_time: '25:00', close_time: '18:00' }] }, { portfolio: [{}] }])('rejeita contrato malformado: %j', async (change) => {
    api.defaults.adapter = (config) => Promise.resolve(response(config, { ...profile, ...change }))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o perfil')
    expect(screen.queryByText('912345678')).not.toBeInTheDocument()
  })
})
