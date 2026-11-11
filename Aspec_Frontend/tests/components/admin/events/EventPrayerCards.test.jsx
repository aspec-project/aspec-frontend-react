import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EventPrayerCards from '../../../../src/components/admin/events/EventPrayerCards'

const TITLE = 'Cartões de oração neste evento'
const EXPLANATION = 'Cada participante preenche um cartão no dia do evento. No fim do prazo, os cartões são distribuídos em cadeia, e cada pessoa recebe o de outro participante.'
const PLACEHOLDER = 'Ex.: Não andeis ansiosos por coisa alguma... — Filipenses 4:6'
const HINT = 'Aparece em destaque no cartão de cada participante.'
const LOCKED = 'Já há cartões preenchidos neste evento: não é possível desligar os cartões nem mudar o versículo, a data ou a hora de início.'
const SERIES_HINT = 'Numa série, todas as sessões ficam com os cartões de oração e este versículo. Pode mudar o versículo de cada sessão ao editá-la.'

function show({ values = {}, ...props } = {}) {
  const onToggle = vi.fn()
  const onVerseChange = vi.fn()
  const view = render(
    <EventPrayerCards
      values={{ prayerCardsEnabled: false, prayerVerse: '', ...values }}
      errors={{}}
      onToggle={onToggle}
      onVerseChange={onVerseChange}
      locked={false}
      isRecurring={false}
      {...props}
    />,
  )

  return { ...view, onToggle, onVerseChange }
}

function toggle() {
  return screen.getByRole('switch', { name: TITLE })
}

function verse() {
  return screen.getByRole('textbox', { name: /^Versículo da semana/ })
}

function describedIds(element) {
  return (element.getAttribute('aria-describedby') ?? '').split(/\s+/)
}

function describedTexts(element) {
  return describedIds(element).map((id) => document.getElementById(id)?.textContent.trim())
}

describe('EventPrayerCards', () => {
  it('desligada mostra a caixa com o título e o texto explicativo, sem cruz nem versículo', () => {
    show()

    const box = screen.getByRole('group', { name: TITLE })
    expect(within(box).queryByText('†')).not.toBeInTheDocument()
    expect(within(box).getByText(EXPLANATION)).toBeInTheDocument()
    expect(toggle()).toHaveAccessibleDescription(EXPLANATION)
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('ligada mostra o versículo obrigatório com o placeholder, o limite, o hint e o contador', async () => {
    const user = userEvent.setup({ delay: null })
    const { onToggle } = show({ values: { prayerCardsEnabled: true } })

    expect(toggle()).toHaveAttribute('aria-checked', 'true')
    expect(verse()).toHaveAttribute('placeholder', PLACEHOLDER)
    expect(verse()).toHaveAttribute('maxlength', '500')
    expect(verse()).toHaveAttribute('aria-required', 'true')
    expect(describedTexts(verse())).toContain(HINT)
    expect(describedTexts(verse())).toContain('0/500 caracteres')

    await user.click(toggle())

    expect(onToggle).toHaveBeenCalledWith(false)
    expect(toggle()).toHaveFocus()
  })

  it('desligada, clicar no interruptor pede para ligar e o foco fica nele', async () => {
    const user = userEvent.setup({ delay: null })
    const { onToggle } = show()

    await user.click(toggle())

    expect(onToggle).toHaveBeenCalledWith(true)
    expect(toggle()).toHaveFocus()
  })

  it('escrever o versículo passa o texto e o contador conta os caracteres', () => {
    const { onVerseChange, rerender } = show({ values: { prayerCardsEnabled: true } })

    fireEvent.change(verse(), { target: { value: 'Salmo 23' } })

    expect(onVerseChange).toHaveBeenCalledWith('Salmo 23')

    rerender(
      <EventPrayerCards
        values={{ prayerCardsEnabled: true, prayerVerse: 'Salmo 23' }}
        errors={{}}
        onToggle={vi.fn()}
        onVerseChange={onVerseChange}
        locked={false}
        isRecurring={false}
      />,
    )

    expect(screen.getByText('8/500 caracteres')).toBeInTheDocument()
  })

  it('o erro do versículo aparece debaixo do campo quando está ligada e no texto da caixa quando está desligada', () => {
    const { unmount } = show({ values: { prayerCardsEnabled: true }, errors: { prayerVerse: 'X' } })

    const error = screen.getByText('X')
    expect(verse()).toHaveAttribute('aria-invalid', 'true')
    expect(describedIds(verse())).toContain(error.id)
    unmount()

    show({ errors: { prayerVerse: 'X' } })

    expect(screen.getByRole('group', { name: TITLE })).toContainElement(screen.getByText('X'))
    expect(describedTexts(toggle())).toContain('X')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('bloqueada desativa o interruptor e o versículo e explica porquê', async () => {
    const user = userEvent.setup({ delay: null })
    const { onToggle } = show({ values: { prayerCardsEnabled: true, prayerVerse: 'Salmo 23' }, locked: true })

    expect(toggle()).toBeDisabled()
    expect(verse()).toBeDisabled()
    expect(screen.getByText(LOCKED)).toBeInTheDocument()
    expect(describedTexts(toggle())).toContain(LOCKED)

    await user.click(toggle())

    expect(onToggle).not.toHaveBeenCalled()
  })

  it('numa série mostra a frase das sessões e num pontual não', () => {
    const { unmount } = show({ isRecurring: true })

    expect(screen.getByText(SERIES_HINT)).toBeInTheDocument()
    unmount()

    show()

    expect(screen.queryByText(SERIES_HINT)).not.toBeInTheDocument()
  })
})
