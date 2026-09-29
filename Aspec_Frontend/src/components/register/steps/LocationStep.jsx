import Field from "../../ui/Field";

export default function LocationStep({ bind, errors, inputCls, locations, listsLoading, listsError }) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
        3. Localização e Núcleo Regional
      </h3>
      <Field label="Núcleo Regional / Delegação *" error={errors.location_id || listsError}>
        <select {...bind("location_id")} disabled={listsLoading || !!listsError} className={`${inputCls} bg-white`}>
          <option value="">{listsLoading ? "A carregar..." : "Selecionar núcleo..."}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Morada *" error={errors.address}>
        <input type="text" {...bind("address")} maxLength={255} placeholder="Ex: Rua das Flores, 11 - 3.º Esquerdo" className={inputCls} />
      </Field>
    </div>
  );
}