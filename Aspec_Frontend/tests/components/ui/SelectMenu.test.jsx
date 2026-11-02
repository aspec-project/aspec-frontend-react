import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SelectMenu from '../../../src/components/ui/SelectMenu'

const options = [
  { value: '', label: 'Todos os tipos' },
  { value: 'c1', label: 'Workshop' },
  { value: 'c2', label: 'Formação' },
]

function show(props = {}) {
  const onChange = vi.fn()
  const view = render(<SelectMenu id="filtro-tipo" label="Tipo de evento" value="" options={options} onChange={onChange} {...props} />)

  return { ...view, onChange }
}

function combobox() {
  return screen.getByRole('combobox', { name: 'Tipo de evento' })
}

function option(name) {
  return screen.getByRole('option', { name })
}

function expectHighlighted(name) {
  expect(combobox()).toHaveAttribute('aria-activedescendant', option(name).id)
}

describe('SelectMenu', () => {
  it('mostra a opção escolhida e abre a lista com a escolhida assinalada', async () => {
    const user = userEvent.setup()
    show()

    expect(combobox()).toHaveTextContent('Todos os tipos')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(combobox()).toHaveAttribute('aria-haspopup', 'listbox')
    expect(screen.queryAllByRole('option')).toHaveLength(0)

    await user.click(combobox())

    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    const listbox = screen.getByRole('listbox', { name: 'Tipo de evento' })
    expect(combobox()).toHaveAttribute('aria-controls', listbox.id)
    expect(screen.getAllByRole('option').map((item) => item.textContent.trim())).toEqual(['Todos os tipos', 'Workshop', 'Formação'])
    expect(option('Todos os tipos')).toHaveAttribute('aria-selected', 'true')
    expect(option('Workshop')).toHaveAttribute('aria-selected', 'false')
    expect(option('Formação')).toHaveAttribute('aria-selected', 'false')
    expectHighlighted('Todos os tipos')
  })

  it('na variante dos filtros permite escolher por teclado e cancelar sem alterar o valor', async () => {
    const user = userEvent.setup()
    const { onChange } = show({ variant: 'public-filter' })

    await user.tab()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith('c1')
    expect(combobox()).toHaveFocus()
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')

    onChange.mockClear()
    await user.keyboard('{ArrowDown}{End}{Escape}')
    expect(onChange).not.toHaveBeenCalled()
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(combobox()).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    await user.tab()
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
  })

  it('nos filtros pesquisa prefixos sem acentos e percorre iniciais repetidas com o menu fechado ou aberto', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const choices = [
      { value: '', label: 'Todos' },
      { value: 'a', label: 'Águeda' },
      { value: 'b', label: 'Aveiro' },
      { value: 'c', label: 'Portalegre' },
      { value: 'd', label: 'Porto' },
    ]
    function Filter() {
      const [value, setValue] = useState('')
      return <SelectMenu id="filtro-tipo" label="Tipo de evento" variant="public-filter" value={value} options={choices} onChange={(next) => { setValue(next); onChange(next) }} />
    }
    render(<Filter />)
    await user.tab()
    await user.keyboard('a')
    expect(combobox()).toHaveTextContent(choices[1].label)
    await user.keyboard('a')
    expect(combobox()).toHaveTextContent('Aveiro')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')

    await user.keyboard('{ArrowDown}porto')
    expectHighlighted('Porto')
    expect(combobox()).toHaveTextContent('Aveiro')
    onChange.mockClear()
    await user.keyboard('{Escape}')
    expect(onChange).not.toHaveBeenCalled()
    expect(combobox()).toHaveTextContent('Aveiro')

    await user.keyboard('{ArrowDown}porto{Enter}')
    expect(onChange).toHaveBeenCalledWith('d')
    expect(combobox()).toHaveTextContent('Porto')
    expect(combobox()).toHaveFocus()

    const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
    try {
      await user.keyboard('a')
      expect(combobox()).toHaveTextContent(choices[1].label)
      now.mockReturnValue(2000)
      await user.keyboard('v')
      expect(combobox()).toHaveTextContent(choices[1].label)
    } finally {
      now.mockRestore()
    }
  })

  it('com um valor escolhido mostra o nome dessa opção', () => {
    show({ value: 'c2' })

    expect(combobox()).toHaveTextContent('Formação')
  })

  it('com o teclado as setas, Home e End mudam a opção realçada e Enter escolhe, com o foco sempre no botão', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    await user.tab()
    expect(combobox()).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    expectHighlighted('Todos os tipos')

    await user.keyboard('{ArrowDown}')
    expectHighlighted('Workshop')
    expect(onChange).not.toHaveBeenCalled()

    await user.keyboard('{End}')
    expectHighlighted('Formação')

    await user.keyboard('{Home}')
    expectHighlighted('Todos os tipos')

    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('c1')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(combobox()).toHaveFocus()
  })

  it('Escape, Espaço sobre a opção já escolhida e Tab fecham sem mudar', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    await user.tab()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Escape}')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(combobox()).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    await user.keyboard(' ')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')

    await user.keyboard('{ArrowDown}')
    await user.tab()
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('o Escape não chega aos elementos à volta', async () => {
    const outerKeyDown = vi.fn()
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <div onKeyDown={(event) => outerKeyDown(event.key)}>
        <SelectMenu id="filtro-tipo" label="Tipo de evento" value="" options={options} onChange={onChange} />
      </div>,
    )

    await user.tab()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Escape}')

    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(outerKeyDown).not.toHaveBeenCalledWith('Escape')
  })

  it('clicar numa opção escolhe-a e fecha, com o foco no botão', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    await user.click(combobox())
    await user.click(option('Formação'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('c2')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(combobox()).toHaveFocus()
  })

  it('clicar fora fecha sem mudar', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    await user.click(combobox())
    await user.click(document.body)

    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('desativado não abre', async () => {
    const user = userEvent.setup()
    show({ disabled: true })

    expect(combobox()).toBeDisabled()

    await user.click(combobox())

    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })
})

