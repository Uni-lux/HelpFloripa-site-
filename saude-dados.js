// =====================================================
// Saúde: profissões, conselhos, especialidades, convênios e textos usados pelo formulário (negocios.js) e pela
// vitrine (vitrine.js). Referências: Doctoralia, BoaConsulta e Zenklub (profissão, especialidade, registro no
// conselho, formas de atendimento, convênios e valor da consulta). Sem dependência do rede.js.
// O perfil guarda tudo em negocios/{uid}_saude.saude (mapa) e a profissão também em `categoria` (filtros).
// =====================================================

// Profissão → conselho que registra (vazio = sem conselho próprio) e sugestões de especialidade.
export const PROFISSOES_SAUDE = {
  medico: { nome: "Médico(a)", conselho: "CRM", rqe: true, esp: ["Clínica geral", "Medicina de família", "Pediatria", "Ginecologia e obstetrícia", "Cardiologia", "Dermatologia", "Psiquiatria", "Ortopedia", "Oftalmologia", "Endocrinologia", "Neurologia", "Geriatria", "Otorrinolaringologia", "Urologia"] },
  enfermeiro: { nome: "Enfermeiro(a)", conselho: "COREN", esp: ["Home care", "Curativos e feridas", "Estomaterapia", "Aplicação de medicação", "Pós-operatório", "Saúde da mulher", "Pediatria", "Saúde do idoso"] },
  tecEnfermagem: { nome: "Técnico(a) de enfermagem", conselho: "COREN", esp: ["Cuidados em casa", "Curativos", "Aplicação de injetáveis", "Sinais vitais", "Acompanhamento hospitalar", "Plantão noturno", "Cuidado de idosos"] },
  psicologo: { nome: "Psicólogo(a)", conselho: "CRP", esp: ["Terapia cognitivo-comportamental", "Psicanálise", "Psicologia infantil", "Terapia de casal", "Ansiedade e depressão", "Neuropsicologia", "Orientação profissional", "Luto"] },
  veterinario: { nome: "Médico(a) veterinário(a)", conselho: "CRMV", vet: true, esp: ["Clínica geral", "Vacinação", "Cirurgia", "Felinos", "Animais exóticos", "Dermatologia", "Ortopedia", "Atendimento em casa"] },
  dentista: { nome: "Dentista", conselho: "CRO", esp: ["Clínico geral", "Ortodontia", "Implantes", "Endodontia (canal)", "Odontopediatria", "Estética e clareamento", "Periodontia", "Prótese"] },
  fisioterapeuta: { nome: "Fisioterapeuta", conselho: "CREFITO", esp: ["Ortopédica", "Respiratória", "Neurológica", "Pilates", "RPG", "Esportiva", "Pélvica", "Domiciliar"] },
  nutricionista: { nome: "Nutricionista", conselho: "CRN", esp: ["Emagrecimento", "Esportiva", "Materno-infantil", "Vegetariana e vegana", "Clínica", "Comportamento alimentar"] },
  fonoaudiologo: { nome: "Fonoaudiólogo(a)", conselho: "CRFa", esp: ["Linguagem infantil", "Voz", "Audiologia", "Disfagia", "Gagueira", "Motricidade orofacial"] },
  terapeutaOcupacional: { nome: "Terapeuta ocupacional", conselho: "CREFITO", esp: ["Infantil", "Saúde mental", "Reabilitação física", "Integração sensorial", "Idosos"] },
  farmaceutico: { nome: "Farmacêutico(a)", conselho: "CRF", esp: ["Atenção farmacêutica", "Aplicação de vacinas", "Revisão de medicamentos", "Testes rápidos"] },
  educadorFisico: { nome: "Profissional de educação física", conselho: "CREF", esp: ["Personal trainer", "Treino funcional", "Idosos", "Reabilitação", "Corrida", "Online"] },
  cuidador: { nome: "Cuidador(a)", conselho: "", esp: ["Idosos", "Pessoas com deficiência", "Acompanhante hospitalar", "Pós-cirúrgico", "Pernoite"] },
  outros: { nome: "Outra profissão da saúde", conselho: "", esp: [] }
};
// Nome no plural para os filtros da página.
export const CATEGORIAS_SAUDE = { medico: "Médicos", enfermeiro: "Enfermeiros", tecEnfermagem: "Téc. de enfermagem", psicologo: "Psicólogos", veterinario: "Veterinários", dentista: "Dentistas", fisioterapeuta: "Fisioterapeutas", nutricionista: "Nutricionistas", fonoaudiologo: "Fonoaudiólogos", terapeutaOcupacional: "Terapia ocupacional", farmaceutico: "Farmacêuticos", educadorFisico: "Educação física", cuidador: "Cuidadores", outros: "Outros" };

