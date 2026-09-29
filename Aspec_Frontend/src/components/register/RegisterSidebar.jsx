import { CheckCircle } from "lucide-react";
import logoImg from "../../../public/images/log-branco.png";

export default function RegisterSidebar({ onNavigateHome }) {
  const benefits = [
    "Perfil profissional verificado",
    "Diretório de confiança nacional",
    "Eventos de networking exclusivos",
    "Avaliações entre membros",
  ];

  return (
    <div
      className="w-5/12 flex flex-col justify-between p-12 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0d1f35 0%, #060f1a 100%)" }}
    >
      <div className="relative z-10">
        <button type="button" onClick={onNavigateHome} className="cursor-pointer">
          <img src={logoImg} alt="ASPEC" className="h-10 w-70 object-contain" />
        </button>
      </div>

      <div className="relative z-10">
        <h2 className="text-white mb-4 font-bold" style={{ fontSize: "1.6rem" }}>
          Junte-se à rede de confiança ASPEC
        </h2>
        <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
          Ao tornar-se membro, ganha acesso ao diretório completo, pode participar em
          eventos exclusivos e fazer parte de uma comunidade de profissionais cristãos
          comprometidos com a excelência.
        </p>
        <div className="space-y-3">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              <CheckCircle size={14} style={{ color: "#8a7043" }} /> {b}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        A sua candidatura será revista por um administrador antes da aprovação.
      </div>
    </div>
  );
}