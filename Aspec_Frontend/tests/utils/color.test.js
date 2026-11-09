import { describe, expect, it } from 'vitest'
import { hexToRgb, isHexColor, normalizeHexColor } from '../../src/utils/color'

describe('isHexColor', () => {
  it('aceita só cores #RRGGBB, em maiúsculas ou minúsculas', () => {
    expect(isHexColor('#8a7043')).toBe(true)
    expect(isHexColor('#8A7043')).toBe(true)
  })

  it('recusa formatos incompletos, nomes de cores, quebras de linha, CSS e valores que não são texto', () => {
    for (const value of ['8A7043', '#8A704', '#8A70433', 'red', '#8A7043\n', 'url(x)', null, 42]) {
      expect(isHexColor(value)).toBe(false)
    }
  })
})

describe('normalizeHexColor', () => {
  it('corta espaços, acrescenta o # e devolve em maiúsculas', () => {
    expect(normalizeHexColor(' #8a7043 ')).toBe('#8A7043')
    expect(normalizeHexColor('8a7043')).toBe('#8A7043')
  })

  it('devolve null para valores inválidos', () => {
    for (const value of ['#12', 'xyz', null]) {
      expect(normalizeHexColor(value)).toBeNull()
    }
  })
})

describe('hexToRgb', () => {
  it('converte uma cor hexadecimal nos canais RGB', () => {
    expect(hexToRgb('#B65220')).toEqual({ r: 182, g: 82, b: 32 })
  })

  it('devolve null para um hex inválido', () => {
    expect(hexToRgb('red')).toBeNull()
  })
})
