import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AnonymizeUserDialog from '../../../../src/components/admin/users/AnonymizeUserDialog'

const maria = { id: 'u3', email: 'maria@santos.pt', role: { name: 'Member' }, member_profile: { name: 'Maria Santos' } }

const DESCRIPTION = 'A conta é fechada e o membro deixa de poder iniciar sessão. É enviado um email de confirmação ao titular.'
const NOTE = 'Esta ação é irreversível. Os dados pessoais e o perfil são apagados; ficam apenas as faturas (obrigação fiscal), as inscrições em eventos passados sem dados pessoais e o registo de quem anonimizou e quando.'
const FIELD = 'Para confirmar, escreva ANONIMIZAR'

function dialog(props = {}) {
  return (
    <AnonymizeUserDialog
      open
      user={maria}
      pending={false}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  )
}

function byFullText(text) {
  return screen.getByText((_, element) => {
    const matches = (node) => node.textContent.replace(/\s+/g, ' ').trim() === text
    return matches(element) && Array.from(element.children).every((child) => !matches(child))
  })
}

function field() {
  return screen.getByRole('textbox', { name: FIELD })
}

function confirmButton() {
  return screen.getByRole('button', { name: 'Anonimizar' })
}

describe('AnonymizeUserDialog', () => {
  it('mostra o aviso da equipa, a nota, o membro e o campo de confirmação com o foco', () => {
    render(dialog())

    const element = screen.getByRole('dialog', { name: 'Anonimizar membro' })
    expect(element).toHaveAttribute('aria-modal', 'true')
    expect(element).toHaveAccessibleDescription(DESCRIPTION)
    expect(byFullText(NOTE)).toBeInTheDocument()
    expect(byFullText('Membro: Maria Santos (maria@santos.pt)')).toBeInTheDocument()
    expect(field()).toHaveFocus()
  })

  it('só ativa Anonimizar com a palavra em maiúsculas e confirma uma vez', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(dialog({ onConfirm }))

    expect(confirmButton()).toBeDisabled()

    await user.type(field(), 'anonimizar')
    expect(confirmButton()).toBeDisabled()

    await user.clear(field())
    await user.type(field(), 'ANONIMIZAR')
    expect(confirmButton()).toBeEnabled()

    await user.click(confirmButton())
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('Enter no campo só confirma com a palavra certa', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(dialog({ onConfirm }))

    await user.type(field(), 'ANONIMIZA{Enter}')
    expect(onConfirm).not.toHaveBeenCalled()

    await user.type(field(), 'R{Enter}')
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('Escape e Cancelar cancelam, mas não durante o pedido', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const { rerender } = render(dialog({ onCancel }))

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(2)

    rerender(dialog({ onCancel, pending: true }))

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(field()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'A processar...' })).toBeDisabled()
  })

  it('limpa o texto escrito sempre que volta a abrir', async () => {
    const user = userEvent.setup()
    const { rerender } = render(dialog())

    await user.type(field(), 'ANONIMIZAR')
    expect(confirmButton()).toBeEnabled()

    rerender(dialog({ open: false }))
    rerender(dialog())

    expect(field()).toHaveValue('')
    expect(confirmButton()).toBeDisabled()
  })

  it('mantém o foco dentro do diálogo com Tab e Shift+Tab', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Antes</button>
        {dialog()}
        <button type="button">Depois</button>
      </>
    )

    await user.type(field(), 'ANONIMIZAR')
    act(() => confirmButton().focus())

    await user.tab()
    expect(field()).toHaveFocus()

    await user.tab({ shift: true })
    expect(confirmButton()).toHaveFocus()
  })

  it('fechado não mostra nada', () => {
    const { container } = render(dialog({ open: false }))

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
