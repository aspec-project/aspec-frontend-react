import { hexToRgb, isHexColor, normalizeHexColor, rotateHue } from './color'

/** Número máximo de caracteres do nome de um tipo de evento (igual ao backend). */
export const CATEGORY_NAME_MAX_LENGTH = 30

/** Cor inicial de um tipo novo (a do print do design); se já estiver usada, roda-se a matiz. */
export const DEFAULT_CATEGORY_COLOR = '#B65220'

/** Textos da página e dos diálogos de tipos de evento. */
export const EVENT_CATEGORY_TEXTS = {
  pageTitle: 'Tipos de Evento',
  subtitle: 'Só é possível apagar tipos que não estejam ligados a nenhum evento.',
  newButton: 'Novo tipo',
  tableCaption: 'Tipos de evento',
  loading: 'A carregar tipos de evento...',
  empty: 'Ainda não há tipos de evento.',
  loadError: 'Não foi possível carregar os tipos de evento. Tente novamente.',
  retry: 'Tentar novamente',
  createTitle: 'Novo tipo de evento',
  editTitle: 'Editar tipo de evento',
  nameLabel: 'Nome',
  namePlaceholder: 'Ex.: Retiro anual',
  colorLabel: 'Cor',
  wheelLabel: 'Roda de cores',
  lightnessLabel: 'Luminosidade',
  hexLabel: 'Hexadecimal',
  rgbLabel: 'RGB',
  redLabel: 'Vermelho (R)',
  greenLabel: 'Verde (G)',
  blueLabel: 'Azul (B)',
  rgbError: 'Os valores RGB têm de ser números inteiros entre 0 e 255.',
  usedColorsHint: 'As cores já usadas estão assinaladas na roda com uma cruz.',
  previewLabel: 'Pré-visualização',
  previewPlaceholder: 'Nome do tipo',
  createSubmit: 'Criar tipo',
  createPending: 'A criar...',
  editSubmit: 'Guardar alterações',
  editPending: 'A guardar...',
  noChanges: 'Ainda não fez nenhuma alteração.',
  cancel: 'Cancelar',
  close: 'Fechar',
  notFound: 'Este tipo de evento já não existe. A lista foi atualizada.',
  deleteTitle: 'Apagar tipo de evento?',
  deleteConfirm: 'Apagar',
}

const FALLBACK_COLOR = '#0D1F35'

const VALIDATION_MESSAGES = {
  nameRequired: 'O campo nome é obrigatório.',
  nameMax: `O campo nome não pode ter mais de ${CATEGORY_NAME_MAX_LENGTH} caracteres.`,
  nameTaken: 'Já existe uma categoria com este nome.',
  colorRequired: 'O campo cor é obrigatório.',
  colorFormat: 'A cor tem de estar no formato #RRGGBB (ex.: #8A7043).',
  colorTaken: 'Já existe uma categoria com esta cor.',
}

/**
 * Converte canais RGB numa cor #RRGGBB em maiúsculas (os canais já vêm arredondados).
 *
 * @param {number[]} channels Canais de 0 a 255.
 * @returns {string}
 */
