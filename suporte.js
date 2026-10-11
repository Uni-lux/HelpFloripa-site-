// =====================================================
// Ajuda e suporte (suporte.html): chamados da pessoa com a equipe.
// suporte/{id} + suporte/{id}/mensagens. Quem está suspenso também consegue
// abrir chamado (para contestar). A equipe responde pelo painel.
// =====================================================
import { $, el, toast, erroAmigavel, abrirFolha, fecharFolha, fb, eu, dados, iniciarRede, montarBarraRede, pintarBarraRede } from "./rede.js?v=23";

const CAT = { conta: "Conta", negocio: "Negócio", golpe: "Golpe", denuncia: "Denúncia", contestacao: "Contestação", pagamento: "Pagamento", sugestao: "Sugestão", outro: "Outro" };
const ST = { aberto: "Esperando a equipe", respondido: "A equipe respondeu", fechado: "Encerrado" };
const ms = (t) => t?.toMillis?.() ?? 0;
const quando = (t) => (ms(t) ? new Date(ms(t)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");
let chamados = [], atual = null;

async function carregar() {
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "suporte"), fb.where("uid", "==", eu.uid), fb.limit(50))).catch(() => ({ docs: [] }));
  chamados = s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })).sort((a, b) => ms(b.atualizadoEm) - ms(a.atualizadoEm));
  const lista = $("supLista");
  $("supCarregando").hidden = true; lista.hidden = false;
  lista.replaceChildren();
  if (!chamados.length) { lista.appendChild(el("div", "lista-vazia", "Você ainda não abriu nenhum chamado.")); return; }
  chamados.forEach((c) => {
    const b = el("button", "sup-item"); b.type = "button";
    const l1 = el("div", "l1"); l1.append(el("span", "sup-st " + c.status, ST[c.status] || c.status), el("small", null, `${CAT[c.categoria] || c.categoria} · ${quando(c.atualizadoEm)}`));
    b.append(l1, el("strong", null, c.assunto));
    b.addEventListener("click", () => abrir(c));
    lista.appendChild(b);
  });
}

async function abrir(c) {
  atual = c;
  $("tChamado").textContent = c.assunto;
  $("chMeta").textContent = `${CAT[c.categoria] || c.categoria} · aberto em ${quando(c.criadoEm)} · ${ST[c.status] || c.status}`;
  $("chFechar").textContent = c.status === "fechado" ? "Reabrir chamado" : "Encerrar chamado";
  const box = $("chMsgs"); box.replaceChildren(el("div", "lista-vazia", "Carregando..."));
  abrirFolha("folhaChamado");
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "suporte", c.id, "mensagens"), fb.orderBy("em", "asc"))).catch(() => ({ docs: [] }));
  box.replaceChildren(...s.docs.map((d) => {
    const m = d.data({ serverTimestamps: "estimate" });
    const b = el("div", "sup-msg" + (m.equipe ? " equipe" : " meu"), m.texto);
    b.appendChild(el("small", null, `${m.equipe ? "Equipe Help Floripa" : "Você"} · ${quando(m.em)}`));
    return b;
  }));
}

$("btnNovo").addEventListener("click", () => abrirFolha("folhaNovo"));
$("supTexto").addEventListener("input", () => { $("supCont").textContent = `${$("supTexto").value.length}/2000`; });
$("supEnviar").addEventListener("click", async () => {
  const assunto = $("supAssunto").value.trim(), texto = $("supTexto").value.trim(), categoria = $("supCategoria").value;
  if (assunto.length < 3) { toast("Escreva um resumo do assunto."); $("supAssunto").focus(); return; }
  if (texto.length < 10) { toast("Conte um pouco mais (mínimo de 10 caracteres)."); $("supTexto").focus(); return; }
  const b = $("supEnviar"); b.disabled = true;
  try {
    // Chamado e primeira mensagem vão juntos: se algo falhar, nada fica pela metade.
    const ref = fb.doc(fb.collection(fb.db, "suporte"));
    const lote = fb.writeBatch(fb.db);
    lote.set(ref, { uid: eu.uid, nome: String(dados.nome || "").slice(0, 80), email: String(eu.email || "").slice(0, 120), assunto, categoria, status: "aberto", criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
    lote.set(fb.doc(fb.db, "suporte", ref.id, "mensagens", "inicio"), { autorId: eu.uid, equipe: false, texto, em: fb.serverTimestamp() });
    await lote.commit();
    fecharFolha("folhaNovo");
    $("supAssunto").value = ""; $("supTexto").value = "";
    toast("Chamado enviado. A equipe responde por aqui e você recebe um aviso.");
    await carregar();
  } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); }
  finally { b.disabled = false; }
});
$("chEnviar").addEventListener("click", async () => {
  const texto = $("chTexto").value.trim();
  if (!texto || !atual) return;
  const b = $("chEnviar"); b.disabled = true;
  try {
    await fb.addDoc(fb.collection(fb.db, "suporte", atual.id, "mensagens"), { autorId: eu.uid, equipe: false, texto, em: fb.serverTimestamp() });
    await fb.updateDoc(fb.doc(fb.db, "suporte", atual.id), { status: "aberto", atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
    $("chTexto").value = ""; atual.status = "aberto";
    await abrir(atual); carregar();
  } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); }
  finally { b.disabled = false; }
});
$("chFechar").addEventListener("click", async () => {
  if (!atual) return;
  const novo = atual.status === "fechado" ? "aberto" : "fechado";
  try {
    await fb.updateDoc(fb.doc(fb.db, "suporte", atual.id), { status: novo, atualizadoEm: fb.serverTimestamp(), ultimaDe: "usuario" });
    atual.status = novo; fecharFolha("folhaChamado"); toast(novo === "fechado" ? "Chamado encerrado" : "Chamado reaberto"); carregar();
  } catch (e) { toast("Não foi possível: " + erroAmigavel(e)); }
});

(async function iniciar() {
  try { await iniciarRede(); } catch (e) { toast(e.message || "Não foi possível carregar."); return; }
  montarBarraRede(""); pintarBarraRede();
  const cat = new URLSearchParams(location.search).get("categoria");
  if (cat && CAT[cat]) { $("supCategoria").value = cat; if (cat === "contestacao") $("supAssunto").value = "Contestar suspensão ou banimento"; abrirFolha("folhaNovo"); }
  await carregar();
})();
