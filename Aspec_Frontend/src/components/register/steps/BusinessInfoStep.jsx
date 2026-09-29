import Field from "../../ui/Field";

export default function BusinessInfoStep({ bind, errors, inputCls, sectors, listsLoading, listsError }) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
        2. Informação do Negócio
      </h3>
      <Field label="Nome do Negócio / Empresa *" error={errors.business_name}>
        <input type="text" {...bind("business_name")} maxLength={255} placeholder="Ex: Construções Silva & Filhos" className={inputCls} />
      </Field>
      <Field label="Setor de Atividade *" error={errors.sector_id || listsError}>
        <select {...bind("sector_id")} disabled={listsLoading || !!listsError} className={`${inputCls} bg-white`}>
          <option value="">{listsLoading ? "A carregar..." : "Selecionar setor..."}</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Descrição breve do negócio" error={errors.description}>
        <textarea {...bind("description")} maxLength={1000} rows={3} placeholder="Descreve brevemente os teus produtos/serviços..." className={`${inputCls} resize-none`} />
      </Field>
      <Field label="Website (opcional)" error={errors.website_url}>
        <input type="url" {...bind("website_url")} maxLength={255} placeholder="https://www.meusite.pt" className={inputCls} />
      </Field>
    </div>
  );
}