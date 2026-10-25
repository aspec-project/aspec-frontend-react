import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountInformationPage from '../../src/pages/AccountInformationPage'
import ChangePasswordPage from '../../src/pages/ChangePasswordPage'
import { api } from '../../src/services/api'

describe('Alteração de palavra-passe', () => {
  let adapter
  let requests

  beforeEach(() => {
    adapter = api.defaults.adapter
    requests = []
    api.defaults.adapter = async (config) => {
      requests.push(config)
      return { config, data: { data: null }, status: 200, statusText: 'OK', headers: {} }
    }
  })

  afterEach(() => {
    api.defaults.adapter = adapter
    vi.useRealTimers()
  })

  function show(path = '/perfil/conta/password') {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Outlet context={{ profile: { email: 'membro@example.com', phone: '+351912345678' } }} />}>
            <Route path="/perfil/conta" element={<AccountInformationPage />} />
            <Route path="/perfil/conta/password" element={<ChangePasswordPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
  }

  it('abre o formulário pela conta e permite voltar sem enviar pedidos', () => {
    show('/perfil/conta')
    expect(screen.queryByLabelText('Nova palavra-passe')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Alterar palavra-passe' }))
    expect(screen.getByLabelText('Nova palavra-passe')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Voltar às informações de conta' }))
    expect(screen.getByText('membro@example.com')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('impede o envio de campos vazios', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Alterar palavra-passe' }))
    expect(screen.getByText('Indique a palavra-passe atual.')).toBeInTheDocument()
    expect(screen.getByText('Indique a nova palavra-passe.')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('envia PUT, apresenta a confirmação e regressa à conta após dois segundos', async () => {
    vi.useFakeTimers()
    show()
    fireEvent.change(screen.getByLabelText('Palavra-passe atual'), { target: { value: 'Anterior123!' } })
    fireEvent.change(screen.getByLabelText('Nova palavra-passe'), { target: { value: 'Seguinte123!' } })
    fireEvent.change(screen.getByLabelText('Confirmar nova palavra-passe'), { target: { value: 'Seguinte123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Alterar palavra-passe' }))
    await act(async () => {})
    expect(screen.getByRole('status')).toHaveTextContent('Palavra-passe alterada com sucesso.')
    expect(requests).toHaveLength(1)
    expect(requests[0].method).toBe('put')
    expect(requests[0].url).toBe('/account/password')
    expect(requests[0].baseURL).toMatch(/\/api$/)
    expect(JSON.parse(requests[0].data)).toEqual({ current_password: 'Anterior123!', password: 'Seguinte123!', password_confirmation: 'Seguinte123!' })
    expect(screen.getByLabelText('Palavra-passe atual')).toHaveValue('')
    expect(screen.getByLabelText('Nova palavra-passe')).toHaveValue('')
    expect(screen.getByLabelText('Confirmar nova palavra-passe')).toHaveValue('')
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('membro@example.com')).toBeInTheDocument()
  })
})
