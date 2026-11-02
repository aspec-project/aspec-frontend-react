/**
 * Interruptor acessível (ligado/desligado): um botão nativo com `role="switch"` e `aria-checked`. O nome
 * acessível vem sempre de um elemento visível (`labelledBy`) e não muda com o estado; o estado é só o
 * `aria-checked`. Por ser um `<button type="button">`, o Espaço e o Enter funcionam sem código extra, não
 * submete o formulário e fica desativado dentro de um `fieldset` desativado.
 *
 * @param {{
 *   id?: string,
 *   name?: string,
 *   checked: boolean,
 *   onChange: (next: boolean) => void,
 *   labelledBy: string,
 *   describedBy?: string,
 *   disabled?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
export default function Switch({ id, name, checked, onChange, labelledBy, describedBy, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      name={name}
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-[#8a7043]' : 'bg-gray-300'}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}
