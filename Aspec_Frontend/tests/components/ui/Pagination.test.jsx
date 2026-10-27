import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from '../../../src/components/ui/Pagination'

function show(props = {}) {
  const onChange = vi.fn()
  render(<Pagination currentPage={1} lastPage={3} onChange={onChange} label="Paginação de eventos" {...props} />)

  return onChange
}

describe('Pagination', () => {
  it('mostra um botão por página, marca a atual e muda de página ao clicar', async () => {
    const user = userEvent.setup()
    const onChange = show()

    expect(screen.getByRole('navigation', { name: 'Paginação de eventos' })).toBeInTheDocument()
    for (const page of [1, 2, 3]) {
      expect(screen.getByRole('button', { name: `Página ${page}` })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Página 2' })).not.toHaveAttribute('aria-current')

    await user.click(screen.getByRole('button', { name: 'Página 2' }))

    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('desativa anterior na primeira página e seguinte na última', () => {
    const { unmount } = render(<Pagination currentPage={1} lastPage={3} onChange={vi.fn()} label="Paginação de eventos" />)

    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página seguinte' })).toBeEnabled()
    unmount()

    show({ currentPage: 3 })

    expect(screen.getByRole('button', { name: 'Página seguinte' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled()
  })

  it('seguinte na página 2 de 3 pede a página 3', async () => {
    const user = userEvent.setup()
    const onChange = show({ currentPage: 2 })

    await user.click(screen.getByRole('button', { name: 'Página seguinte' }))

    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('não desenha nada com uma só página', () => {
    show({ lastPage: 1 })

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('desativa todos os botões quando está desativada', () => {
    show({ currentPage: 2, disabled: true })

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })

  it('mostra reticências que não são botões nos saltos', () => {
    show({ currentPage: 5, lastPage: 10 })

    expect(screen.getAllByText('…')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: '…' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Página 2' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 10' })).toBeInTheDocument()
  })
})