// Site do conselho federal (consulta pública de registro). Abre em nova aba.
export const SITE_CONSELHO = {
  CRM: "https://portal.cfm.org.br/busca-medicos/",
  COREN: "https://www.cofen.gov.br/",
  CRP: "https://cadastro.cfp.org.br/",
  CRMV: "https://www.cfmv.gov.br/",
  CRO: "https://website.cfo.org.br/",
  CREFITO: "https://www.coffito.gov.br/",
  CRN: "https://www.cfn.org.br/",
  CRFa: "https://www.fonoaudiologia.org.br/",
  CRF: "https://www.cff.org.br/",
  CREF: "https://www.confef.org.br/"
};

export const MODALIDADES_SAUDE = { consultorio: "No consultório", online: "Online (teleconsulta)", domicilio: "Em casa (domiciliar)" };
export const PUBLICO_SAUDE = { bebes: "Bebês", criancas: "Crianças", adolescentes: "Adolescentes", adultos: "Adultos", idosos: "Idosos", gestantes: "Gestantes" };
export const PUBLICO_VET = { caes: "Cães", gatos: "Gatos", aves: "Aves", exoticos: "Exóticos e silvestres", grandes: "Grande porte" };
export const CONVENIOS = ["Unimed", "Bradesco Saúde", "SulAmérica", "Amil", "Hapvida NotreDame", "Porto Saúde", "Cassi", "Geap", "Saúde Caixa", "Postal Saúde", "SC Saúde", "Petlove Saúde"];
export const IDIOMAS = ["Português", "Inglês", "Espanhol", "Libras", "Italiano", "Francês", "Alemão"];
export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export const profissaoDe = (s) => PROFISSOES_SAUDE[s?.profissao] || null;
export const nomeProfissao = (s) => (s?.profissao === "outros" && String(s.profissaoOutra || "").trim() ? String(s.profissaoOutra).trim() : profissaoDe(s)?.nome || "Saúde");
export const conselhoDe = (s) => profissaoDe(s)?.conselho || "";
export const ehVet = (s) => !!profissaoDe(s)?.vet;
// "CRM-SC 12345 · RQE 6789" (vazio quando a pessoa não informou).
export function textoRegistro(s) {
  const c = conselhoDe(s), r = String(s?.registro || "").trim();
  if (!r) return "";
  const base = `${c || "Registro"}${s.registroUf ? "-" + s.registroUf : ""} ${r}`;
  return s.rqe ? `${base} · RQE ${s.rqe}` : base;
}
// Texto curto do valor: "Consulta R$ 250" / "Convênios e particular" etc.
export function textoValor(s, moeda) {
  const v = Number(s?.valorConsulta) > 0 ? moeda(s.valorConsulta) : "";
  if (v) return `Consulta ${v}`;
  if ((s?.convenios || []).length) return s.particular ? "Particular e convênios" : "Convênios";
  return s?.particular ? "Particular" : "";
}
// Aviso que aparece em todo perfil de saúde.
export const AVISO_EMERGENCIA = "Em emergência, ligue 192 (SAMU) ou 193 (Bombeiros) ou vá ao pronto-socorro mais perto. O Help Floripa não substitui atendimento de urgência.";
export const AVISO_REGISTRO = "O registro é informado pelo profissional. Confira no site do conselho antes de agendar.";
