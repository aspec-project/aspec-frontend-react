import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ShowAdminsToggle from '../../../../src/components/admin/users/ShowAdminsToggle'

describe('ShowAdminsToggle', () => {
  it('não premido mostra o olho fechado e a dica Mostrar admins', () => {
    render(<ShowAdminsToggle pressed={false} onToggle={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Ver admins' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('title', 'Mostrar admins')
    expect(button.querySelector('svg.lucide-eye-off')).toHaveAttribute('aria-hidden', 'true')
    expect(button.querySelector('svg.lucide-eye')).toBeNull()
    expect(button).toHaveClass('bg-white', 'focus-visible:outline-2')
  })

  it('premido mostra o olho aberto, fundo navy e a dica Esconder admins', () => {
    render(<ShowAdminsToggle pressed onToggle={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Ver admins' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('title', 'Esconder admins')
    expect(button.querySelector('svg.lucide-eye')).toBeInTheDocument()
    expect(button.querySelector('svg.lucide-eye-off')).toBeNull()
    expect(button).toHaveClass('bg-[#0d1f35]')
  })

  it('alterna com o clique, o Enter e o Espaço', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<ShowAdminsToggle pressed={false} onToggle={onToggle} />)

    const button = screen.getByRole('button', { name: 'Ver admins' })
    await user.click(button)
    button.blur()

    await user.tab()
    expect(button).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')

    expect(onToggle).toHaveBeenCalledTimes(3)
  })
})
