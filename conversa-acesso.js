// =====================================================
// Quem pode mandar mensagem (12/11/2026) — solicitações de mensagem, como nas grandes redes.
// Cada pessoa escolhe, em pref_publicas/{uid} (todos leem):
//   msgPessoal:  "todos"    → qualquer pessoa manda direto
//                "seguindo" → (padrão) quem você segue e os seus vínculos do Social mandam direto; os outros enviam uma
//                             SOLICITAÇÃO, que você aceita ou recusa
//                "fechado"  → só quem você segue e os seus vínculos; os outros não conseguem nem pedir
//   msgNegocios: "todos"    → (padrão) negócios são públicos: qualquer cliente fala direto com o seu negócio
//                "pedidos"  → quem ainda não conversou com você envia uma solicitação
// A conversa que nasce como solicitação leva conversas/{id}.pedido {de, status: pendente|aceito|recusado, em}. As regras
// conferem tudo (quem pode criar com ou sem pedido, só quem recebeu decide, quem pediu não escreve depois de recusado e
// quem recebeu só escreve depois de aceitar). Com as regras de antes (sem "pedido"), a conversa é criada direto.
// Sem dependências: recebe as funções do Firestore (fb) por parâmetro.
// =====================================================
export const MSG_PESSOAL = [
  ["todos", "Todos", "Qualquer pessoa do Help Floripa manda mensagem direto para você."],
  ["seguindo", "Quem eu sigo (recomendado)", "Quem você segue e os seus vínculos do Social mandam direto. As outras pessoas enviam uma solicitação, que você aceita ou recusa."],
  ["fechado", "Só quem eu sigo", "Só quem você segue e os seus vínculos do Social conseguem mandar mensagem. Os outros não conseguem nem enviar solicitação."]
];
export const MSG_NEGOCIOS = [
  ["todos", "Todos os clientes (recomendado)", "Seus negócios são públicos: qualquer pessoa fala direto com eles, como numa loja aberta."],
  ["pedidos", "Novos contatos enviam solicitação", "Quem ainda não conversou com você manda uma solicitação, que você aceita ou recusa. Pode atrasar clientes."]
];
export const PADRAO_MSG = { msgPessoal: "seguindo", msgNegocios: "todos" };
const TIPOS_NEG = ["servicos", "delivery", "lojinha", "imoveis", "saude", "automotivo"];

export const idConversa = (a, b) => [a, b].sort().join("_");
export const pedidoPendente = (c) => c?.pedido?.status === "pendente";
// Solicitação que EU recebi e ainda não decidi (fica em "Solicitações", sem aviso nem "visto").
export const solicitacaoParaMim = (c, uid) => pedidoPendente(c) && c.pedido.de !== uid;
// Solicitação que EU mandei (pendente ou recusada).
export const minhaSolicitacao = (c, uid) => !!c?.pedido && c.pedido.de === uid && c.pedido.status !== "aceito";

const cachePref = new Map();
export async function prefMensagens(fb, uid, fresco = false) {
  const g = cachePref.get(uid);
  if (!fresco && g && Date.now() - g.em < 60000) return g.p;
  let p = { ...PADRAO_MSG };
  try {
    const d = await fb.getDoc(fb.doc(fb.db, "pref_publicas", uid));
    if (d.exists()) {
      const x = d.data();
      if (MSG_PESSOAL.some(([k]) => k === x.msgPessoal)) p.msgPessoal = x.msgPessoal;
      if (MSG_NEGOCIOS.some(([k]) => k === x.msgNegocios)) p.msgNegocios = x.msgNegocios;
    }
  } catch {}
  cachePref.set(uid, { p, em: Date.now() });
  return p;
}
export function esquecerPrefMensagens(uid) { cachePref.delete(uid); }

const existe = (fb, ...cam) => fb.getDoc(fb.doc(fb.db, ...cam)).then((d) => d.exists() ? d.data() : null).catch(() => null);

