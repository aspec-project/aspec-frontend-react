import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EventSeriesPreview from '../../../../src/components/admin/events/EventSeriesPreview'

const THREE = ['2099-03-20', '2099-03-27', '2099-04-03']

describe('EventSeriesPreview', () => {
  it('mostra o número de sessões, o resumo e cada sessão com o prazo calculado', () => {
    render(<EventSeriesPreview dates={THREE} frequency="weekly" deadlineDaysBefore="3" />)

    const region = screen.getByRole('region', { name: 'Sessões a criar (3)' })
    expect(within(region).getByText('Semanal, de 20 Mar 2099 a 3 Abr 2099.')).toBeInTheDocument()

    const items = within(within(region).getByRole('list')).getAllByRole('listitem')
    expect(within(region).getByRole('list').tagName).toBe('OL')
    expect(items.map((item) => item.textContent.trim())).toEqual([
      '20 Mar 2099 · inscrições até 17 Mar 2099, 23:59',
      '27 Mar 2099 · inscrições até 24 Mar 2099, 23:59',
      '3 Abr 2099 · inscrições até 31 Mar 2099, 23:59',
    ])
  })

  it('a caixa da lista pode receber o foco para fazer scroll com o teclado', () => {
    render(<EventSeriesPreview dates={THREE} frequency="weekly" deadlineDaysBefore="3" />)

    const box = screen.getByLabelText('Lista das sessões')
    expect(box).toHaveAttribute('tabindex', '0')
    expect(within(box).getByRole('list')).toBeInTheDocument()
  })

  it('com uma só sessão usa o singular no resumo', () => {
    render(<EventSeriesPreview dates={['2099-03-20']} frequency="weekly" deadlineDaysBefore="3" />)

    const region = screen.getByRole('region', { name: 'Sessões a criar (1)' })
    expect(within(region).getByText('Semanal, com uma só sessão a 20 Mar 2099.')).toBeInTheDocument()
    expect(within(region).getAllByRole('listitem')).toHaveLength(1)
  })
})
