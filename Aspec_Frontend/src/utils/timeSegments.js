import { parseTime } from './adminEventForm'

/** Caixas vazias. */
export const EMPTY_SEGMENTS = { hours: '', minutes: '' }

/** Máximo de cada caixa. */
export const SEGMENT_MAX = { hours: 23, minutes: 59 }

const SEPARATORS = [':', '.', ',']

/**
 * Escreve um número com dois dígitos (ex.: 5 → "05").
 *
 * @param {number} number Número de 0 a 59.
 * @returns {string}
 */
function pad(number) {
  return String(number).padStart(2, '0')
}

/**
 * Separa uma hora "HH:MM" nas duas caixas.
 *
 * @param {unknown} value Hora do formulário.
 * @returns {{hours: string, minutes: string}} Caixas com dois dígitos, ou vazias se a hora não for válida.
 */
export function splitTime(value) {
  const time = parseTime(value)

  if (!time) return { ...EMPTY_SEGMENTS }

  const [hours, minutes] = time.split(':')

  return { hours, minutes }
}

/**
 * Junta as duas caixas numa hora.
 *
 * @param {{hours: string, minutes: string}} segments Caixas.
 * @returns {string} "HH:MM" ou '' se faltar alguma caixa.
 */
export function joinTime(segments) {
  return segments.hours && segments.minutes ? `${segments.hours}:${segments.minutes}` : ''
}

/**
 * Aplica um dígito escrito numa caixa. O 1.º dígito fica logo na caixa com um zero à frente; se ainda
 * puder haver um 2.º dígito (0–2 nas horas, 0–5 nos minutos), a caixa fica à espera dele. Um 2.º dígito
 * que passe do máximo conta como um 1.º dígito novo (ex.: "2" e "5" nas horas dão 05). Nas horas, quando
 * a caixa fica completa, passa-se para os minutos.
 *
 * @param {string} current Valor atual da caixa ('' ou dois dígitos).
 * @param {'hours'|'minutes'} segment Caixa.
 * @param {boolean} pending Se a caixa espera o 2.º dígito.
 * @param {string} digit Dígito escrito ('0'–'9').
 * @returns {{value: string, pending: boolean, advance: boolean}} Novo valor, se espera outro dígito e se passa para os minutos.
 */
export function typeDigit(current, segment, pending, digit) {
  const max = SEGMENT_MAX[segment]
  const number = Number(digit)

  if (pending && current !== '') {
    const combined = Number(current) * 10 + number

    if (combined <= max) {
      return { value: pad(combined), pending: false, advance: segment === 'hours' }
    }
  }

  const waits = number <= Math.floor(max / 10)

  return { value: pad(number), pending: waits, advance: !waits && segment === 'hours' }
}

/**
 * Aplica um texto (colado ou de um teclado de telemóvel) a partir de uma caixa, carácter a carácter, com
 * as regras de `typeDigit`. Um separador (":", "." ou ",") nas horas preenchidas passa para os minutos;
 * os outros caracteres são ignorados.
 *
 * @param {{hours: string, minutes: string}} segments Caixas atuais.
 * @param {'hours'|'minutes'} segment Caixa onde começa.
 * @param {boolean} pending Se a caixa onde começa espera o 2.º dígito.
 * @param {string} text Texto escrito ou colado.
 * @returns {{segments: {hours: string, minutes: string}, segment: 'hours'|'minutes', pending: boolean}} Caixas, caixa onde acaba e estado de espera.
 */
export function typeText(segments, segment, pending, text) {
  let next = segments
  let current = segment
  let waiting = pending

  for (const character of String(text)) {
    if (/^\d$/.test(character)) {
      const result = typeDigit(next[current], current, waiting, character)

      next = { ...next, [current]: result.value }
      waiting = result.pending

      if (result.advance) {
        current = 'minutes'
      }
    } else if (SEPARATORS.includes(character) && current === 'hours' && next.hours !== '') {
      current = 'minutes'
      waiting = false
    }
  }

  return { segments: next, segment: current, pending: waiting }
}

/**
 * Soma ou subtrai 1 a uma caixa, com volta (23 → 00 e 00 → 23 nas horas; 59 → 00 e 00 → 59 nos minutos).
 * Uma caixa vazia começa no mínimo (↑) ou no máximo (↓).
 *
 * @param {string} current Valor atual da caixa ('' ou dois dígitos).
 * @param {'hours'|'minutes'} segment Caixa.
 * @param {1|-1} delta Passo.
 * @returns {string} Dois dígitos.
 */
export function stepSegment(current, segment, delta) {
  const max = SEGMENT_MAX[segment]

  if (current === '') return pad(delta > 0 ? 0 : max)

  return pad((Number(current) + delta + max + 1) % (max + 1))
}
