import Field from "../../ui/Field";

export default function PersonalInfoStep({ bind, errors, inputCls }) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
        1. Dados Pessoais
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Primeiro nome *" error={errors.firstName}>
          <input type="text" {...bind("firstName")} maxLength={120} placeholder="João" className={inputCls} />
        </Field>
        <Field label="Apelido *" error={errors.lastName}>
          <input type="text" {...bind("lastName")} maxLength={120} placeholder="Silva" className={inputCls} />
        </Field>
      </div>
      <Field label="Email *" error={errors.email}>
        <input type="email" {...bind("email")} maxLength={255} placeholder="joao.silva@email.pt" className={inputCls} />
      </Field>
      <Field label="Contacto telefónico *" error={errors.phone}>
        <input type="tel" {...bind("phone")} maxLength={20} placeholder="+351 9xx xxx xxx" className={inputCls} />
      </Field>
    </div>
  );
}