/** Rótulos neutros dos motivos de sinalização, para a área de membro e para a moderação. */
export const REVIEW_REPORT_REASON_LABELS = {
  offensive_or_disrespectful_content: 'Conteúdo ofensivo ou desrespeitoso',
  false_or_unsubstantiated_claims: 'Afirmações falsas ou sem fundamento',
  no_business_relationship: 'Sem relação comercial entre as partes',
  spam_or_advertising: 'Spam ou publicidade',
  other: 'Outro motivo',
  language_filter: 'Linguagem imprópria (deteção automática)',
}

/** Rótulo de um motivo desconhecido na moderação (o admin precisa de saber que não foi identificado). */
export const UNKNOWN_REVIEW_REASON_LABEL = 'Motivo não identificado'

const SOURCE_LABELS = { automatic: 'Automática', member: 'Membro' }

export const ASPEC_CONTACT_EMAIL = 'aspec@aspec.pt'

/**
 * Rótulo de um motivo de sinalização.
 *
 * @param {string} code Código vindo da API.
 * @param {string} [fallback] Rótulo a usar quando o código é desconhecido.
 * @returns {string}
 */
export function getReviewReasonLabel(code, fallback = REVIEW_REPORT_REASON_LABELS.other) {
  return Object.hasOwn(REVIEW_REPORT_REASON_LABELS, code) ? REVIEW_REPORT_REASON_LABELS[code] : fallback
}

/**
 * Origem de um report na moderação.
 *
 * @param {string} source `automatic` ou `member`.
 * @returns {string}
 */
export function getReviewReportSourceLabel(source) {
  return SOURCE_LABELS[source] ?? source
}

/**
 * Textos do modal de justificação de uma avaliação oculta ou sinalizada.
 *
 * @param {{status: string, hidden_reason: string|null, flagging_reasons?: string[]}} review Avaliação.
 * @returns {{
 *   tooltip: string,
 *   title: string,
 *   reason?: string,
 *   labels?: string[],
 *   footerBefore: string,
 *   footerAfter: string,
 * }|null} Textos do modal, ou null quando não há motivo para mostrar.
 */
export function getReviewJustification(review) {
  if (review.status === 'Hidden' && typeof review.hidden_reason === 'string' && review.hidden_reason.trim() !== '') {
    return {
      tooltip: 'Ver justificação',
      title: 'Justificação da ocultação',
      reason: review.hidden_reason,
      footerBefore: 'Se pretender contestar esta decisão, envie um email para ',
      footerAfter: '.',
    }
  }

  if (review.status === 'Flagged' && (review.flagging_reasons ?? []).length > 0) {
    return {
      tooltip: 'Ver motivo',
      title: 'Motivo da sinalização',
      labels: [...new Set(review.flagging_reasons.map((code) => getReviewReasonLabel(code)))],
      footerBefore: 'Esta avaliação aguarda a análise da administração ASPEC. Para mais informações, envie um email para ',
      footerAfter: '.',
    }
  }

  return null
}
