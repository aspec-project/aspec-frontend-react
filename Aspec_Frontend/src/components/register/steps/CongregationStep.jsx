import Field from "../../ui/Field";

export default function CongregationStep({ bind, errors, inputCls }) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
        4. Informação da Congregação
      </h3>
      <Field label="Nome da Igreja / Congregação *" error={errors.congregation}>
        <input type="text" {...bind("congregation")} maxLength={255} placeholder="Ex: Igreja Evangélica da Graça / Comunidade Cristã de Lisboa" className={inputCls} />
      </Field>
      <Field label="Cargo / Função na Igreja *" error={errors.role_in_congregation}>
        <input type="text" {...bind("role_in_congregation")} maxLength={255} placeholder="Ex: Membro, Diácono, Líder de Jovens, Pastor, Voluntário" className={inputCls} />
      </Field>
      <div className="rounded-xl p-4 text-sm mt-2" style={{ backgroundColor: "#f5f3ee", border: "1px solid #d4d8e3" }}>
        <p className="font-medium mb-1" style={{ color: "#0d1f35" }}>Aprovação da candidatura</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          A ASPEC valoriza o testemunho local. Estas informações servem para
          garantir a autenticidade e ligação à comunidade cristã.
        </p>
      </div>
    </div>
  );
}