describe('SelectMenu num formulário', () => {
  const requiredOptions = [
    { value: 'c1', label: 'Workshop' },
    { value: 'c2', label: 'Formação' },
    { value: 'c3', label: 'Jantar' },
  ]

  it('com placeholder e sem valor mostra o placeholder, que não é uma opção da lista', async () => {
    const user = userEvent.setup()
    const { onChange } = show({ options: requiredOptions, placeholder: 'Selecione o tipo de evento' })

    expect(combobox()).toHaveTextContent('Selecione o tipo de evento')

    await user.click(combobox())

    expect(screen.getAllByRole('option').map((item) => item.textContent.trim())).toEqual(['Workshop', 'Formação', 'Jantar'])
    expect(screen.queryByRole('option', { name: 'Selecione o tipo de evento' })).not.toBeInTheDocument()
    for (const item of screen.getAllByRole('option')) {
      expect(item).toHaveAttribute('aria-selected', 'false')
    }

    await user.click(option('Jantar'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('c3')
  })

  it('com labelId usa a label de fora e aplica name, invalid, describedBy e required', () => {
    render(
      <>
        <label id="x-label" htmlFor="x">Tipo de evento</label>
        <SelectMenu
          id="x"
          label="Tipo de evento"
          labelId="x-label"
          name="categoryId"
          invalid
          describedBy="e1"
          required
          value=""
          options={requiredOptions}
          placeholder="Selecione o tipo de evento"
          onChange={vi.fn()}
        />
      </>,
    )

    expect(screen.getAllByText('Tipo de evento')).toHaveLength(1)
    expect(combobox()).toHaveAttribute('aria-labelledby', 'x-label')
    expect(combobox()).toHaveAttribute('name', 'categoryId')
    expect(combobox()).toHaveAttribute('aria-invalid', 'true')
    expect(combobox()).toHaveAttribute('aria-describedby', 'e1')
    expect(combobox()).toHaveAttribute('aria-required', 'true')
  })

  it('sem as props do formulário não tem estes atributos e desenha a sua label', () => {
    show()

    expect(combobox()).not.toHaveAttribute('name')
    expect(combobox()).not.toHaveAttribute('aria-invalid')
    expect(combobox()).not.toHaveAttribute('aria-describedby')
    expect(combobox()).not.toHaveAttribute('aria-required')
    const ownLabel = document.getElementById(combobox().getAttribute('aria-labelledby'))
    expect(ownLabel).toHaveTextContent('Tipo de evento')
  })

  it('com labelId a lista aberta tem nome próprio e a label continua a nomear só o botão', async () => {
    const user = userEvent.setup()
    render(
      <>
        <label id="x-label" htmlFor="x">Tipo de evento</label>
        <SelectMenu id="x" label="Tipo de evento" labelId="x-label" value="" options={requiredOptions} placeholder="Selecione o tipo de evento" onChange={vi.fn()} />
      </>,
    )

    await user.click(combobox())

    const listbox = screen.getByRole('listbox', { name: 'Opções de Tipo de evento' })
    expect(listbox).not.toHaveAttribute('aria-labelledby')
    const labelled = screen.getAllByLabelText(/^Tipo de evento\s*\*?$/)
    expect(labelled).toHaveLength(1)
    expect(labelled[0]).toBe(combobox())
  })

  it('sem labelId a lista continua com o nome da label e sem aria-label', async () => {
    const user = userEvent.setup()
    show()

    await user.click(combobox())

    const listbox = screen.getByRole('listbox', { name: 'Tipo de evento' })
    expect(listbox).not.toHaveAttribute('aria-label')
  })
})
