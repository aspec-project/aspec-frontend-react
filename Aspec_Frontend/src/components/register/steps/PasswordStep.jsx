import Field from "../../ui/Field";
import { AlertCircle } from "lucide-react";

export default function AccessStep({ bind, errors, inputCls, formData, handleChange, passCriteria, PASSWORD_RULES }) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold mb-4" style={{ color: "#0d1f35" }}>
        5. Criar Acesso
      </h3>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Password *</label>
        <input type="password" {...bind("password")} placeholder="Mínimo 8 caracteres" className={inputCls} />
        <div className="mt-2 p-3 bg-white rounded-xl border text-xs space-y-1" style={{ borderColor: "#d4d8e3" }}>
          <p className="font-medium text-gray-600 mb-1">A password deve conter no mínimo:</p>
          <div className="grid grid-cols-2 gap-1 text-gray-400">
            {PASSWORD_RULES.map(([key, text]) => (
              <span key={key} className={passCriteria[key] ? "text-green-600 font-medium" : ""}>
                {passCriteria[key] ? "✓" : "•"} {text}
              </span>
            ))}
          </div>
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
      </div>

      <Field label="Confirmar password *" error={errors.password_confirmation}>
        <input type="password" {...bind("password_confirmation")} placeholder="Repetir a password" className={inputCls} />
      </Field>

      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{
          backgroundColor: "#f5f3ee",
          border: errors.acceptTerms ? "1px solid #ef4444" : "1px solid #d4d8e3",
        }}
      >
        <input
          type="checkbox"
          id="acceptTerms"
          name="acceptTerms"
          checked={formData.acceptTerms}
          onChange={handleChange}
          className="mt-0.5 cursor-pointer"
        />
        <label htmlFor="acceptTerms" className="text-xs text-gray-600 cursor-pointer leading-relaxed">
          Concordo com os <span className="underline" style={{ color: "#0d1f35" }}>Termos e Condições</span> e o{" "}
          <span className="underline" style={{ color: "#0d1f35" }}>Código de Conduta</span> da ASPEC, 
          comprometendo-me a agir com integridade e princípios cristãos nas minhas relações dentro da associação.
        </label>
      </div>
      {errors.acceptTerms && (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle size={13} />
          <span>{errors.acceptTerms}</span>
        </div>
      )}
    </div>
  );
}