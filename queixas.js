// =====================================================
// Reclamações abertas pelo cliente (separadas da nota)
// queixas/{negocioId}_{cliente}: UMA reclamação por cliente em cada negócio.
//   - status "aberta" → o negócio responde (resposta) → o cliente marca "resolvida".
//   - Depois de resolvida, o cliente pode reabrir com um relato novo.
//   - Prazo de resposta: 7 dias. Passou disso sem resposta, aparece "Sem resposta".
// cotas/{cliente}: no máximo 3 reclamações (abertas ou reabertas) a cada 30 dias.
// Para reclamar: e-mail confirmado, conta com 3 dias e ter mandado mensagem para o
// negócio pelo chat (o negócio não precisa ter respondido — quem some também pode
// receber reclamação). As regras do Firestore conferem tudo isso.
// =====================================================
import { podeAvaliarNegocio, avisar, DIAS_CONTA } from "./avaliacoes.js?v=8";

export const MOTIVOS = {
  atraso: "Atraso ou prazo não cumprido",
  qualidade: "Qualidade do serviço ou produto",
  cobranca: "Cobrança indevida ou valor diferente",
  ausencia: "Não compareceu ou não entregou",
  atendimento: "Atendimento ou comunicação",
  golpe: "Suspeita de golpe",
  outro: "Outro motivo"
};
export const PRAZO_DIAS = 7;
export const LIMITE_COTA = 3, JANELA_DIAS = 30;
const ms = (t) => t?.toMillis?.() ?? 0;
export const semResposta = (q) => q.status === "aberta" && !q.resposta && Date.now() - ms(q.abertaEm) > PRAZO_DIAS * 864e5;

// Foto opcional: reduz para no máximo 1080px e ~180 KB (fica dentro do documento).
async function reduzirFoto(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const esc = Math.min(1, 1080 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    for (const q of [0.8, 0.65, 0.5, 0.4]) { const d = c.toDataURL("image/jpeg", q); if (d.length < 240000) return d; }
    return "";
  } finally { URL.revokeObjectURL(url); }
}

// Grava (ou reabre) a reclamação e a cota na mesma transação.
async function gravar(fbx, euX, n, { motivo, texto, foto }, autor) {
  const negocioId = n.id || `${n.donoId}_${n.tipo}`;
  const ref = fbx.doc(fbx.db, "queixas", `${negocioId}_${euX.uid}`);
  const refCota = fbx.doc(fbx.db, "cotas", euX.uid);
  await fbx.runTransaction(fbx.db, async (tx) => {
    const [q, cota] = await Promise.all([tx.get(ref), tx.get(refCota)]);
    const atual = q.exists() ? q.data() : null;
    if (atual && atual.status === "aberta") throw Object.assign(new Error("Você já tem uma reclamação aberta para este negócio."), { code: "aberta" });
    const c = cota.exists() ? cota.data() : null;
    const novaJanela = !c || Date.now() - ms(c.inicio) > JANELA_DIAS * 864e5;
    if (!novaJanela && (c.n || 0) >= LIMITE_COTA) throw Object.assign(new Error(`Você já abriu ${LIMITE_COTA} reclamações nos últimos ${JANELA_DIAS} dias.`), { code: "cota" });
    tx.set(refCota, novaJanela ? { inicio: fbx.serverTimestamp(), n: 1, ultimaEm: fbx.serverTimestamp() } : { inicio: c.inicio, n: (c.n || 0) + 1, ultimaEm: fbx.serverTimestamp() });
    const base = { motivo, texto, foto: foto || "", status: "aberta", abertaEm: fbx.serverTimestamp(), resposta: null, respondidaEm: null, resolvidaEm: null };
    if (atual) tx.update(ref, { ...base, aberturas: (atual.aberturas || 1) + 1 });
    else tx.set(ref, {
      ...base, negocioId, alvoId: n.donoId, autorId: euX.uid,
      autorNome: String(autor.nome || "").slice(0, 80), negocioNome: String(n.nome || "").slice(0, 80),
      tipo: n.tipo, aberturas: 1, criadoEm: fbx.serverTimestamp()
    });
  });
  return negocioId;
}

let cssPronto = false;
function css() {
  if (cssPronto) return; cssPronto = true;
  const s = document.createElement("style");
  s.textContent = `
  .qx-motivos { display: flex; flex-wrap: wrap; gap: 6px; }
  .qx-motivos button { border: 1px solid var(--line, #22313a); background: var(--panel-2, #162128); color: inherit; font: inherit; font-size: 13px; font-weight: 700; padding: 8px 11px; border-radius: 999px; cursor: pointer; }
  .qx-motivos button[aria-pressed="true"] { border-color: #ef4444; background: rgba(239,68,68,.15); color: #ff9b9b; }
  .qx-foto { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted, #8fa0ab); }
  .qx-foto label { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 12px; border: 1px dashed var(--line, #22313a); cursor: pointer; font-weight: 700; color: inherit; }
  .qx-foto img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; }
  .qx-regras { margin: 0; padding: 10px 12px 10px 28px; border-radius: 12px; font-size: 12.5px; line-height: 1.5; color: var(--muted, #8fa0ab); background: var(--panel-2, #162128); }
  .qx-conta { font-size: 12px; color: var(--muted, #8fa0ab); text-align: right; }
  .hf-aval .pri.vermelho { background: #ef4444; color: #fff; }`;
  document.head.appendChild(s);
}

