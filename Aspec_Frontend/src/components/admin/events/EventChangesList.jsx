/**
 * Lista das alterações de um evento no diálogo de confirmação: "Campo: antigo → novo", com o valor antigo
 * riscado. Os valores aparecem sempre como texto (nunca como HTML nem como ligação) e a seta é anunciada
 * aos leitores de ecrã como "passa a".
 *
 * @param {{changes: {field: string, label: string, before: string, after: string}[]}} props
 * @returns {JSX.Element}
 */
export default function EventChangesList({ changes }) {
  return (
    <ul aria-label="Alterações" className="space-y-1 rounded-lg bg-[#f5f3ee] px-4 py-3 text-sm">
      {changes.map((change) => (
        <li key={change.field} className="break-words">
          <span className="text-gray-500">{change.label}:</span>{' '}
          <del className="text-gray-400">{change.before}</del>{' '}
          <span aria-hidden="true">→</span>{' '}
          <span className="sr-only">passa a</span>{' '}
          <span className="text-[#0d1f35]">{change.after}</span>
        </li>
      ))}
    </ul>
  )
}
