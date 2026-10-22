// =====================================================
// Suporte em nível nacional (como as grandes plataformas): cada chamado entra numa FILA (setor) pelo assunto, com
// PRIORIDADE e PRAZO de primeira resposta (SLA). A equipe pega "o próximo" da fila (o mais urgente e mais antigo),
// sem dois atendentes no mesmo chamado. Usado pela página de suporte e pelo painel. Sem dependências.
// =====================================================
export const FILAS = {
  seguranca: { nome: "Segurança", cats: ["golpe", "denuncia"] },
  moderacao: { nome: "Moderação", cats: ["contestacao"] },
  pagamentos: { nome: "Pagamentos e planos", cats: ["pagamento"] },
  negocios: { nome: "Negócios", cats: ["negocio"] },
  conta: { nome: "Conta e acesso", cats: ["conta"] },
  geral: { nome: "Geral e sugestões", cats: ["sugestao", "outro"] }
};
export const filaDe = (categoria) => Object.keys(FILAS).find((k) => FILAS[k].cats.includes(categoria)) || "geral";

// Prioridade: golpe = urgente; pagamento, contestação ou plano Pro/Premium = alta; o resto = normal.
export const PRIORIDADES = { urgente: { nome: "Urgente", horas: 2, peso: 3 }, alta: { nome: "Alta", horas: 8, peso: 2 }, normal: { nome: "Normal", horas: 24, peso: 1 } };
export function prioridadeDe(categoria, nivelPlano = 0) {
  if (categoria === "golpe") return "urgente";
  if (categoria === "pagamento" || categoria === "contestacao" || nivelPlano >= 2) return "alta";
  return "normal";
}
const ms = (t) => t?.toMillis?.() ?? (t?.seconds ? t.seconds * 1000 : typeof t === "number" ? t : 0);
// Chamados antigos sem prioridade: calcula pela categoria.
export const prioridadeChamado = (s, nivelPlano = 0) => (PRIORIDADES[s?.prioridade] ? s.prioridade : prioridadeDe(s?.categoria, nivelPlano));
// Prazo da primeira resposta: aberto em + horas da prioridade.
export const prazoDe = (s, nivelPlano = 0) => (ms(s?.criadoEm) || Date.now()) + PRIORIDADES[prioridadeChamado(s, nivelPlano)].horas * 3600e3;

const horasTxt = (h) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} dias`);
// Situação do prazo para a equipe: { atrasado, texto } ("vence em 3 h" / "atrasado há 2 h"). Já respondido = sem prazo.
export function situacaoPrazo(s, nivelPlano = 0, agora = Date.now()) {
  if (s?.status !== "aberto" || (s.primeiraRespostaEm && s.ultimaDe !== "usuario")) return null;
  const fim = prazoDe(s, nivelPlano), falta = (fim - agora) / 3600e3;
  return falta >= 0 ? { atrasado: false, perto: falta < 1, texto: `vence em ${horasTxt(falta)}` } : { atrasado: true, perto: false, texto: `atrasado há ${horasTxt(-falta)}` };
}
// Ordem da fila: atrasados primeiro, depois prioridade, depois quem espera há mais tempo.
export function ordemFila(a, b, nivelDe = () => 0) {
  const pa = prazoDe(a, nivelDe(a)), pb = prazoDe(b, nivelDe(b)), agora = Date.now();
  const atA = pa < agora, atB = pb < agora;
  if (atA !== atB) return atA ? -1 : 1;
  const wa = PRIORIDADES[prioridadeChamado(a, nivelDe(a))].peso, wb = PRIORIDADES[prioridadeChamado(b, nivelDe(b))].peso;
  if (wa !== wb) return wb - wa;
  return pa - pb;
}
// Para quem abriu: "Resposta em até 8 h (até 14:30)".
export function textoPrevisao(s, nivelPlano = 0) {
  const p = PRIORIDADES[prioridadeChamado(s, nivelPlano)], fim = new Date(prazoDe(s, nivelPlano));
  const hoje = new Date().toDateString() === fim.toDateString();
  return `Resposta em até ${p.horas} h (${hoje ? "hoje às" : fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " às"} ${fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})`;
}
export const MAX_ABERTOS = 3; // chamados em andamento por pessoa