// Como a mensagem de "eu" chega em "outro": { via: "direto" | "pedido" | "fechado", negocio: bool }.
// negocio = a conversa é sobre um negócio DELE (contexto do tipo e ele tem esse perfil): vale a escolha dos negócios.
export async function acessoMensagem(fb, eu, outro, { contexto = null } = {}) {
  const tipo = contexto?.tipo;
  const [pref, segue, vinc, neg] = await Promise.all([
    prefMensagens(fb, outro),
    existe(fb, "relacoes", `${outro}_${eu}`),
    existe(fb, "vinculos", idConversa(eu, outro)),
    TIPOS_NEG.includes(tipo) ? existe(fb, "negocios", `${outro}_${tipo}`) : Promise.resolve(null)
  ]);
  const negocio = !!neg;
  if (segue || vinc?.status === "aceito") return { via: "direto", negocio };
  const modo = negocio ? pref.msgNegocios : pref.msgPessoal;
  if (modo === "todos") return { via: "direto", negocio };
  if (modo === "fechado") return { via: "fechado", negocio };
  return { via: "pedido", negocio };
}

export class ConversaFechada extends Error {
  constructor() { super("Essa pessoa só recebe mensagens de quem ela segue."); this.code = "conversa-fechada"; this.amigavel = true; }
}

// Garante a conversa com "outro" (cria se não existe). Nova conversa vira solicitação quando precisa; com as regras de
// antes (que não conhecem "pedido") é criada direto. Devolve { id, ref, dados, criada, pedido }.
// servico {tipo: corrida|sos|pet|achado, id}: conversa de um serviço em andamento entre quem não se conhece (corrida,
// SOS, pet perdido/achado). Vai direto: as regras conferem no documento do serviço que os dois fazem parte dele.
export async function garantirConversa(fb, eu, outro, { contexto = null, extra = {}, servico = null } = {}) {
  const id = idConversa(eu, outro), ref = fb.doc(fb.db, "conversas", id);
  let d = null;
  try { const s = await fb.getDoc(ref); if (s.exists()) d = s.data(); } catch {}
  if (d) return { id, ref, dados: d, criada: false, pedido: d.pedido?.status === "pendente" && d.pedido.de === eu };
  if (servico?.tipo && servico.id) {
    try {
      const base = { participantes: [eu, outro].sort(), ultimaMensagem: "", atualizadoEm: fb.serverTimestamp(), servico: { tipo: servico.tipo, id: String(servico.id) }, ...(contexto ? { contexto } : {}), ...extra };
      await fb.setDoc(ref, base, { merge: true });
      return { id, ref, dados: base, criada: true, pedido: false };
    } catch (e) { if (e?.code !== "permission-denied") throw e; } // regras de antes ou serviço que não confere: segue o normal
  }
  const a = await acessoMensagem(fb, eu, outro, { contexto });
  if (a.via === "fechado") throw new ConversaFechada();
  const base = { participantes: [eu, outro].sort(), ultimaMensagem: "", atualizadoEm: fb.serverTimestamp(), ...(contexto ? { contexto } : {}), ...extra };
  if (a.via === "pedido") {
    try {
      await fb.setDoc(ref, { ...base, pedido: { de: eu, status: "pendente", em: fb.serverTimestamp() } }, { merge: true });
      return { id, ref, dados: base, criada: true, pedido: true };
    } catch (e) {
      if (e?.code !== "permission-denied") throw e;
      // regras de antes: segue sem a solicitação
    }
  }
  await fb.setDoc(ref, base, { merge: true });
  return { id, ref, dados: base, criada: true, pedido: false };
}

// Quem recebeu decide: aceitar (vira conversa normal) ou recusar (some da lista e quem pediu não escreve mais).
export async function decidirSolicitacao(fb, eu, conversaId, aceitar) {
  const ref = fb.doc(fb.db, "conversas", conversaId);
  const mud = { "pedido.status": aceitar ? "aceito" : "recusado", "pedido.decididoEm": fb.serverTimestamp() };
  if (!aceitar) mud[`ocultaPara.${eu}`] = fb.serverTimestamp();
  await fb.updateDoc(ref, mud);
}

// Texto curto para a tela de quem vai escrever.
export function textoAcesso(via, nome = "Essa pessoa") {
  const n = String(nome || "Essa pessoa").split(" ")[0];
  if (via === "pedido") return `${n} recebe sua mensagem como solicitação: ela aparece para ${n} quando aceitar.`;
  if (via === "fechado") return `${n} só recebe mensagens de quem segue.`;
  return "";
}
