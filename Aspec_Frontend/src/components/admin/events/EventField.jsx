/**
 * Moldura acessível de um campo do formulário de evento: label ligada ao controlo, asterisco nos
 * obrigatórios, hint, contador e erro. Quem chama passa ao controlo o `aria-describedby` (ids
 * `{id}-hint`, `{id}-counter` e `{id}-error`) e o `aria-invalid`. Com `labelId`, a label ganha esse id,
 * para os controlos próprios (SelectMenu, DatePicker) se ligarem a ela por `aria-labelledby`. O
 * `labelSuffix` opcional aparece dentro da label, depois do asterisco (ex.: "(inclusive)").
 *
 * @param {{
 *   id: string,
 *   label: string,
 *   labelId?: string,
 *   required?: boolean,
 *   labelSuffix?: import('react').ReactNode,
 *   hint?: string,
 *   error?: string,
 *   counter?: string,
 *   children: import('react').ReactNode,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventField({ id, label, labelId, required = false, labelSuffix, hint, error, counter, children }) {
  return (
    <div>
      <label id={labelId} htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">
        {label}
        {required && <span aria-hidden="true" className="text-red-600"> *</span>}
        {labelSuffix}
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
