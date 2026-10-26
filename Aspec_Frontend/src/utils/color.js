/**
 * Indica se um valor é uma cor no formato #RRGGBB (maiúsculas ou minúsculas).
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
export function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

/**
 * Normaliza uma cor escrita pelo utilizador: corta os espaços, acrescenta o # quando vêm só os 6 dígitos e
 * devolve em maiúsculas.
 *
 * @param {unknown} value Texto escrito (ex.: " 8a7043 ").
 * @returns {string|null} Cor #RRGGBB em maiúsculas, ou null se não for válida.
 */
export function normalizeHexColor(value) {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  const withHash = /^[0-9A-Fa-f]{6}$/.test(trimmed) ? `#${trimmed}` : trimmed

  return isHexColor(withHash) ? withHash.toUpperCase() : null
}

/**
 * Indica se um valor é um canal RGB válido (inteiro de 0 a 255).
 *
 * @param {unknown} value Valor a verificar.
 * @returns {boolean}
 */
export function isRgbChannel(value) {
  return Number.isInteger(value) && value >= 0 && value <= 255
}

/**
 * Converte uma cor #RRGGBB nos três canais RGB.
 *
 * @param {unknown} hex Cor #RRGGBB.
 * @returns {{r: number, g: number, b: number}|null} Canais de 0 a 255, ou null se a cor for inválida.
 */
export function hexToRgb(hex) {
  if (!isHexColor(hex)) return null

  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

/**
 * Converte três canais RGB numa cor #RRGGBB em maiúsculas.
 *
 * @param {{r: unknown, g: unknown, b: unknown}} rgb Canais de 0 a 255.
 * @returns {string|null} Cor #RRGGBB, ou null se algum canal não for um inteiro de 0 a 255.
 */
export function rgbToHex({ r, g, b }) {
  if (![r, g, b].every(isRgbChannel)) return null

  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

/**
 * Converte RGB em HSV (matiz 0–360, saturação e valor 0–1). Os cinzentos têm matiz 0 e saturação 0.
 *
 * @param {{r: number, g: number, b: number}} rgb Canais de 0 a 255.
 * @returns {{h: number, s: number, v: number}}
 */
export function rgbToHsv({ r, g, b }) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : delta / max,
    v: max / 255,
  }
}

/**
 * Converte HSV em RGB, com os canais arredondados a inteiros.
 *
 * @param {{h: number, s: number, v: number}} hsv Matiz 0–360, saturação e valor 0–1.
 * @returns {{r: number, g: number, b: number}}
 */
export function hsvToRgb({ h, s, v }) {
  const hue = ((h % 360) + 360) % 360
  const chroma = v * s
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = v - chroma
  const sectors = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ]
  const [r, g, b] = sectors[Math.floor(hue / 60) % 6]

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

/**
 * Converte HSV numa cor #RRGGBB em maiúsculas.
 *
 * @param {{h: number, s: number, v: number}} hsv Matiz 0–360, saturação e valor 0–1.
 * @returns {string}
 */
export function hsvToHex(hsv) {
  return rgbToHex(hsvToRgb(hsv))
}

/**
 * Converte uma cor #RRGGBB em HSV. Quando a saturação ou o valor são 0 (cinzentos e preto) a cor não tem matiz,
 * por isso usa a matiz recebida: assim a pega da roda não salta para o vermelho.
 *
 * @param {string} hex Cor #RRGGBB válida.
 * @param {number} [fallbackHue=0] Matiz a manter quando a cor não tem matiz.
 * @returns {{h: number, s: number, v: number}}
 */
export function hexToHsv(hex, fallbackHue = 0) {
  const hsv = rgbToHsv(hexToRgb(hex))

  return hsv.s === 0 || hsv.v === 0 ? { ...hsv, h: fallbackHue } : hsv
}

/**
 * Converte um ponto da roda de cores (relativo ao centro, x para a direita e y para baixo) em matiz e
 * saturação. O vermelho (0°) fica em cima e a matiz cresce no sentido dos ponteiros do relógio.
 *
 * @param {number} x Distância horizontal ao centro, em píxeis.
 * @param {number} y Distância vertical ao centro, em píxeis.
 * @param {number} radius Raio da roda, em píxeis.
 * @returns {{h: number|null, s: number}} Matiz 0–360 (null no centro exato) e saturação 0–1.
 */
export function wheelPointToHs(x, y, radius) {
  const distance = Math.sqrt(x * x + y * y)

  if (distance === 0) return { h: null, s: 0 }

  const degrees = (Math.atan2(x, -y) * 180) / Math.PI

  return {
    h: ((degrees % 360) + 360) % 360,
    s: Math.min(1, distance / radius),
  }
}

/**
 * Posição de uma matiz/saturação na roda, em percentagem do diâmetro (para `left`/`top`), com 2 casas decimais.
 *
 * @param {{h: number|null, s: number}} hs Matiz 0–360 e saturação 0–1.
 * @returns {{left: number, top: number}}
 */
export function hsToWheelPercent({ h, s }) {
  const radians = ((h ?? 0) * Math.PI) / 180
  const round = (value) => Math.round(value * 100) / 100

  return {
    left: round(50 + 50 * s * Math.sin(radians)),
    top: round(50 - 50 * s * Math.cos(radians)),
  }
}

/**
 * Roda a matiz de uma cor mantendo a saturação e o valor.
 *
 * @param {string} hex Cor #RRGGBB válida.
 * @param {number} degrees Graus a somar à matiz.
 * @returns {string} Nova cor #RRGGBB.
 */
export function rotateHue(hex, degrees) {
  const hsv = hexToHsv(hex)

  return hsvToHex({ ...hsv, h: (hsv.h + degrees) % 360 })
}
