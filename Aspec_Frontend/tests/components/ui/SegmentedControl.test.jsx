import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapPin, Video } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import SegmentedControl from '../../../src/components/ui/SegmentedControl'

const formats = [
  { value: false, label: 'Presencial', icon: MapPin },
  { value: true, label: 'Online', icon: Video },
]

function show(props = {}) {
  const onChange = vi.fn()
  const view = render(<SegmentedControl label="Formato" options={formats} value={false} onChange={onChange} {...props} />)

  return { ...view, onChange }
}

function segment(name) {
  return within(screen.getByRole('group', { name: 'Formato' })).getByRole('button', { name })
}

describe('SegmentedControl', () => {
  it('mostra a label visível e um grupo com um botão por opção, o ativo pressionado e os ícones escondidos', () => {
    show()

    expect(screen.getByText('Formato')).toBeVisible()
    const group = screen.getByRole('group', { name: 'Formato' })
    expect(within(group).getAllByRole('button')).toHaveLength(2)
    expect(segment('Presencial')).toHaveAttribute('aria-pressed', 'true')
    expect(segment('Online')).toHaveAttribute('aria-pressed', 'false')
    const icons = group.querySelectorAll('svg')
    expect(icons).toHaveLength(2)
    for (const icon of icons) {
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('escolher outra opção chama onChange com o valor e a opção ativa não o chama', async () => {
    const user = userEvent.setup()
    const { onChange } = show()

    await user.click(segment('Presencial'))
    expect(onChange).not.toHaveBeenCalled()

    await user.click(segment('Online'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('desativado não deixa escolher', () => {
    show({ disabled: true })

    expect(segment('Presencial')).toBeDisabled()
    expect(segment('Online')).toBeDisabled()
  })
})
