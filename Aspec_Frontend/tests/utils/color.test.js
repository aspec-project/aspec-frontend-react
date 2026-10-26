import { describe, expect, it } from 'vitest'
import {
  hexToHsv,
  hexToRgb,
  hsToWheelPercent,
  hsvToHex,
  isHexColor,
  normalizeHexColor,
  rgbToHex,
  rgbToHsv,
  rotateHue,
  wheelPointToHs,
} from '../../src/utils/color'

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

describe('hexToRgb e rgbToHex', () => {
  it('converte entre hex e canais RGB', () => {
    expect(hexToRgb('#B65220')).toEqual({ r: 182, g: 82, b: 32 })
    expect(rgbToHex({ r: 182, g: 82, b: 32 })).toBe('#B65220')
  })

  it('devolve null para um hex inválido ou canais fora de 0–255 ou não inteiros', () => {
    expect(hexToRgb('red')).toBeNull()
    for (const r of [256, -1, 1.5, '182']) {
      expect(rgbToHex({ r, g: 82, b: 32 })).toBeNull()
    }
  })
})

describe('rgbToHsv, hsvToHex e hexToHsv', () => {
  it('converte RGB para matiz, saturação e valor', () => {
    const hsv = rgbToHsv({ r: 182, g: 82, b: 32 })

    expect(hsv.h).toBeCloseTo(20, 4)
    expect(hsv.s).toBeCloseTo(0.8242, 4)
    expect(hsv.v).toBeCloseTo(0.7137, 4)
  })

  it('um cinzento tem matiz 0 e saturação 0', () => {
    const hsv = rgbToHsv({ r: 128, g: 128, b: 128 })

    expect(hsv.h).toBe(0)
    expect(hsv.s).toBe(0)
    expect(hsv.v).toBeCloseTo(0.502, 3)
  })

  it('converte HSV para hex', () => {
    expect(hsvToHex({ h: 20, s: 0.8242, v: 0.7137 })).toBe('#B65220')
    expect(hsvToHex({ h: 0, s: 1, v: 0.7137 })).toBe('#B60000')
    expect(hsvToHex({ h: 90, s: 1, v: 0.7137 })).toBe('#5BB600')
    expect(hsvToHex({ h: 90, s: 0.5, v: 1 })).toBe('#BFFF80')
  })

  it('a ida e volta hex → HSV → hex devolve a mesma cor', () => {
    for (const color of ['#2E7D32', '#1565C0', '#C62828', '#00838F', '#8A7043', '#FFFFFF', '#000000']) {
      expect(hsvToHex(hexToHsv(color))).toBe(color)
    }
  })

  it('num cinzento mantém a matiz recebida', () => {
    expect(hexToHsv('#808080', 200).h).toBe(200)
  })

  it('roda a matiz mantendo a saturação e o valor', () => {
    expect(rotateHue('#B65220', 30)).toBe('#B69D20')
    expect(rotateHue('#B65220', 60)).toBe('#84B620')
  })
})

describe('wheelPointToHs', () => {
  it('converte um ponto relativo ao centro em matiz (vermelho em cima, sentido dos ponteiros) e saturação', () => {
    expect(wheelPointToHs(0, -100, 100)).toEqual({ h: 0, s: 1 })
    expect(wheelPointToHs(100, 0, 100)).toEqual({ h: 90, s: 1 })
    expect(wheelPointToHs(0, 100, 100).h).toBeCloseTo(180, 6)
    expect(wheelPointToHs(-50, 0, 100)).toEqual({ h: 270, s: 0.5 })
  })

  it('limita a saturação a 1 fora da roda e no centro não tem matiz', () => {
    expect(wheelPointToHs(0, 200, 100).s).toBe(1)
    expect(wheelPointToHs(0, 0, 100)).toEqual({ h: null, s: 0 })
  })
})

describe('hsToWheelPercent', () => {
  it('posiciona as cores na roda em percentagem do diâmetro, com 2 casas decimais', () => {
    expect(hsToWheelPercent(rgbToHsv(hexToRgb('#C62828')))).toEqual({ left: 50, top: 10.1 })
    expect(hsToWheelPercent(rgbToHsv(hexToRgb('#2E7D32')))).toEqual({ left: 76.49, top: 67.23 })
    expect(hsToWheelPercent(rgbToHsv(hexToRgb('#1565C0')))).toEqual({ left: 26.45, top: 87.79 })
    expect(hsToWheelPercent(rgbToHsv(hexToRgb('#B65220')))).toEqual({ left: 64.09, top: 11.28 })
  })

  it('sem saturação fica no centro', () => {
    expect(hsToWheelPercent({ h: 0, s: 0 })).toEqual({ left: 50, top: 50 })
  })
})
