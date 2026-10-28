import Field from "../../ui/Field";
import InternationalPhoneInput from '../../ui/InternationalPhoneInput'

export default function BusinessInfoStep({
  bind,
  errors,
  inputCls,
  sectors,
  listsLoading,
  listsError,
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
        2. Informação do Negócio
      </h3>

      <Field label="Nome do Negócio / Empresa *" error={errors.business_name}>
        <input
          type="text"
          {...bind("business_name")}
          maxLength={255}
          placeholder="Ex: Construções Silva & Filhos"
          className={inputCls}
        />
      </Field>

      <Field label="Setor de Atividade *" error={errors.sector_id || listsError}>
        <select
          {...bind("sector_id")}
          disabled={listsLoading || !!listsError}
          className={`${inputCls} bg-white`}
        >
          <option value="">
            {listsLoading ? "A carregar..." : "Selecionar setor..."}
          </option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="border-t pt-4" style={{ borderColor: "#e5e7eb" }}>
        <p className="text-sm font-semibold" style={{ color: "#0d1f35" }}>
          Contactos comerciais
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Estes contactos serão apresentados no perfil comercial.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Email comercial *" error={errors.commercial_email}>
            <input
              type="email"
              {...bind("commercial_email")}
              maxLength={255}
              placeholder="geral@empresa.pt"
              className={inputCls}
            />
          </Field>

          <Field label="Telefone comercial *" error={errors.commercial_phone}>
            <InternationalPhoneInput
              id="commercial_phone"
              {...bind("commercial_phone")}
              placeholder="912 345 678"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <Field label="Descrição breve do negócio" error={errors.description}>
        <textarea
          {...bind("description")}
          maxLength={1000}
          rows={3}
          placeholder="Descreve brevemente os teus produtos/serviços..."
          className={`${inputCls} resize-none`}
        />
      </Field>

      <Field label="Website" error={errors.website_url}>
        <input
          type="url"
          {...bind("website_url")}
          maxLength={255}
          placeholder="www.meusite.pt"
          className={inputCls}
        />
      </Field>
    </div>
  );
}
