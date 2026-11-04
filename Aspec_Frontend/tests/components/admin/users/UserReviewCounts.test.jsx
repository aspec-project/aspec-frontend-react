import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import UserReviewCounts from '../../../../src/components/admin/users/UserReviewCounts'

const UNAVAILABLE = 'As contagens de avaliações ainda não estão disponíveis.'
const GROUPS = ['No perfil do membro', 'Feitas a outros membros']
const PRINT_COUNTS = {
  received: { total: 13, hidden: 3, flagged: 1 },
  given: { total: 8, hidden: 3, flagged: 2 },
}
const ZERO_COUNTS = {
  received: { total: 0, hidden: 0, flagged: 0 },
  given: { total: 0, hidden: 0, flagged: 0 },
}

function values(name) {
  return within(screen.getByRole('group', { name })).getAllByRole('definition')
}

describe('UserReviewCounts', () => {
  it('mostra as Sinalizadas em âmbar quando há sinalizadas e os números em tamanho grande', () => {
    render(<UserReviewCounts counts={PRINT_COUNTS} />)

    const expected = [
      ['No perfil do membro', ['13', '3', '1']],
      ['Feitas a outros membros', ['8', '3', '2']],
    ]

    for (const [name, numbers] of expected) {
      const [total, hidden, flagged] = values(name)
      expect([total, hidden, flagged].map((dd) => dd.textContent)).toEqual(numbers)
      expect(total).toHaveClass('text-[#0d1f35]', 'text-2xl')
      expect(hidden).toHaveClass('text-[#0d1f35]', 'text-2xl')
      expect(flagged).toHaveClass('text-amber-700', 'text-2xl')
      expect(flagged).not.toHaveClass('text-[#8a7043]')
    }
  })

  it('sem sinalizadas mostra o 0 na cor normal, sem âmbar nem dourado', () => {
    render(<UserReviewCounts counts={{ received: { total: 5, hidden: 2, flagged: 0 }, given: { total: 0, hidden: 0, flagged: 0 } }} />)

    for (const name of GROUPS) {
      const flagged = values(name)[2]
      expect(flagged).toHaveTextContent('0')
      expect(flagged).toHaveClass('text-[#0d1f35]')
      expect(flagged).not.toHaveClass('text-amber-700')
      expect(flagged).not.toHaveClass('text-[#8a7043]')
    }
  })

  it('com tudo a zero mostra os seis mosaicos com 0 e não diz que as contagens não estão disponíveis', () => {
    render(<UserReviewCounts counts={ZERO_COUNTS} />)

    const all = GROUPS.flatMap((name) => values(name))
    expect(all).toHaveLength(6)
    for (const dd of all) {
      expect(dd).toHaveTextContent(/^0$/)
    }
    expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument()
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['um objeto vazio', {}],
    ['sem o lado given', { received: PRINT_COUNTS.received }],
    ['written em vez de given', { received: PRINT_COUNTS.received, written: PRINT_COUNTS.given }],
    ['hidden negativo', { ...PRINT_COUNTS, received: { total: 13, hidden: -1, flagged: 1 } }],
    ['total decimal', { ...PRINT_COUNTS, received: { total: 1.5, hidden: 0, flagged: 0 } }],
    ['total em texto', { ...PRINT_COUNTS, given: { total: '3', hidden: 0, flagged: 0 } }],
    ['flagged NaN', { ...PRINT_COUNTS, given: { total: 8, hidden: 3, flagged: NaN } }],
    ['total acima do inteiro seguro', { ...PRINT_COUNTS, received: { total: Number.MAX_SAFE_INTEGER + 1, hidden: 0, flagged: 0 } }],
  ])('com contagens inválidas (%s) avisa que ainda não estão disponíveis', (_case, counts) => {
    render(<UserReviewCounts counts={counts} />)

    expect(screen.getByText(UNAVAILABLE)).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.queryByRole('definition')).not.toBeInTheDocument()
  })

  it('anuncia cada grupo pelo subtítulo, com os rótulos e os números pela mesma ordem e os ícones escondidos', () => {
    const { container } = render(<UserReviewCounts counts={PRINT_COUNTS} />)

    const expected = [
      ['No perfil do membro', ['13', '3', '1']],
      ['Feitas a outros membros', ['8', '3', '2']],
    ]

    for (const [name, numbers] of expected) {
      const group = screen.getByRole('group', { name })
      const heading = within(group).getByRole('heading', { level: 3, name })
      expect(group).toHaveAttribute('aria-labelledby', heading.id)
      expect(within(group).getAllByRole('term').map((dt) => dt.textContent)).toEqual(['Total', 'Ocultas', 'Sinalizadas'])
      expect(within(group).getAllByRole('definition').map((dd) => dd.textContent)).toEqual(numbers)
    }

    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) {
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('em telemóvel mostra um mosaico por linha, com o rótulo à esquerda e o número à direita', () => {
    render(<UserReviewCounts counts={PRINT_COUNTS} />)

    for (const name of GROUPS) {
      const group = within(screen.getByRole('group', { name }))
      const list = group.getAllByRole('term')[0].closest('dl')
      expect(list).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-3')

      for (const term of group.getAllByRole('term')) {
        expect(term.parentElement).toHaveClass('flex', 'justify-between', 'sm:block')
      }
    }
  })
})
