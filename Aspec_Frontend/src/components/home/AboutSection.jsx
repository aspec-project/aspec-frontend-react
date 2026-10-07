import {
  ShieldCheck,
  HandHeart,
  Award,
  TrendingUp,
  BookOpen,
  Users,
  Target,
} from "lucide-react";

const VALUES = [
  {
    Icon: ShieldCheck,
    title: "Fé e Integridade",
    desc: "Agimos com honestidade, guiados pelos princípios cristãos em todos os negócios.",
  },
  {
    Icon: HandHeart,
    title: "Comunidade",
    desc: "Construímos uma rede de confiança mútua entre profissionais e empresários.",
  },
  {
    Icon: Award,
    title: "Excelência",
    desc: "Promovemos a excelência profissional como expressão da nossa vocação.",
  },
  {
    Icon: TrendingUp,
    title: "Crescimento",
    desc: "Apoiamo-nos mutuamente no crescimento pessoal, espiritual e empresarial.",
  },
];

export default function AboutSection() {
  return (
    <section className="bg-white scroll-mt-20" id="sobre">
      
      {/* Sobre a ASPEC */}
      <div className="py-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: "#8a7043" }}
              >
                Quem Somos
              </div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: "#0d1f35" }}>
                Sobre a ASPEC
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                A <strong>ASPEC — Associação de Profissionais, Empreendedores e Empresários Cristãos de Portugal</strong> é uma rede nacional que reúne pessoas de fé comprometidas com a excelência nas suas áreas profissionais.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Fundada com o propósito de unir cristãos no mundo dos negócios, a ASPEC está presente em <strong>18 delegações</strong> por todo o país, reunindo mais de <strong>320 membros ativos</strong> em sectores tão diversos como a tecnologia, saúde, direito, construção e comércio.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Mais do que uma associação profissional, somos uma <strong>comunidade de confiança</strong> — um espaço onde a fé e o trabalho caminham lado a lado.
              </p>
            </div>

            {/* Estatísticas + Versículo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-center">
              {[
                { num: "320+", label: "Membros Ativos" },
                { num: "18", label: "Delegações em Portugal" },
                { num: "120+", label: "Eventos por Ano" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-4 sm:p-6 md:p-3 lg:p-6 rounded-2xl"
                  style={{ backgroundColor: "#f5f3ee" }}
                >
                  <div
                    className="text-3xl font-bold mb-2"
                    style={{ color: "#8a7043" }}
                  >
                    {s.num}
                  </div>
                  <div className="text-xs text-gray-500 leading-snug">
                    {s.label}
                  </div>
                </div>
              ))}

              <div
                className="col-span-1 sm:col-span-3 p-6 rounded-2xl"
                style={{ backgroundColor: "#0d1f35" }}
              >
                <p
                  className="text-sm italic leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  "…enquanto temos oportunidade, façamos o bem a todos, especialmente aos da família da fé."
                </p>
                <p className="text-xs mt-3 font-semibold" style={{ color: "#c5a46b" }}>
                  Gálatas 6:10
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* O Nosso Propósito */}
      <div
        id="proposito"
        className="py-20 border-b border-gray-100 scroll-mt-20"
        style={{ backgroundColor: "#f8f7f2" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-14 items-start">
            <div>
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: "#8a7043" }}
              >
                O Nosso Propósito
              </div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: "#0d1f35" }}>
                Porque existimos
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>Comunicar</strong> aquilo que nos satisfaz na Vida, em encontros de <strong>convívio</strong> e partilha de <strong>experiências</strong> pessoais.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>Construir</strong> uma rede de contactos e <strong>agilizar oportunidades</strong> entre os cristãos, através de uma base de dados online a que chamamos de <strong>"Parceiros de Confiança"</strong>.
              </p>
              <p className="text-gray-600 leading-relaxed">
                <strong>Mostrar o Caminho</strong> para uma <strong>Vida com Propósito e Significado</strong>, através de um relacionamento pessoal com Jesus Cristo.
              </p>
            </div>

            {/* Cards de Valores */}
            <div className="grid grid-cols-2 gap-4">
              {VALUES.map((v) => (
                <div
                  key={v.title}
                  className="p-5 rounded-xl bg-white shadow-sm"
                  style={{ border: "1px solid #e5e2da" }}
                >
                  <div className="mb-3">
                    <v.Icon size={20} style={{ color: "#8a7043" }} />
                  </div>
                  <div
                    className="text-sm font-semibold mb-1"
                    style={{ color: "#0d1f35" }}
                  >
                    {v.title}
                  </div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {v.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* A Nossa Missão */}
      <div id="missao" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-14 items-start">
            <div>
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: "#8a7043" }}
              >
                A Nossa Missão
              </div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: "#0d1f35" }}>
                O que nos move
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                A missão da ASPEC é <strong>ser um espaço de encontro</strong> para profissionais e empresários cristãos que desejam integrar os seus valores de fé na vida profissional e empresarial.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Promovemos a <strong>excelência com integridade</strong>, a colaboração assente na <strong>confiança mútua</strong> e o crescimento sustentado por princípios cristãos — na certeza de que a fé e o trabalho não são mundos separados.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Queremos que cada membro encontre na ASPEC uma <strong>rede de suporte genuíno</strong>: para crescer, para colaborar e para impactar positivamente a sociedade portuguesa.
              </p>
            </div>

            {/* Lista de Pilares da Missão */}
            <div className="space-y-4">
              {[
                {
                  Icon: BookOpen,
                  title: "Integrar fé e trabalho",
                  desc: "Acreditamos que os princípios cristãos são uma bússola para decisões éticas e sustentáveis no mundo dos negócios.",
                },
                {
                  Icon: Users,
                  title: "Fortalecer a comunidade",
                  desc: "Criamos oportunidades de encontro, colaboração e suporte mútuo entre membros de todo o país.",
                },
                {
                  Icon: Target,
                  title: "Impactar a sociedade",
                  desc: "Através de profissionais íntegros e empresas responsáveis, contribuímos para uma sociedade mais justa e fraterna.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 p-5 rounded-xl bg-white shadow-sm"
                  style={{ border: "1px solid #e5e2da" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(138,112,67,0.1)" }}
                  >
                    <item.Icon size={18} style={{ color: "#8a7043" }} />
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold mb-1"
                      style={{ color: "#0d1f35" }}
                    >
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500 leading-relaxed">
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
