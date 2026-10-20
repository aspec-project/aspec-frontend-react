import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '../../../src/components/ui/ConfirmDialog'

function dialog(props = {}) {
  return (
    <ConfirmDialog
      open
      title="Bloquear membro"
      description="Texto de teste"
      confirmLabel="Bloquear"
      tone="danger"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  )
}

describe('ConfirmDialog', () => {
  it('só aparece quando está aberto, com nome, descrição e o foco em Cancelar', () => {
    const { rerender } = render(dialog({ open: false }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(dialog())

    const element = screen.getByRole('dialog', { name: 'Bloquear membro' })
    expect(element).toHaveAttribute('aria-modal', 'true')
    expect(element).toHaveAccessibleDescription('Texto de teste')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('confirma com o botão e cancela com Cancelar ou Escape', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(dialog({ onConfirm, onCancel }))

    await user.click(screen.getByRole('button', { name: 'Bloquear' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(2)
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
    const confirm = screen.getByRole('button', { name: 'Bloquear' })
    const cancel = screen.getByRole('button', { name: 'Cancelar' })

    act(() => confirm.focus())
    await user.tab()
    expect(cancel).toHaveFocus()

    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
  })

  it('enquanto processa desativa os botões, mostra A processar... e ignora o Escape', () => {
    const onCancel = vi.fn()
    const { rerender } = render(dialog({ onCancel }))

    rerender(dialog({ onCancel, pending: true }))

    expect(screen.getByRole('button', { name: 'A processar...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Bloquear' })).not.toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('devolve o foco ao elemento que o tinha antes de abrir', () => {
    const { rerender } = render(<><button type="button">Abrir</button>{dialog({ open: false })}</>)
    const opener = screen.getByRole('button', { name: 'Abrir' })
    act(() => opener.focus())

    rerender(<><button type="button">Abrir</button>{dialog()}</>)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()

    rerender(<><button type="button">Abrir</button>{dialog({ open: false })}</>)
    expect(opener).toHaveFocus()
  })

  it('suporta resumo e X opcionais sem alterar o foco inicial e inclui X no ciclo de Tab', async () => {
    const onCancel = vi.fn()
    const { rerender } = render(dialog({ showClose: true, tone: 'gold', children: <section>Resumo do evento</section>, onCancel }))
    const close = screen.getByRole('button', { name: 'Fechar' })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(screen.getByText('Resumo do evento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bloquear' })).toHaveClass('bg-[#8A7043]')
    act(() => screen.getByRole('button', { name: 'Bloquear' }).focus())
    await userEvent.setup().tab()
    expect(close).toHaveFocus()
    await userEvent.setup().tab()
    expect(screen.getByRole('region', { name: 'Resumo da confirmação' })).toHaveFocus()
    await userEvent.setup().tab()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.setup().tab({ shift: true })
    expect(screen.getByRole('region', { name: 'Resumo da confirmação' })).toHaveFocus()
    await userEvent.setup().tab({ shift: true })
    expect(close).toHaveFocus()
    await userEvent.setup().tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Bloquear' })).toHaveFocus()
    await userEvent.setup().click(close)
    expect(onCancel).toHaveBeenCalledTimes(1)
    rerender(dialog({ showClose: true, pending: true, onCancel }))
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
