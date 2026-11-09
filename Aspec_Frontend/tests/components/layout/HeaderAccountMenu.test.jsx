import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import Header from '../../../src/components/layout/Header'
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

function Location() {
  return <p data-testid="location">{useLocation().pathname}</p>
}

function show(user) {
  useAuthStore.setState({ user, status: 'authenticated' })
  return render(<MemoryRouter initialEntries={['/']}><Header /><Location /></MemoryRouter>)
}

const accountButton = (name) => screen.getByRole('button', { name: `Opções de conta de ${name}` })
const panel = () => document.getElementById('public-account-menu')
const panelItems = () => [...panel().querySelectorAll('a, button')].map((element) => [element.tagName, element.textContent.trim()])

async function openMenu(name) {
  const interaction = userEvent.setup()
  await interaction.click(accountButton(name))
  return interaction
}

describe('Menu de conta do cabeçalho', () => {
  afterEach(() => useAuthStore.getState().clearSession())

  it('o admin com perfil vê os itens do design por ordem, com dois separadores', async () => {
    show(adminWithProfile)
    await openMenu('Admin')
    const menu = within(panel())
    expect(panelItems()).toEqual([
      ['A', 'O meu perfil'],
      ['A', 'Editar perfil'],
      ['A', 'Cartões de oração'],
      ['A', 'Dashboard admin'],
      ['BUTTON', 'Terminar sessão'],
    ])
    expect(menu.getByRole('link', { name: 'O meu perfil' })).toHaveAttribute('href', `/membros/${memberProfileId}`)
    expect(menu.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute('href', '/perfil')
    expect(menu.getByRole('link', { name: 'Cartões de oração' })).toHaveAttribute('href', '/perfil/cartoes-oracao')
    expect(menu.getByRole('link', { name: 'Dashboard admin' })).toHaveAttribute('href', '/admin')
    expect(menu.getByRole('button', { name: 'Terminar sessão' })).toBeInTheDocument()
    expect(menu.getAllByRole('separator')).toHaveLength(2)
    expect(menu.queryByText('Administração')).not.toBeInTheDocument()
  })

  it('o admin técnico vê a sua conta e o dashboard, sem itens de perfil', async () => {
    show(technicalAdmin)
    await openMenu('tecnico@example.pt')
    const menu = within(panel())
    expect(menu.getByRole('link', { name: 'A minha conta' })).toHaveAttribute('href', '/perfil/conta')
    expect(menu.getByRole('link', { name: 'Dashboard admin' })).toHaveAttribute('href', '/admin')
    for (const name of ['O meu perfil', 'Editar perfil', 'Cartões de oração']) {
      expect(menu.queryByRole('link', { name })).not.toBeInTheDocument()
    }
  })

  it('o membro ativo vê o bloco de perfil com os cartões de oração e sem dashboard', async () => {
    show(member)
    await openMenu('Maria Santos')
    const menu = within(panel())
    for (const name of ['O meu perfil', 'Editar perfil', 'Cartões de oração']) {
      expect(menu.getByRole('link', { name })).toBeInTheDocument()
    }
    expect(menu.queryByRole('link', { name: 'Dashboard admin' })).not.toBeInTheDocument()
    expect(menu.getAllByRole('separator')).toHaveLength(1)
  })

  it('o botão indica o estado do painel e Escape devolve o foco ao botão', async () => {
    show(adminWithProfile)
    const button = accountButton('Admin')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    const interaction = await openMenu('Admin')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-controls', panel().id)
    within(panel()).getByRole('link', { name: 'Cartões de oração' }).focus()
    await interaction.keyboard('{Escape}')
    expect(panel()).toBeNull()
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('fecha com um clique fora do menu mas não com um clique dentro do painel', async () => {
    show(adminWithProfile)
    await openMenu('Admin')
    fireEvent.pointerDown(panel())
    expect(panel()).not.toBeNull()
    fireEvent.pointerDown(document.body)
    expect(panel()).toBeNull()
  })

  it('escolher Cartões de oração navega e fecha o painel', async () => {
    show(adminWithProfile)
    const interaction = await openMenu('Admin')
    await interaction.click(within(panel()).getByRole('link', { name: 'Cartões de oração' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/perfil/cartoes-oracao')
    expect(panel()).toBeNull()
  })

  it('Tab a partir do botão vai para o primeiro item e o painel fecha quando o foco sai do menu', async () => {
    show(adminWithProfile)
    const interaction = await openMenu('Admin')
    await interaction.tab()
    expect(within(panel()).getByRole('link', { name: 'O meu perfil' })).toHaveFocus()
    act(() => screen.getByRole('link', { name: 'ASPEC' }).focus())
    expect(panel()).toBeNull()
  })

  it('o menu móvel segue as mesmas regras para o admin técnico e para o admin com perfil', async () => {
    const view = show(technicalAdmin)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir menu de navegação' }))
    let mobile = within(document.getElementById('public-mobile-menu'))
    expect(mobile.getByRole('link', { name: 'A minha conta' })).toHaveAttribute('href', '/perfil/conta')
    expect(mobile.getByRole('link', { name: 'Dashboard admin' })).toHaveAttribute('href', '/admin')
    expect(mobile.getByRole('button', { name: 'Terminar sessão' })).toBeInTheDocument()
    expect(mobile.queryByRole('link', { name: 'O meu perfil' })).not.toBeInTheDocument()
    view.unmount()

    show(adminWithProfile)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir menu de navegação' }))
    mobile = within(document.getElementById('public-mobile-menu'))
    expect(mobile.getByRole('link', { name: 'O meu perfil' })).toHaveAttribute('href', `/membros/${memberProfileId}`)
    expect(mobile.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute('href', '/perfil')
    expect(mobile.getByRole('link', { name: 'Cartões de oração' })).toHaveAttribute('href', '/perfil/cartoes-oracao')
    expect(mobile.getByRole('link', { name: 'Dashboard admin' })).toHaveAttribute('href', '/admin')
    expect(mobile.queryByText('Administração')).not.toBeInTheDocument()
  })

  it('Dashboard admin aparece em dourado e Terminar sessão em vermelho', async () => {
    show(adminWithProfile)
    await openMenu('Admin')
    const menu = within(panel())
    expect(menu.getByRole('link', { name: 'Dashboard admin' })).toHaveClass('text-[#8a7043]')
    expect(menu.getByRole('button', { name: 'Terminar sessão' })).toHaveClass('text-destructive')
  })

  it('o painel do menu é branco com separadores claros, independente do tema', async () => {
    show(adminWithProfile)
    await openMenu('Admin')
    const menu = within(panel())
    expect(panel()).toHaveClass('bg-white', 'border-slate-200')
    expect(panel()).not.toHaveClass('bg-card')
    expect(panel()).not.toHaveClass('text-foreground')
    expect(panel()).not.toHaveClass('border-border')
    for (const separator of menu.getAllByRole('separator')) {
      expect(separator).toHaveClass('border-slate-200')
      expect(separator).not.toHaveClass('border-border')
    }
    expect(menu.getByRole('link', { name: 'Editar perfil' })).toHaveClass('text-[#0d1f35]', 'hover:bg-slate-50')
  })
})
