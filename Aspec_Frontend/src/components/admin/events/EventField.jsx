/**
 * Moldura acessível de um campo do formulário de evento: label ligada ao controlo, asterisco nos
 * obrigatórios, hint, contador e erro. Quem chama passa ao controlo o `aria-describedby` (ids
 * `{id}-hint`, `{id}-counter` e `{id}-error`) e o `aria-invalid`.
 *
 * @param {{
 *   id: string,
 *   label: string,
 *   required?: boolean,
 *   hint?: string,
 *   error?: string,
 *   counter?: string,
 *   children: import('react').ReactNode,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventField({ id, label, required = false, hint, error, counter, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span aria-hidden="true" className="text-red-600"> *</span>}
      </label>
      {children}
      {(hint || counter) && (
        <div className="mt-1 flex items-start justify-between gap-3 text-xs text-gray-500">
          {hint && <p id={`${id}-hint`}>{hint}</p>}
          {counter && <p id={`${id}-counter`} className="ml-auto shrink-0">{counter}</p>}
        </div>
      )}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}