function channelsToHex(channels) {
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

/**
 * Cores do badge tingido de um tipo: fundo = a cor misturada com 88 % de branco; texto = cada canal × 0,45.
 * Uma cor inválida (que nunca chega a um `style`) passa a azul-marinho.
 *
 * @param {unknown} color Cor do tipo vinda da API.
 * @returns {{color: string, background: string, text: string}} Cor base, fundo e texto, em #RRGGBB.
 */
export function getCategoryBadgeColors(color) {
  const base = isHexColor(color) ? color.toUpperCase() : FALLBACK_COLOR
  const { r, g, b } = hexToRgb(base)
  const channels = [r, g, b]

  return {
    color: base,
    background: channelsToHex(channels.map((channel) => Math.round(channel + (255 - channel) * 0.88))),
    text: channelsToHex(channels.map((channel) => Math.round(channel * 0.45))),
  }
}

/**
 * Número de eventos de um tipo como "1 evento" / "7 eventos".
 *
 * @param {unknown} count Número de eventos.
 * @returns {string} Texto, ou "—" se não for um inteiro maior ou igual a zero.
 */
export function formatEventsCount(count) {
  if (!Number.isInteger(count) || count < 0) return '—'

  return count === 1 ? '1 evento' : `${count} eventos`
}

/**
 * Só se pode apagar um tipo sem eventos (o backend responde 409 nos outros casos).
 *
 * @param {{events_count: unknown}} category Tipo de evento.
 * @returns {boolean}
 */
export function canDeleteCategory(category) {
  return category.events_count === 0
}

/**
 * @param {string} name Nome do tipo.
 * @returns {string} Nome acessível do botão de editar.
 */
export function getEditLabel(name) {
  return `Editar ${name}`
}

/**
 * @param {string} name Nome do tipo.
 * @returns {string} Nome acessível do botão de apagar.
 */
export function getDeleteLabel(name) {
  return `Apagar ${name}`
}

/**
 * Explicação do cadeado de um tipo que não se pode apagar, com o número de eventos quando é conhecido.
 *
 * @param {{name: string, events_count: unknown}} category Tipo de evento.
 * @returns {string}
 */
export function getLockedLabel(category) {
  const count = category.events_count

  return Number.isInteger(count) && count > 0
    ? `Não é possível apagar «${category.name}»: está ligado a ${formatEventsCount(count)}.`
    : `Não é possível apagar «${category.name}».`
}

/**
 * @param {string} name Nome do tipo.
 * @returns {string} Descrição do diálogo de apagar.
 */
export function getDeleteCategoryDescription(name) {
  return `O tipo «${name}» vai ser apagado. Esta ação não pode ser desfeita.`
}

/**
 * Cores já usadas pelos outros tipos (para as marcas na roda). Os tipos com cor inválida não entram.
 *
 * @param {object[]} categories Tipos de evento.
 * @param {string} [exceptId] Id do tipo a ignorar (o que está a ser editado).
 * @returns {{id: string, name: string, color: string}[]} Cores em maiúsculas.
 */
export function getUsedColors(categories, exceptId) {
  return categories
    .filter((category) => category.id !== exceptId && isHexColor(category.color))
    .map(({ id, name, color }) => ({ id, name, color: color.toUpperCase() }))
}

/**
 * Procura outro tipo com a mesma cor, sem distinguir maiúsculas (é a regra do backend).
 *
 * @param {string} color Cor a procurar.
 * @param {object[]} categories Tipos de evento.
 * @param {string} [exceptId] Id do tipo a ignorar (o que está a ser editado).
 * @returns {object|null} O tipo com essa cor, ou null.
 */
export function findCategoryWithColor(color, categories, exceptId) {
  const target = typeof color === 'string' ? color.toUpperCase() : ''

  return categories.find((category) => category.id !== exceptId
    && typeof category.color === 'string'
    && category.color.toUpperCase() === target) ?? null
}

/**
 * Cor inicial de um tipo novo: a do design; se já estiver usada, roda a matiz 30° de cada vez (até 11 vezes)
 * até encontrar uma livre. Se estiverem todas usadas, fica a do design (e aparece o erro de cor repetida).
 *
 * @param {object[]} categories Tipos de evento existentes.
 * @returns {string} Cor #RRGGBB.
 */
export function getDefaultCategoryColor(categories) {
  for (let step = 0; step < 12; step += 1) {
    const candidate = step === 0 ? DEFAULT_CATEGORY_COLOR : rotateHue(DEFAULT_CATEGORY_COLOR, step * 30)

    if (!findCategoryWithColor(candidate, categories)) return candidate
  }

  return DEFAULT_CATEGORY_COLOR
}

/**
 * @param {string} color Cor usada.
 * @param {string} name Nome do tipo que a usa.
 * @returns {string} Nome acessível da marca da cor na roda.
 */
export function getUsedColorLabel(color, name) {
  return `${color}, já usada por «${name}»`
}

/**
 * Validação no browser (só UX) com as mesmas regras e frases do backend: nome obrigatório, até 30 caracteres
 * e único sem distinguir maiúsculas; cor obrigatória, #RRGGBB e diferente da dos outros tipos.
 *
 * @param {{name: unknown, color: unknown}} values Valores do formulário.
 * @param {object[]} categories Tipos de evento existentes.
 * @param {string} [exceptId] Id do tipo a ignorar (o que está a ser editado).
 * @returns {{name?: string, color?: string}} Erros por campo (vazio quando está tudo certo).
 */
export function validateEventCategory({ name, color }, categories, exceptId) {
  const errors = {}
  const trimmed = typeof name === 'string' ? name.trim() : ''
  const lower = trimmed.toLocaleLowerCase('pt-PT')

  if (trimmed === '') {
    errors.name = VALIDATION_MESSAGES.nameRequired
  } else if (Array.from(trimmed).length > CATEGORY_NAME_MAX_LENGTH) {
    errors.name = VALIDATION_MESSAGES.nameMax
  } else if (categories.some((category) => category.id !== exceptId
    && typeof category.name === 'string'
    && category.name.trim().toLocaleLowerCase('pt-PT') === lower)) {
    errors.name = VALIDATION_MESSAGES.nameTaken
  }

  const normalized = normalizeHexColor(color)

  if (typeof color !== 'string' || color.trim() === '') {
    errors.color = VALIDATION_MESSAGES.colorRequired
  } else if (normalized === null) {
    errors.color = VALIDATION_MESSAGES.colorFormat
  } else if (findCategoryWithColor(normalized, categories, exceptId)) {
    errors.color = VALIDATION_MESSAGES.colorTaken
  }

  return errors
}
