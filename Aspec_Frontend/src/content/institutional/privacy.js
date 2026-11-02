/* Proposta editorial baseada nos formulários do portal e nos contratos locais da API. */
export default {
  title: 'Política de Privacidade',
  sections: [
    {
      title: '1. Âmbito e responsável pelo tratamento',
      paragraphs: [
        'Esta versão descreve os dados e as funcionalidades identificados no portal ASPEC. É uma proposta para revisão: os elementos assinalados como «A confirmar pela ASPEC» precisam de validação antes da aprovação e publicação da política oficial.',
        'Identidade jurídica completa do responsável pelo tratamento, NIPC, sede e contactos oficiais: A confirmar pela ASPEC. Contacto para assuntos de privacidade e identificação e contacto do encarregado de proteção de dados, caso aplicável: A confirmar pela ASPEC.',
      ],
    },
    {
      title: '2. Dados recolhidos e respetiva origem',
      paragraphs: [
        'Candidatura e conta: nome, email e telefone pessoais, palavra-passe, empresa ou atividade profissional, setor, distrito, descrição, contactos comerciais, website e morada. A candidatura pede também congregação e função na congregação. O perfil contempla ainda código postal e localidade, quando recolhidos nas operações disponíveis.',
        'Perfil: logótipo, imagens do portefólio, horários e ligações a redes sociais, quando adicionados pelo membro. O portal permite atualizar informações do perfil e dados da conta na área reservada.',
        'Ativação, subscrição e faturação: nome de faturação, NIF, morada, código postal e localidade; estado da subscrição, referências de pagamento, valores, datas e documentos de faturação associados à conta.',
        'Participação e gestão: evento escolhido, inscrição e respetiva data, bem como operações de cancelamento. A funcionalidade de avaliações prevista no projeto envolve classificação, comentário, identificação das contas envolvidas e datas. A integração da consulta e publicação de avaliações no portal ainda precisa de confirmação.',
        'Os dados de candidatura e perfil são fornecidos pelo próprio utilizador. Estados de conta, decisões administrativas e registos de operações são produzidos pela gestão do portal; os estados de pagamento e faturação resultam também dos serviços integrados. O backend prevê preferências para mensagens de eventos. A disponibilização da sua gestão no portal e as condições de envio precisam de validação.',
      ],
    },
    {
      title: '3. Finalidades e fundamentos do tratamento',
      paragraphs: [
        'As funcionalidades analisadas utilizam os dados para receber e analisar candidaturas, gerir contas e acessos, apresentar o diretório profissional, permitir a atualização dos perfis, organizar eventos e inscrições, gerir subscrições e faturas e enviar comunicações relacionadas com a conta. Os dados de avaliações destinam-se à funcionalidade de avaliação de membros prevista no projeto.',
        'O fundamento jurídico de cada finalidade, os interesses legítimos eventualmente invocados e as condições das comunicações sobre eventos: A confirmar pela ASPEC. O registo de aceitação de termos existente na candidatura não é apresentado nesta proposta como consentimento para todas as finalidades.',
      ],
      subsections: [
        {
          title: '3.1. Informações relacionadas com convicções religiosas',
          paragraphs: [
            'A congregação e a função nela exercida podem revelar convicções religiosas. A necessidade destes campos, a finalidade específica, a base jurídica e a condição aplicável ao tratamento de categorias especiais de dados, bem como as respetivas salvaguardas: A confirmar pela ASPEC. Estes campos não são apresentados no perfil do diretório.',
          ],
        },
        {
          title: '3.2. Campos obrigatórios',
          paragraphs: [
            'Os formulários identificam os campos necessários às operações disponibilizadas. A falta de dados exigidos pode impedir a submissão da candidatura ou a conclusão da operação. A distinção entre exigência técnica, contratual ou legal e as consequências aplicáveis a cada campo: A confirmar pela ASPEC.',
          ],
        },
      ],
    },
    {
      title: '4. Visibilidade dos perfis e proteção dos contactos',
      paragraphs: [
        'O diretório permite a visitantes consultar os perfis disponibilizados, incluindo nome, empresa, setor, distrito, descrição, logótipo, horários e portefólio. A apresentação de médias de classificação e contagens está prevista quando esses dados são disponibilizados pelo serviço.',
        'Na interface atual, o email e telefone comerciais, website, morada, código postal, localidade e redes sociais são apresentados apenas a membros ou administradores autenticados com conta ativa e com dados autorizados pelo serviço. Estes elementos não são apresentados aos visitantes sem acesso. O email e telefone pessoais da conta, a congregação e a função na congregação não fazem parte do perfil do diretório.',
        'As imagens do logótipo e portefólio destinam-se à apresentação do perfil. Antes de as disponibilizar, recomenda-se verificar se contêm dados de terceiros. A restrição dos contactos no portal não impede que um destinatário autorizado os copie; a sua utilização responsável é abordada na proposta de Código de Conduta.',
      ],
    },
    {
      title: '5. Acessos internos, eventos e serviços externos',
      paragraphs: [
        'A área administrativa permite consultar os dados de conta e perfil necessários à gestão. Para gerir participantes de eventos, os administradores dispõem de listagens e exportação com nome, empresa, email e telefone pessoais e data de inscrição. A consulta de empresas inscritas disponibilizada a membros e administradores com acesso apresenta nomes de empresas, sem os contactos pessoais dessa listagem administrativa.',
        'O fluxo de pagamento utiliza o Stripe. A implementação prevê serviços de faturação e envio de email, cuja utilização concreta no ambiente de produção precisa de confirmação. Os mapas de eventos podem carregar conteúdo do Google Maps quando configurados; abrir websites, redes sociais ou ligações de eventos pode estabelecer contacto com serviços externos.',
        'A lista completa de destinatários e prestadores, as respetivas funções, os dados comunicados, os locais de alojamento e tratamento e as eventuais transferências internacionais e garantias aplicáveis: A confirmar pela ASPEC.',
      ],
    },
    {
      title: '6. Autenticação, cookies e segurança',
      paragraphs: [
        'O acesso reservado utiliza email e palavra-passe e uma sessão mantida por cookies, com proteção dos pedidos de alteração contra falsificação. O backend guarda a palavra-passe sob a forma de um resumo criptográfico. O portal inclui recuperação e alteração de palavra-passe e controlos de acesso às áreas reservadas.',
        'A infraestrutura de sessões prevê dados técnicos como endereço IP e informação do navegador. A configuração efetiva desses registos, o inventário e duração dos cookies, a eventual utilização de medição de audiência e as condições de carregamento de conteúdos externos: A confirmar pela ASPEC.',
        'As medidas organizativas, a gestão de acessos internos e o procedimento de resposta a incidentes: A confirmar pela ASPEC. Esta descrição das funcionalidades existentes não constitui uma garantia de segurança absoluta.',
      ],
    },
    {
      title: '7. Conservação dos dados',
      paragraphs: [
        'Prazos ou critérios de conservação para candidaturas, contas, perfis, imagens, inscrições, avaliações, faturação, comunicações, sessões, registos técnicos e cópias de segurança: A confirmar pela ASPEC. O cancelamento de uma inscrição ou subscrição não deve ser interpretado como eliminação de todos os dados associados.',
      ],
    },
    {
      title: '8. Direitos e forma de os exercer',
      paragraphs: [
        'Nos termos e condições do RGPD, pode pedir acesso, retificação, apagamento, limitação, portabilidade ou oposição. Quando aplicável, pode retirar o consentimento sem afetar o tratamento anterior e apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD).',
        'O portal permite editar dados da conta e do perfil nas funcionalidades disponíveis. O contacto para exercer os restantes direitos, o procedimento e a verificação de identidade: A confirmar pela ASPEC. Não existe nesta proposta uma promessa de eliminação automática da conta ou de todos os registos.',
      ],
    },
    {
      title: '9. Decisões automatizadas e versão oficial',
      paragraphs: [
        'A existência de decisões exclusivamente automatizadas com efeitos jurídicos ou semelhantes, incluindo definição de perfis, e, se aplicável, a sua lógica e consequências: A confirmar pela ASPEC. Os controlos técnicos de acesso e validação de formulários não permitem concluir, por si só, que existe esse tipo de decisão.',
        'Data de aprovação, entrada em vigor, versão e forma de comunicação de alterações à política: A confirmar pela ASPEC.',
      ],
    },
  ],
}
