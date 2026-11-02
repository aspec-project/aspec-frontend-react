import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EventChangesList from '../../../../src/components/admin/events/EventChangesList'

const SCRIPT = '<img src=x onerror=alert(1)>'
const LINK = 'https://meet.example.pt/nova'

const changes = [
  { field: 'address', label: 'Morada', before: '(vazio)', after: SCRIPT },
  { field: 'onlineUrl', label: 'Link do evento online', before: '(vazio)', after: LINK },
]

describe('EventChangesList', () => {
  it('mostra cada alteração com o campo, o valor antigo riscado e o novo', () => {
    render(<EventChangesList changes={changes} />)

    const list = screen.getByRole('list', { name: 'Alterações' })
    const items = within(list).getAllByRole('listitem')

    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('Morada:')).toBeInTheDocument()
    expect(items[0].querySelector('del')).toHaveTextContent('(vazio)')
    expect(within(items[1]).getByText('Link do evento online:')).toBeInTheDocument()
  })

  it('o texto escrito pelo admin aparece literalmente e nunca vira HTML', () => {
    const { container } = render(<EventChangesList changes={changes} />)

    expect(screen.getByText(SCRIPT)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(document.querySelector('img')).toBeNull()
  })

  it('a seta fica escondida dos leitores de ecrã, que ouvem "passa a"', () => {
    render(<EventChangesList changes={changes} />)

    const arrows = screen.getAllByText('→')
    expect(arrows).toHaveLength(2)
    for (const arrow of arrows) {
      expect(arrow).toHaveAttribute('aria-hidden', 'true')
    }
    expect(screen.getAllByText('passa a')).toHaveLength(2)
  })

  it('um link novo aparece como texto e não como ligação', () => {
    render(<EventChangesList changes={changes} />)

    expect(screen.getByText(LINK).closest('a')).toBeNull()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
