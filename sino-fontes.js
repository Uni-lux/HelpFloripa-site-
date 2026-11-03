// Fontes do sino (notificações) lidas pelas MAIS NOVAS: cada fonte traz só as 30 últimas (ordem de criadoEm), em vez de
// até 100 em qualquer ordem. Precisa de um índice composto por fonte (ver _regras/INDICES-LEIA-ME.md, índices do sino);
// enquanto o índice não existe, o Firestore recusa com "failed-precondition" e cai na consulta de antes (sem ordem, 60).
// Sem dependências: recebe as funções do Firestore (fs) e o banco (db).
//
// O que fica no sino (decidido com o dono em 02/11/2026): seguidores, estrelas, comentários e respostas, marcações,
// republicações, resultado de enquetes, contagem regressiva que terminou, pedidos e vínculos do Social, reclamações
// (nova/respondida/resolvida), avaliação de você como cliente, plano vencendo e suporte/avisos da equipe.
// Saíram do sino (ficam só na página de origem): mensagens (número no ícone do Mensagens), pedidos/orçamentos (cartões
// no Mensagens), estrelas e reações do Flash (Atividade do flash), respostas da caixa de perguntas (na própria caixa),
// reações em comentários (no comentário) e avaliação boa do negócio (Meus negócios).

export const POR_FONTE = 30;

// Cada fonte: coleção e filtros (o "where" de sempre).
export function fontesDoSino(fs, uid) {
  return {
    seguidores: ["relacoes", [fs.where("tipo", "==", "seguir"), fs.where("alvoId", "==", uid)]],
    curtidas: ["curtidas", [fs.where("postAutorId", "==", uid)]],
    comentarios: ["comentarios", [fs.where("postAutorId", "==", uid)]],
    respostas: ["comentarios", [fs.where("respostaAutorId", "==", uid)]],
    marcacoes: ["diario", [fs.where("marcados", "array-contains", uid)]],
    republicacoes: ["republicacoes", [fs.where("postAutorId", "==", uid)]],
  };
}

export const precisaIndice = (e) => e?.code === "failed-precondition" || /index/i.test(String(e?.message || ""));

// Consulta pelas mais novas e a reserva (sem ordem), para quando o índice ainda não existe.
export function consultasDe(fs, db, [col, filtros], n = POR_FONTE) {
  return {
    novas: fs.query(fs.collection(db, col), ...filtros, fs.orderBy("criadoEm", "desc"), fs.limit(n)),
    reserva: fs.query(fs.collection(db, col), ...filtros, fs.limit(60)),
  };
}

// Índice que faltou: lembrado no aparelho por 6 h, para não gastar uma ida ao servidor recusada a cada abertura.
const CH_IND = "hf-sino-sem-indice";
const semIndice = (col) => { try { const m = JSON.parse(localStorage.getItem(CH_IND) || "{}"); return Date.now() - (m[col] || 0) < 6 * 36e5; } catch { return false; } };
const marcarSemIndice = (col) => { try { const m = JSON.parse(localStorage.getItem(CH_IND) || "{}"); m[col] = Date.now(); localStorage.setItem(CH_IND, JSON.stringify(m)); } catch {} };
const chaveFonte = ([col, filtros]) => col + ":" + filtros.length;

// Leitura única (painel do sino e contador das outras páginas).
export async function lerFonte(fs, db, fonte, n = POR_FONTE) {
  const { novas, reserva } = consultasDe(fs, db, fonte, n);
  const k = chaveFonte(fonte);
  if (semIndice(k)) return fs.getDocs(reserva);
  try { return await fs.getDocs(novas); }
  catch (e) { if (!precisaIndice(e)) throw e; marcarSemIndice(k); return fs.getDocs(reserva); }
}

// Ao vivo (rede.js): se o índice faltar, troca sozinho para a reserva.
export function ouvirFonte(fs, db, fonte, aoMudar, aoErro, n = POR_FONTE) {
  const { novas, reserva } = consultasDe(fs, db, fonte, n);
  const k = chaveFonte(fonte);
  if (semIndice(k)) { const p = fs.onSnapshot(reserva, (s) => aoMudar(s), aoErro); return () => p(); }
  let parar = fs.onSnapshot(novas, (s) => aoMudar(s), (e) => {
    if (precisaIndice(e)) marcarSemIndice(k);
    if (precisaIndice(e)) parar = fs.onSnapshot(reserva, (s) => aoMudar(s), aoErro);
    else aoErro?.(e);
  });
  return () => parar?.();
}