// Fluxo completo de "Abrir reclamação" para um negócio.
// autor: { nome } · aoAbrir(negocioId)
export async function abrirQueixa(fbx, euX, n, { autor = {}, aoAbrir } = {}) {
  const pode = await podeAvaliarNegocio(fbx, euX, n, { exigirResposta: false });
  if (!pode.ok && !/já avaliou/.test(pode.motivo || "")) { avisar(pode.motivo); return; }
  const negocioId = n.id || `${n.donoId}_${n.tipo}`;
  let atual = null;
  try { const s = await fbx.getDoc(fbx.doc(fbx.db, "queixas", `${negocioId}_${euX.uid}`)); atual = s.exists() ? s.data() : null; } catch {}
  if (atual?.status === "aberta") { avisar("Você já tem uma reclamação aberta para este negócio. Acompanhe pela página Reclamações.", "Reclamação em andamento"); return; }
  css();
  const fundo = document.createElement("div"); fundo.className = "hf-aval-fundo"; fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true");
  const caixa = document.createElement("div"); caixa.className = "hf-aval"; fundo.appendChild(caixa);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla, true); };
  const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); fechar(); } }; // fecha só esta janela
  document.addEventListener("keydown", tecla, true);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  const topo = document.createElement("div"); topo.className = "hf-aval-topo";
  const tt = document.createElement("div");
  const h = document.createElement("h3"); h.textContent = atual ? `Reabrir reclamação · ${n.nome || ""}` : `Reclamar de ${n.nome || "um negócio"}`;
  const sp = document.createElement("p"); sp.textContent = "A reclamação fica pública na página Reclamações. O negócio tem 7 dias para responder.";
  tt.append(h, sp);
  const x = document.createElement("button"); x.type = "button"; x.className = "x"; x.setAttribute("aria-label", "Fechar"); x.textContent = "✕"; x.addEventListener("click", fechar);
  topo.append(tt, x);
  let motivo = "";
  const motivos = document.createElement("div"); motivos.className = "qx-motivos"; motivos.setAttribute("role", "group"); motivos.setAttribute("aria-label", "Motivo");
  Object.entries(MOTIVOS).forEach(([k, r]) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = r; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => { motivo = k; motivos.querySelectorAll("button").forEach((y) => y.setAttribute("aria-pressed", y === b ? "true" : "false")); validar(); });
    motivos.appendChild(b);
  });
  const txt = document.createElement("textarea"); txt.maxLength = 1000; txt.placeholder = "Conte o que aconteceu: quando foi, o que foi combinado e o que deu errado. Seja respeitoso: todos podem ler.";
  const conta = document.createElement("div"); conta.className = "qx-conta";
  let foto = "";
  const fotoBox = document.createElement("div"); fotoBox.className = "qx-foto";
  const lbl = document.createElement("label"); lbl.textContent = "📎 Anexar foto (opcional)";
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.hidden = true; lbl.appendChild(inp);
  const prev = document.createElement("img"); prev.alt = "Foto anexada"; prev.hidden = true;
  inp.addEventListener("change", async () => {
    const a = inp.files?.[0]; if (!a) return;
    foto = await reduzirFoto(a).catch(() => "");
    prev.hidden = !foto; if (foto) prev.src = foto; else alert("Não foi possível usar essa foto. Tente outra.");
  });
  fotoBox.append(lbl, prev);
  const regras = document.createElement("ul"); regras.className = "qx-regras";
  [`Uma reclamação aberta por vez para cada negócio.`, `No máximo ${LIMITE_COTA} reclamações a cada ${JANELA_DIAS} dias.`, `Só você pode marcar como resolvida.`, `Ofensas, dados pessoais e acusações sem relato podem ser removidos.`].forEach((t) => { const li = document.createElement("li"); li.textContent = t; regras.appendChild(li); });
  const acoes = document.createElement("div"); acoes.className = "acoes";
  const canc = document.createElement("button"); canc.type = "button"; canc.className = "sec"; canc.textContent = "Cancelar"; canc.addEventListener("click", fechar);
  const env = document.createElement("button"); env.type = "button"; env.className = "pri vermelho"; env.textContent = atual ? "Reabrir reclamação" : "Enviar reclamação"; env.disabled = true;
  const validar = () => { const t = txt.value.trim().length; conta.textContent = t < 20 ? `Escreva pelo menos 20 caracteres (${t}/20)` : `${t}/1000`; env.disabled = !motivo || t < 20; };
  txt.addEventListener("input", validar); validar();
  env.addEventListener("click", async () => {
    env.disabled = true; env.textContent = "Enviando...";
    try {
      const id = await gravar(fbx, euX, n, { motivo, texto: txt.value.trim().slice(0, 1000), foto }, autor);
      fechar(); aoAbrir?.(id);
    } catch (e) {
      env.disabled = false; env.textContent = atual ? "Reabrir reclamação" : "Enviar reclamação";
      alert(e?.code === "cota" || e?.code === "aberta" ? e.message : e?.code === "permission-denied" ? `Não foi possível enviar. Confira: e-mail confirmado, conta com ${DIAS_CONTA} dias e mensagem enviada para o negócio pelo chat.` : "Não foi possível enviar agora. Tente de novo.");
    }
  });
  acoes.append(canc, env);
  const rotM = document.createElement("strong"); rotM.textContent = "Motivo"; rotM.style.fontSize = "14px";
  caixa.append(topo, rotM, motivos, txt, conta, fotoBox, regras, acoes);
  document.body.appendChild(fundo);
}

// O negócio responde (ou corrige a resposta) · o cliente marca como resolvida.
export async function responderQueixa(fbx, id, texto) {
  await fbx.updateDoc(fbx.doc(fbx.db, "queixas", id), { resposta: String(texto).trim().slice(0, 1000), respondidaEm: fbx.serverTimestamp() });
}
export async function resolverQueixa(fbx, id) {
  await fbx.updateDoc(fbx.doc(fbx.db, "queixas", id), { status: "resolvida", resolvidaEm: fbx.serverTimestamp() });
}
