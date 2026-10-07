import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden min-h-[calc(100dvh_-_4rem_-_1px)] py-16 md:py-28 lg:py-36 flex items-center"
        style={{
          background:
            "linear-gradient(135deg, #0d1f35 0%, #060f1a 60%, #162c47 100%)",
        }}
      >
        {/* Imagem de Fundo */}
        <img
          src="https://images.unsplash.com/photo-1646066490241-d386dbb63539?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-10 pointer-events-none"
        />

        {/* Conteúdo Principal */}
        <div className="relative max-w-7xl mx-auto px-6 w-full z-10">
          <div className="max-w-3xl">
            <h1
              className="text-white mb-8"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 700,
                lineHeight: 1.15,
              }}
            >
              Networking com{" "}
              <span style={{ color: "#8a7043" }}>Propósito</span> e<br />
              <span style={{ color: "#8a7043" }}>Confiança</span>
            </h1>

            <p
              className="text-lg mb-10 max-w-xl"
              style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.7 }}
            >
              Mostrar o <strong>Caminho</strong> para uma{" "}
              <strong>Vida com Propósito e Significado</strong>, através de um
              relacionamento pessoal com <strong>Jesus Cristo</strong>.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/registo"
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium cursor-pointer transition-all hover:opacity-90 shadow-md"
                style={{ backgroundColor: "#8a7043", color: "#fff" }}
              >
                Candidatar-me a Membro <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
