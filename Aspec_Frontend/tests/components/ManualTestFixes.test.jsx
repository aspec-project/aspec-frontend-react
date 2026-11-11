import { act, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import UserDetail from '../../src/components/admin/users/UserDetail'
import PasswordStep from '../../src/components/register/steps/PasswordStep'
import InternationalPhoneInput from '../../src/components/ui/InternationalPhoneInput'
import PendingAccountPage from '../../src/pages/PendingAccountPage'
import RequestActivationLinkPage from '../../src/pages/RequestActivationLinkPage'
import { useLoginForm } from '../../src/hooks/useLoginForm'
import { useAuthStore } from '../../src/store/authStore'
import { getWebsiteError } from '../../src/utils/registerUtils'

vi.mock('../../src/services/accountActivation', () => ({
  resendAccountActivationLink: vi.fn(),
}))

const INVALID_URL = 'O campo website tem de ser um URL válido.'
const CREDENTIALS = 'O campo website não pode ter utilizador nem palavra-passe antes do "@".'

describe('Correções dos testes manuais (ASPEC-461)', () => {
  describe('T12: website validado no passo 2 do registo', () => {
    it.each([
      ['', null],
      ['exemplo.pt', null],
      ['https://exemplo.pt/servicos', null],
      ['http://www.exemplo.pt', null],
      ['javascript:alert(1)', INVALID_URL],
      ['ftp://x.pt', INVALID_URL],
      ['//mau.pt', INVALID_URL],
      ['localhost', INVALID_URL],
      ['https://linkedin.com@mau.pt', CREDENTIALS],
    ])('"%s" → %s', (value, expected) => {
      expect(getWebsiteError(value)).toBe(expected)
    })
  })

  describe('T3/T4: erro do telefone debaixo do número', () => {
    function Phone({ error }) {
      const [value, setValue] = useState('+351')
      return <InternationalPhoneInput id="phone" name="phone" value={value} onChange={(event) => setValue(event.target.value)} error={error} />
    }

    it('mostra o erro a seguir à caixa do número e liga-o ao campo', () => {
      render(<Phone error="Obrigatório." />)

      const number = document.getElementById('phone')
      const message = screen.getByRole('alert')
      expect(message).toHaveTextContent('Obrigatório.')
      expect(number.parentElement).toContainElement(message)
      expect(screen.getByLabelText('Indicativo telefónico').parentElement).not.toBe(number.parentElement)
      expect(number).toHaveAttribute('aria-invalid', 'true')
      expect(number).toHaveAccessibleDescription('Obrigatório.')
    })

    it('sem erro não mostra mensagem nem marca o campo', () => {
      render(<Phone />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(document.getElementById('phone')).not.toHaveAttribute('aria-invalid')
    })
  })

  describe('T1/T2: página de candidatura pendente', () => {
    it('o botão volta à página inicial e não ao login', () => {
      render(<MemoryRouter><PendingAccountPage /></MemoryRouter>)

      const link = screen.getByText('Voltar à página inicial').closest('a')
      expect(link).toHaveAttribute('href', '/')
      expect(screen.queryByRole('link', { name: /início de sessão/i })).not.toBeInTheDocument()
    })
  })

  describe('T7/T9: detalhe do utilizador no backoffice', () => {
    const profile = {
      name: 'Ana Costa',
      business_name: 'Costa Lda',
      location: { name: 'Porto' },
      address: 'Rua de Cedofeita 301',
      postal_code: '4050-174',
      city: 'Porto',
      social_links: [],
      portfolio: [],
      business_hours: [],
    }
    const user = (status) => ({
      id: 'u1',
      email: 'ana@costa.pt',
      phone: '+351912345678',
      created_at: '2026-11-10T09:00:00+00:00',
      role: { name: 'Member' },
      account_status: { name: status },
      member_profile: profile,
    })

    it.each(['Pending', 'Approved'])('conta %s mostra "Candidatura em" em vez de "Membro desde"', (status) => {
      render(<UserDetail user={user(status)} />)

      expect(screen.getByText('Candidatura em')).toBeInTheDocument()
      expect(screen.queryByText('Membro desde')).not.toBeInTheDocument()
    })

    it('conta ativa continua a mostrar "Membro desde"', () => {
      render(<UserDetail user={user('Active')} />)

      expect(screen.getByText('Membro desde')).toBeInTheDocument()
    })

    it('mostra a morada completa nos contactos', () => {
      render(<UserDetail user={user('Active')} />)

      const contacts = screen.getByRole('region', { name: 'Contactos e redes' })
      expect(within(contacts).getByText('Morada')).toBeInTheDocument()
      expect(within(contacts).getByText('Rua de Cedofeita 301, 4050-174 Porto')).toBeInTheDocument()
    })
  })

  describe('T13: aceitação dos termos', () => {
    it('liga aos Termos, ao Código de Conduta e à Política de Privacidade num separador novo', () => {
      render(
        <PasswordStep
          bind={() => ({ value: '', onChange: () => {} })}
          errors={{}}
          inputCls=""
          formData={{ acceptTerms: false }}
          handleChange={() => {}}
          passCriteria={{}}
          PASSWORD_RULES={[]}
        />,
      )

      for (const [name, href] of [
        ['Termos e Condições', '/termos-e-condicoes'],
        ['Código de Conduta', '/codigo-de-conduta'],
        ['Política de Privacidade', '/politica-de-privacidade'],
      ]) {
        const link = screen.getByRole('link', { name })
        expect(link).toHaveAttribute('href', href)
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      }
    })
  })

  describe('T15: pedir novo link', () => {
    function show(state) {
      render(
        <MemoryRouter initialEntries={[{ pathname: '/ativacao/novo-link', state }]}>
          <Routes>
            <Route path="/ativacao/novo-link" element={<RequestActivationLinkPage />} />
          </Routes>
        </MemoryRouter>,
      )
    }

    it('vem com o email do login já preenchido e com um título que serve aos dois casos', () => {
      show({ email: 'ana@costa.pt' })

      expect(screen.getByRole('heading', { name: 'Pedir novo link' })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toHaveValue('ana@costa.pt')
    })

    it('sem email do login o campo fica vazio e editável', async () => {
      show()

      const field = screen.getByLabelText(/email/i)
      expect(field).toHaveValue('')
      await userEvent.setup().type(field, 'x@y.pt')
      expect(field).toHaveValue('x@y.pt')
    })
  })
  describe('T8: login sem os avisos do browser', () => {
    it('um email com formato inválido dá uma mensagem em português e não chega à API', async () => {
      const login = vi.fn()
      useAuthStore.setState({ login, status: 'unauthenticated' })
      const { result } = renderHook(() => useLoginForm(), { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> })

      act(() => {
        result.current.setEmail("' OR 1=1 --")
        result.current.setPassword('qualquer')
      })
      await act(() => result.current.handleLogin())

      expect(result.current.formError).toBe('Indique um endereço de email válido.')
      expect(login).not.toHaveBeenCalled()
    })

    it('campos vazios pedem o email e a palavra-passe', async () => {
      useAuthStore.setState({ status: 'unauthenticated' })
      const { result } = renderHook(() => useLoginForm(), { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> })

      await act(() => result.current.handleLogin())

      expect(result.current.formError).toBe('Preencha o email e a palavra-passe.')
    })
  })
})
