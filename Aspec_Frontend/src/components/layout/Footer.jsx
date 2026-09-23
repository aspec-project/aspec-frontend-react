import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

// Ícones de Redes Sociais em SVG nativo
const FacebookIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const LinkedinIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const InstagramIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export default function Footer() {
  const socialLinks = [
  {
    nome: "Facebook",
    icon: FacebookIcon,
    url: "https://www.facebook.com/aspec.pt",
  },
  {
    nome: "LinkedIn",
    icon: LinkedinIcon,
    url: "https://www.linkedin.com/company/aspec-associacao-de-profissionais-e-empresarios-cristaos",
  },
  {
    nome: "Instagram",
    icon: InstagramIcon,
    url: "https://www.instagram.com/aspec.pt/",
  },
];

  const platformLinks = [
    { label: "Início", to: "/" },
    { label: "Eventos", to: "/eventos" },
    { label: "Diretório de Membros", to: "/membros" },
    { label: "Candidatar-me", to: "/registo" },
  ];

  const associationLinks = [
    "Missão e Valores",
    "História",
    "Delegações Regionais",
    "Código de Conduta",
    "Política de Privacidade",
  ];

  return (
    <footer className="bg-[#0d1f35] text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Marca / Logo em Código */}
          <div className="md:col-span-1">
          <div className="mb-4">
            <img
              src="/images/log-branco.png"
              alt="ASPEC"
              className="h-6 w-auto"
            />
          </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Associação de Profissionais, Empreendedores e Empresários Cristãos
              de Portugal.
            </p>
            <div className="flex gap-3 mt-4">
            {socialLinks.map((social) => {
            const Icon = social.icon;

            return (
                <a
                key={social.nome}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.nome}
                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center transition-colors hover:bg-primary/30"
                >
                <Icon size={14} className="text-primary" />
                </a>
            );
            })}
            </div>
          </div>

          {/* Links da Plataforma */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Plataforma
            </h4>
            <ul className="space-y-2">
              {platformLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links da Associação */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Associação
            </h4>
            <ul className="space-y-2">
              {associationLinks.map((item) => (
                <li key={item}>
                  <Link
                    to="#"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Contacto
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-400">
                <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  Av. do Atlântico n°16, Edifício Panoramico<br />
                  14°Piso, Escritório 8<br />
                  1990-019 Parque das Nações<br />
                  Lisboa
                </span>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <Mail size={14} className="text-primary" />
                <a href="mailto:aspec@aspec.pt" className="hover:text-white transition-colors">
                  aspec@aspec.pt
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <Phone size={14} className="text-primary" />
                <a href="tel:+351210000000" className="hover:text-white transition-colors">
                  +351 210 000 000
                </a>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-white/10 mt-10 mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-xs text-gray-500 text-center md:text-left">
          <span>© {new Date().getFullYear()} ASPEC — Todos os direitos reservados</span>
        </div>
      </div>
    </footer>
  );
}