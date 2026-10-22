// =====================================================
// Canais da equipe por setor (chat do painel em nível nacional). O "Geral" é o grupo de sempre (equipe_chat);
// os outros ficam em equipe_canais/{canal} (resumo da última mensagem) e equipe_canais/{canal}/mensagens.
// Os setores são os mesmos das filas do suporte (suporte-fila.js) + Avisos (só os donos escrevem) e Comercial.
// Cada pessoa vê os canais do seu papel; pode entrar e sair dos outros e silenciar (usuarios/{uid}.equipeCanais).
// Sem dependências: usado pelo admin.js, admin-chat.js e admin-secoes.js.
// =====================================================
export const CANAIS = [
  { id: "avisos", nome: "Avisos", desc: "Comunicados dos donos para toda a equipe", cor: "#f5a400", soDonos: true },
  { id: "seguranca", nome: "Segurança", desc: "Golpes e denúncias", cor: "#e5484d", fila: "seguranca", papeis: ["moderacao", "suporte"] },
  { id: "moderacao", nome: "Moderação", desc: "Contestações, contas e conteúdo", cor: "#8e4ec6", fila: "moderacao", papeis: ["moderacao"] },
  { id: "pagamentos", nome: "Pagamentos e planos", desc: "Pix, planos e cobranças", cor: "#2fbf71", fila: "pagamentos", papeis: ["suporte", "comercial"] },
  { id: "negocios", nome: "Negócios", desc: "Perfis de negócio e anúncios", cor: "#ff7a1a", fila: "negocios", papeis: ["suporte", "comercial"] },
  { id: "conta", nome: "Conta e acesso", desc: "Login, e-mail e dados da conta", cor: "#00adee", fila: "conta", papeis: ["suporte", "moderacao"] },
  { id: "comercial", nome: "Comercial", desc: "Sócios, parcerias e negociações", cor: "#b066ff", papeis: ["comercial"] }
];
export const GERAL = { id: "equipe", nome: "Geral", desc: "Toda a equipe", cor: "var(--accent)" };
export const canalPorId = (id) => CANAIS.find((c) => c.id === id) || null;
// Conversa de um canal no chat: "canal-seguranca" (sem "_", que é das conversas individuais).
export const convCanal = (id) => "canal-" + id;
export const ehCanal = (conv) => /^canal-[a-z]+$/.test(conv || "") && !!canalPorId(conv.slice(6));
export const idCanal = (conv) => (ehCanal(conv) ? conv.slice(6) : null);
// Canal de cada fila do suporte (a fila "geral" vai para o Geral).
export const canalDaFila = (fila) => CANAIS.find((c) => c.fila === fila)?.id || "equipe";
// Quem pode escrever: Avisos só os donos.
export const podeEscrever = (canal, papel) => !canalPorId(canal)?.soDonos || (papel || "dono") === "dono";

// Canais de cada pessoa: os do papel (dono = todos) + os que ela entrou − os que saiu. Avisos sempre.
export function canaisPadrao(papel = "dono") {
  return CANAIS.filter((c) => c.soDonos || papel === "dono" || (c.papeis || []).includes(papel)).map((c) => c.id);
}
export function meusCanais(papel, pref = {}) {
  const entrou = Array.isArray(pref.entrou) ? pref.entrou : [], saiu = Array.isArray(pref.saiu) ? pref.saiu : [];
  return CANAIS.filter((c) => c.soDonos || ((canaisPadrao(papel).includes(c.id) || entrou.includes(c.id)) && !saiu.includes(c.id))).map((c) => c.id);
}
export const silenciado = (canal, pref = {}) => Array.isArray(pref.silenciados) && pref.silenciados.includes(canal);

// Situação de quem está no painel (equipe_presenca.status).
export const STATUS = {
  disponivel: { nome: "Disponível", cls: "on" },
  pausa: { nome: "Em pausa", cls: "pausa" },
  fora: { nome: "Fora do turno", cls: "fora" }
};

// Protocolos de chamado no texto ("#P47ST8"): viram cartão no chat.
export function protocolosDoTexto(texto) {
  return [...new Set([...String(texto || "").matchAll(/(^|[^\w#])#([A-Z0-9]{6})(?![A-Za-z0-9])/g)].map((m) => "#" + m[2]))].slice(0, 3);
}
