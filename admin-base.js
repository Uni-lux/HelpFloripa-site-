// =====================================================
// Painel do administrador — base compartilhada
// Estado (D), utilitários, janelas, ações de moderação (todas registradas
// em admin_log) e a ficha completa do usuário.
// =====================================================
export const C = { fb: null, A: null, eu: null, nome: "", irPara: () => {}, recarregar: async () => {}, contadores: () => {} };
export const D = {
  pessoas: new Map(), negocios: [], anuncios: [], posts: [], denuncias: [], queixas: [], suporte: [], parcerias: [],
  sancoes: new Map(), exclusoes: new Map(), notas: new Map(), comunicados: [], log: [], admins: [], estatisticas: [],
  contagens: {}, carregadoEm: 0
};

// ---------- utilitários ----------
export const $ = (id) => document.getElementById(id);
export function h(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
export const ms = (t) => t?.toMillis?.() ?? (typeof t === "number" ? t : 0);
export const DIA = 864e5;
export const agora = () => Date.now();
export const data = (t) => (ms(t) ? new Date(ms(t)).toLocaleDateString("pt-BR") : "—");
export const dataHora = (t) => (ms(t) ? new Date(ms(t)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
export function relativo(t) {
  const v = ms(t); if (!v) return "nunca";
  const d = (agora() - v) / 1000;
  if (d < 60) return "agora"; if (d < 3600) return `há ${Math.floor(d / 60)} min`; if (d < 86400) return `há ${Math.floor(d / 3600)} h`;
  if (d < 86400 * 30) return `há ${Math.floor(d / 86400)} d`; return data(v);
}
export function idade(nasc) {
  if (!nasc) return null;
  const n = new Date(nasc + "T00:00:00"); if (isNaN(n)) return null;
  const hj = new Date(); let i = hj.getFullYear() - n.getFullYear();
  if (hj.getMonth() < n.getMonth() || (hj.getMonth() === n.getMonth() && hj.getDate() < n.getDate())) i--;
  return i >= 0 && i < 120 ? i : null;
}
export const nomeCidade = (v) => (v === "florianopolis" ? "Florianópolis" : v === "saojose" ? "São José" : String(v || "").trim());
export const iniciais = (n) => { const p = String(n || "?").trim().split(/\s+/); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
export const fotoOk = (u) => /^(data:image\/|https:\/\/firebasestorage\.googleapis\.com\/|https:\/\/lh3\.googleusercontent\.com\/)/.test(String(u || ""));
export function avatar(p, grande = false) {
  const a = h("div", "ad-av" + (grande ? " g" : ""));
  if (fotoOk(p?.fotoPerfil)) { const i = document.createElement("img"); i.src = p.fotoPerfil; i.alt = ""; a.appendChild(i); } else a.textContent = iniciais(p?.nome);
  return a;
}
export function pessoaCel(p, sub) {
  const d = h("div", "ad-pessoa");
  const tx = h("div", "tx"); tx.append(h("strong", null, p?.nome || "Usuário"), h("small", null, sub ?? (p?.nickname ? "@" + p.nickname : p?.uid || "")));
  d.append(avatar(p), tx);
  return d;
}
export const selo = (texto, tipo = "neutro") => h("span", "ad-selo " + tipo, texto);
export const TIPOS_NEG = { servicos: "Freelances", delivery: "Delivery", lojinha: "Lojinha", imoveis: "Imóveis" };
export const MOTIVOS_DEN = { golpe: "Golpe ou fraude", falso: "Perfil falso", assedio: "Assédio ou ofensa", odio: "Discurso de ódio", improprio: "Conteúdo impróprio", spam: "Spam", menor: "Menor de idade", outro: "Outro" };
export const MOTIVOS_QX = { atraso: "Atraso", qualidade: "Qualidade", cobranca: "Cobrança", ausencia: "Não compareceu", atendimento: "Atendimento", golpe: "Suspeita de golpe", outro: "Outro" };

let tempoToast = null;
export function toast(t) {
  document.querySelector(".ad-toast")?.remove();
  const e = h("div", "ad-toast", t); e.setAttribute("role", "status"); document.body.appendChild(e);
  clearTimeout(tempoToast); tempoToast = setTimeout(() => e.remove(), 3500);
}

// Situação da pessoa (para selos e filtros)
export function estado(p) {
  const s = D.sancoes.get(p.uid);
  if (s && (s.tipo === "banimento" || ms(s.ate) > agora())) return s.tipo === "banimento" ? { k: "banido", t: "Banida", c: "critico" } : { k: "suspenso", t: `Suspensa até ${data(s.ate)}`, c: "serio" };
  if (D.exclusoes.has(p.uid) || p.exclusao) return { k: "exclusao", t: "Exclusão agendada", c: "atencao" };
  if (ms(p.desativadaAte) > agora() || p.desativacao) return { k: "desativado", t: "Desativada", c: "neutro" };
  return { k: "ativo", t: "Ativa", c: "bom" };
}
export const ativoHa = (p, dias) => ms(p.ultimoAcesso) > agora() - dias * DIA;

// ---------- janelas ----------
export function modal({ titulo, texto = "", campos = [], botao = "Confirmar", perigo = false }) {
  return new Promise((resolver) => {
    const fundo = h("div", "ad-modal-fundo");
    const cx = h("form", "ad-modal"); cx.setAttribute("role", "dialog"); cx.setAttribute("aria-modal", "true");
    cx.append(h("h3", null, titulo)); if (texto) cx.append(h("p", null, texto));
    const els = {};
    campos.forEach((c) => {
      const w = h("div", "ad-campo"); const l = h("label", null, c.rotulo); w.appendChild(l);
      let inp;
      if (c.tipo === "select") { inp = document.createElement("select"); c.opcoes.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; inp.appendChild(o); }); }
      else if (c.tipo === "textarea") { inp = document.createElement("textarea"); inp.maxLength = c.max || 2000; }
      else { inp = document.createElement("input"); inp.type = c.tipo || "text"; if (c.max) inp.maxLength = c.max; }
      if (c.valor != null) inp.value = c.valor;
      if (c.dica) inp.placeholder = c.dica;
      w.appendChild(inp); cx.appendChild(w); els[c.nome] = inp;
    });
    const ac = h("div", "ad-acoes");
    const no = h("button", "ad-bt", "Cancelar"); no.type = "button";
    const ok = h("button", "ad-bt " + (perigo ? "perigo cheio" : "pri"), botao); ok.type = "submit";
    ac.append(no, ok); cx.appendChild(ac); fundo.appendChild(cx); document.body.appendChild(fundo);
    const fim = (v) => { fundo.remove(); resolver(v); };
    no.addEventListener("click", () => fim(null));
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fim(null); });
    fundo.addEventListener("keydown", (e) => { if (e.key === "Escape") fim(null); });
    cx.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = {}; for (const [k, el] of Object.entries(els)) v[k] = el.value.trim();
      const falta = campos.find((c) => c.obrigatorio && !v[c.nome]);
      if (falta) { toast(`Preencha: ${falta.rotulo}`); els[falta.nome].focus(); return; }
      fim(v);
    });
    (Object.values(els)[0] || ok).focus();
  });
}

// ---------- ações (todas registradas) ----------
export async function registrar(acao, alvo = "", detalhe = "") {
  const { fb } = C;
  try { await fb.addDoc(fb.collection(fb.db, "admin_log"), { acao, alvo, detalhe: String(detalhe).slice(0, 1000), por: C.eu.uid, porNome: C.nome, em: fb.serverTimestamp() }); }
  catch (e) { console.warn("Registro de ação falhou:", e); }
  try { C.contadores(); } catch {}
}
export async function enviarAviso(uid, { titulo, texto, tipo = "info" }) {
  const { fb } = C;
  await fb.addDoc(fb.collection(fb.db, "avisos"), { uid, titulo: titulo.slice(0, 120), texto: texto.slice(0, 2000), tipo, por: C.eu.uid, em: fb.serverTimestamp(), lidoEm: null });
  await registrar("aviso", uid, `${tipo}: ${titulo}`);
}
// Esconde (ate = data) ou mostra (null) o conteúdo público de alguém.
async function marcarConteudo(uid, ate) {
  const { fb } = C;
  const valor = ate ? fb.Timestamp.fromDate(ate) : null;
  const buscar = (col, campo) => fb.getDocs(fb.query(fb.collection(fb.db, col), fb.where(campo, "==", uid))).catch(() => ({ docs: [] }));
  const [neg, an, posts] = await Promise.all([buscar("negocios", "donoId"), buscar("anuncios", "donoId"), buscar("diario", "autorId")]);
  const refs = [...neg.docs, ...an.docs, ...posts.docs].map((d) => d.ref);
  for (let i = 0; i < refs.length; i += 400) { const b = fb.writeBatch(fb.db); refs.slice(i, i + 400).forEach((r) => b.update(r, { ocultoAte: valor })); await b.commit(); }
  await fb.updateDoc(fb.doc(fb.db, "perfis_publicos", uid), { desativadaAte: valor }).catch(() => {});
  const marca = ate ? { toMillis: () => ate.getTime() } : null;
  [...D.negocios, ...D.anuncios].filter((x) => x.donoId === uid).forEach((x) => { x.ocultoAte = marca; });
  D.posts.filter((x) => x.autorId === uid).forEach((x) => { x.ocultoAte = marca; });
  const p = D.pessoas.get(uid); if (p) p.desativadaAte = marca;
}
const SEM_DATA = new Date("2999-12-31T00:00:00Z");
export async function sancionar(uid, { tipo, dias = 0, motivo }) {
  const { fb } = C;
  const ate = tipo === "banimento" ? null : new Date(agora() + dias * DIA);
  const atual = D.sancoes.get(uid);
  const historico = [...(atual?.historico || []), { tipo, motivo: motivo.slice(0, 300), ate: ate ? ate.toISOString() : null, em: new Date().toISOString(), por: C.nome || C.eu.uid }].slice(-50);
  await fb.setDoc(fb.doc(fb.db, "sancoes", uid), { tipo, motivo: motivo.slice(0, 500), ate: ate ? fb.Timestamp.fromDate(ate) : null, por: C.eu.uid, em: fb.serverTimestamp(), historico });
  await marcarConteudo(uid, ate || SEM_DATA);
  await enviarAviso(uid, {
    titulo: tipo === "banimento" ? "Sua conta foi banida" : `Sua conta foi suspensa por ${dias} ${dias === 1 ? "dia" : "dias"}`,
    texto: `${tipo === "banimento" ? "Sua conta foi banida do Help Floripa" : `Sua conta fica suspensa até ${ate.toLocaleDateString("pt-BR")}`} por descumprir os Termos de Uso.\n\nMotivo: ${motivo}\n\nSe achar que foi um engano, abra um chamado no suporte.`,
    tipo: "grave"
  });
  await registrar(tipo === "banimento" ? "banir" : "suspender", uid, `${tipo === "banimento" ? "sem prazo" : dias + " dias"} · ${motivo}`);
  D.sancoes.set(uid, { tipo, motivo, ate: ate ? { toMillis: () => ate.getTime() } : null, historico });
}
export async function tirarSancao(uid, motivo = "Sanção removida pela equipe") {
  const { fb } = C;
  const atual = D.sancoes.get(uid) || {};
  const historico = [...(atual.historico || []), { tipo: "removida", motivo, em: new Date().toISOString(), por: C.nome || C.eu.uid }].slice(-50);
  // Mantém o histórico: vira uma "suspensão" que já terminou.
  await fb.setDoc(fb.doc(fb.db, "sancoes", uid), { tipo: "suspensao", motivo, ate: fb.serverTimestamp(), por: C.eu.uid, em: fb.serverTimestamp(), historico });
  const p = D.pessoas.get(uid) || {};
  if (!p.desativacao && !p.exclusao) await marcarConteudo(uid, null); // se a própria pessoa desativou, continua escondido
  await enviarAviso(uid, { titulo: "Sua conta foi liberada", texto: "A restrição da sua conta foi removida. Obrigado por seguir os Termos de Uso.", tipo: "info" });
  await registrar("remover_sancao", uid, motivo);
  D.sancoes.set(uid, { tipo: "suspensao", ate: { toMillis: () => agora() - 1 }, historico });
}
export async function definirSelo(uid, sim) {
  const { fb } = C;
  await fb.updateDoc(fb.doc(fb.db, "usuarios", uid), { verificado: sim, solicitacaoVerificacao: false, verificacaoRespondidaEm: fb.serverTimestamp() });
  await fb.updateDoc(fb.doc(fb.db, "perfis_publicos", uid), { verificado: sim }).catch(() => {});
  const p = D.pessoas.get(uid); if (p) { p.verificado = sim; p.solicitacaoVerificacao = false; }
  await registrar(sim ? "verificar" : "tirar_selo", uid);
}

// Fluxos com janela (usados na ficha, nas denúncias e nas verificações)
export async function fluxoAviso(uid) {
  const v = await modal({ titulo: "Enviar aviso", texto: "A pessoa vê o aviso na próxima vez que abrir o site.", campos: [
    { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: [["info", "Informativo"], ["alerta", "Alerta (comportamento)"], ["grave", "Grave (última chance)"]] },
    { nome: "titulo", rotulo: "Título", max: 120, obrigatorio: true, dica: "Ex.: Evite combinar pagamento fora do chat" },
    { nome: "texto", rotulo: "Mensagem", tipo: "textarea", obrigatorio: true }
  ], botao: "Enviar aviso" });
  if (!v) return false;
  await enviarAviso(uid, v); toast("Aviso enviado"); return true;
}
export async function fluxoSancao(uid, tipoInicial = "suspensao") {
  const banir = tipoInicial === "banimento";
  const v = await modal({ titulo: banir ? "Banir conta" : "Suspender conta",
    texto: banir ? "A pessoa não consegue publicar, mandar mensagens, avaliar nem anunciar, e tudo dela some do site. Recebe um aviso com o motivo e pode contestar no suporte." : "Durante a suspensão a pessoa não age no site e o conteúdo dela fica escondido. Tudo volta sozinho no fim do prazo.",
    campos: [
      ...(banir ? [] : [{ nome: "dias", rotulo: "Duração", tipo: "select", opcoes: [["1", "1 dia"], ["3", "3 dias"], ["7", "7 dias"], ["15", "15 dias"], ["30", "30 dias"], ["90", "90 dias"]], valor: "7" }]),
      { nome: "motivo", rotulo: "Motivo (a pessoa vai ver)", tipo: "textarea", obrigatorio: true, max: 500 }
    ], botao: banir ? "Banir" : "Suspender", perigo: true });
  if (!v) return false;
  await sancionar(uid, { tipo: banir ? "banimento" : "suspensao", dias: Number(v.dias || 0), motivo: v.motivo });
  toast(banir ? "Conta banida" : "Conta suspensa"); return true;
}

// ---------- ficha completa do usuário ----------
export async function abrirFicha(uid) {
  const { fb } = C;
  document.querySelector(".ad-gaveta-fundo")?.remove(); document.querySelector(".ad-gaveta")?.remove();
  const fundo = h("div", "ad-gaveta-fundo"), g = h("aside", "ad-gaveta"); g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true");
  const topo = h("div", "ad-gaveta-topo"); const tt = h("h2", null, "Ficha do usuário");
  const x = h("button", "ad-icone"); x.type = "button"; x.setAttribute("aria-label", "Fechar"); x.innerHTML = '<svg class="i s"><use href="#i-fechar"/></svg>';
  topo.append(tt, x);
  const corpo = h("div", "ad-gaveta-corpo"); corpo.appendChild(h("div", "ad-vazio", "Carregando ficha..."));
  g.append(topo, corpo); document.body.append(fundo, g);
  const fechar = () => { fundo.remove(); g.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape" && !document.querySelector(".ad-modal-fundo")) fechar(); };
  x.addEventListener("click", fechar); fundo.addEventListener("click", fechar); document.addEventListener("keydown", tecla);

  let p = D.pessoas.get(uid);
  if (!p) {
    const [u, pp] = await Promise.all([fb.getDoc(fb.doc(fb.db, "usuarios", uid)).catch(() => null), fb.getDoc(fb.doc(fb.db, "perfis_publicos", uid)).catch(() => null)]);
    p = { uid, ...(pp?.exists() ? pp.data() : {}), ...(u?.exists() ? u.data() : {}) };
  }
  const contar = (col, ...f) => fb.getCountFromServer(fb.query(fb.collection(fb.db, col), ...f)).then((s) => s.data().count).catch(() => "—");
  const lista = (col, ...f) => fb.getDocs(fb.query(fb.collection(fb.db, col), ...f, fb.limit(50))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []);
  const [seguidores, seguindo, posts, conversas, comentarios, avFeitas, avRecebidas, queixasContra, queixasFeitas, denContra, denFeitas, avisos, chamados] = await Promise.all([
    contar("relacoes", fb.where("alvoId", "==", uid)), contar("relacoes", fb.where("seguidorId", "==", uid)), contar("diario", fb.where("autorId", "==", uid)),
    contar("conversas", fb.where("participantes", "array-contains", uid)), contar("comentarios", fb.where("autorId", "==", uid)),
    lista("avaliacoes", fb.where("autorId", "==", uid)), lista("avaliacoes", fb.where("alvoId", "==", uid)),
    lista("queixas", fb.where("alvoId", "==", uid)), lista("queixas", fb.where("autorId", "==", uid)),
    lista("denuncias", fb.where("alvoId", "==", uid)), contar("denuncias", fb.where("autorId", "==", uid)),
    lista("avisos", fb.where("uid", "==", uid)), lista("suporte", fb.where("uid", "==", uid))
  ]);
  const negocios = D.negocios.filter((n) => n.donoId === uid);
  const anuncios = D.anuncios.filter((a) => a.donoId === uid);
  const sancao = D.sancoes.get(uid);
  const st = estado(p);
  const mediaRec = avRecebidas.length ? avRecebidas.reduce((a, b) => a + (Number(b.nota) || 0), 0) / avRecebidas.length : 0;

  corpo.replaceChildren();
  // cabeçalho
  const cab = h("div", "ad-ficha-cab"); const tx = h("div");
  tx.append(h("h3", null, p.nome || "Usuário"), h("p", null, [p.nickname ? "@" + p.nickname : "", nomeCidade(p.cidade)].filter(Boolean).join(" · ") || uid));
  const selos = h("div", "ad-selos"); selos.append(selo(st.t, st.c));
  if (p.verificado) selos.append(selo("Verificado", "info"));
  if (p.solicitacaoVerificacao) selos.append(selo("Pediu verificação", "atencao"));
  if (D.admins.some((a) => a.id === uid)) selos.append(selo("Equipe", "info"));
  if (denContra.length >= 3) selos.append(selo(`${denContra.length} denúncias`, "critico"));
  tx.appendChild(selos); cab.append(avatar(p, true), tx); corpo.appendChild(cab);

  // ações
  const ac = h("div", "ad-acoes");
  const bt = (t, cls, fn) => { const b = h("button", "ad-bt " + cls, t); b.type = "button"; b.addEventListener("click", async () => { b.disabled = true; try { if (await fn()) { await C.recarregar(false); abrirFicha(uid); } } catch (e) { console.error(e); toast("Não foi possível: " + (e.code || e.message)); } finally { b.disabled = false; } }); ac.appendChild(b); };
  bt("Enviar aviso", "", () => fluxoAviso(uid));
  const sancionado = st.k === "suspenso" || st.k === "banido";
  if (sancionado) bt("Remover sanção", "pri", async () => { if (!confirm("Remover a suspensão/banimento desta conta?")) return false; await tirarSancao(uid); toast("Sanção removida"); return true; });
  else { bt("Suspender", "perigo", () => fluxoSancao(uid, "suspensao")); bt("Banir", "perigo", () => fluxoSancao(uid, "banimento")); }
  bt(p.verificado ? "Tirar selo" : "Dar selo verificado", "", async () => { const dar = !p.verificado; await definirSelo(uid, dar); if (dar) await enviarAviso(uid, { titulo: "Seu perfil foi verificado", texto: "Parabéns! Seu perfil agora tem o selo de verificado.", tipo: "info" }); toast("Selo atualizado"); return true; });
  const ver = h("a", "ad-bt", "Ver perfil no site"); ver.href = `usuarios.html?perfil=${encodeURIComponent(uid)}`; ver.target = "_blank"; ac.appendChild(ver);
  if (p.email) { const em = h("a", "ad-bt", "E-mail"); em.href = `mailto:${p.email}`; ac.appendChild(em); }
  const tel = String(p.telefone || "").replace(/\D/g, ""); if (tel.length >= 10) { const w = h("a", "ad-bt", "WhatsApp"); w.href = `https://wa.me/55${tel}`; w.target = "_blank"; w.rel = "noopener"; ac.appendChild(w); }
  corpo.appendChild(ac);

  // números
  const mini = h("div", "ad-mini");
  [[seguidores, "seguidores"], [seguindo, "seguindo"], [posts, "publicações"], [comentarios, "comentários"], [conversas, "conversas"], [negocios.length, "negócios"], [anuncios.length, "anúncios"],
   [avRecebidas.length ? `${mediaRec.toFixed(1).replace(".", ",")}★` : "—", `nota (${avRecebidas.length})`], [avFeitas.length, "avaliações feitas"], [queixasContra.length, "reclamações recebidas"], [queixasFeitas.length, "reclamações feitas"], [denContra.length, "denúncias contra"], [denFeitas, "denúncias feitas"]
  ].forEach(([v, r]) => { const d = h("div"); d.append(h("b", null, String(v)), h("span", null, r)); mini.appendChild(d); });
  const bNum = h("div", "ad-bloco"); bNum.append(h("h3", null, "Atividade")); bNum.appendChild(mini); bNum.querySelector("h3").style.marginBottom = "10px"; corpo.appendChild(bNum);

  // dados da conta
  const dl = h("dl", "ad-dados");
  const par = (k, v, copiar) => { const d = h("div"); d.append(h("dt", null, k)); const dd = h("dd", null, v || "—"); if (copiar && v) { dd.style.cursor = "copy"; dd.title = "Clique para copiar"; dd.addEventListener("click", () => { navigator.clipboard?.writeText(v); toast("Copiado"); }); } d.append(dd); dl.appendChild(d); };
  const id = idade(p.dataNascimento);
  par("ID da conta", uid, true); par("E-mail", p.email, true); par("Telefone", p.telefone, true);
  par("Nascimento", p.dataNascimento ? `${new Date(p.dataNascimento + "T00:00:00").toLocaleDateString("pt-BR")}${id != null ? ` (${id} anos)` : ""}` : "");
  par("Cidade", nomeCidade(p.cidade)); par("Endereço", p.endereco?.rua ? [p.endereco.rua, p.endereco.numero, p.endereco.bairro, nomeCidade(p.endereco.cidade), p.endereco.uf].filter(Boolean).join(", ") : "");
  par("Cadastro", dataHora(p.criadoEm)); par("Último acesso", p.ultimoAcesso ? `${dataHora(p.ultimoAcesso)} (${relativo(p.ultimoAcesso)})` : (p.privacidade?.mostrarOnline === false ? "Oculto pela pessoa" : "—"));
  par("Bio", p.bio); par("Privacidade", p.privacidade ? `Online ${p.privacidade.mostrarOnline === false ? "oculto" : "visível"} · Leitura ${p.privacidade.confirmacaoLeitura === false ? "desligada" : "ligada"}` : "Padrão");
  if (p.desativacao) par("Desativação", `${p.desativacao.modo === "automatica" ? "Volta em " + data(p.desativacao.ate) : "Até reativar"} · motivo: ${p.desativacao.motivo || "—"}${p.desativacao.detalhe ? " — " + p.desativacao.detalhe : ""}`);
  if (p.exclusao) par("Exclusão", `Pedida em ${data(p.exclusao.pedidaEm)} · ${p.exclusao.motivo || "sem motivo"}`);
  const bDados = h("div", "ad-bloco"); bDados.append(h("h3", null, "Dados da conta"), h("p", null, "Dados pessoais: use só para atendimento e moderação.")); bDados.appendChild(dl); dl.style.marginTop = "10px"; corpo.appendChild(bDados);

  // negócios
  if (negocios.length || anuncios.length) {
    const b = h("div", "ad-bloco"); b.append(h("h3", null, "Negócios"));
    const l = h("div", "ad-hist"); l.style.marginTop = "10px";
    negocios.forEach((n) => { const r = D.notas.get("neg_" + n.id); const d = h("div"); d.textContent = `${TIPOS_NEG[n.tipo] || n.tipo} · ${n.nome || "sem nome"}${r?.total ? ` · ${(r.soma / r.total).toFixed(1).replace(".", ",")}★ (${r.total})` : ""}${ms(n.ocultoAte) > agora() ? " · escondido" : ""}`; l.appendChild(d); });
    if (anuncios.length) l.appendChild(h("div", null, `${anuncios.length} anúncio(s) de imóvel`));
    b.appendChild(l); corpo.appendChild(b);
  }
  // denúncias contra
  if (denContra.length) {
    const b = h("div", "ad-bloco"); b.append(h("h3", null, `Denúncias contra (${denContra.length})`));
    const l = h("div", "ad-hist"); l.style.marginTop = "10px";
    denContra.sort((a, b2) => ms(b2.criadoEm) - ms(a.criadoEm)).slice(0, 10).forEach((d) => l.appendChild(h("div", null, `${data(d.criadoEm)} · ${MOTIVOS_DEN[d.motivo] || d.motivo} · ${d.tipo} · ${d.status}${d.trecho ? ` — "${d.trecho.slice(0, 90)}"` : ""}`)));
    b.appendChild(l); corpo.appendChild(b);
  }
  // reclamações
  if (queixasContra.length) {
    const b = h("div", "ad-bloco"); b.append(h("h3", null, `Reclamações recebidas (${queixasContra.length})`));
    const l = h("div", "ad-hist"); l.style.marginTop = "10px";
    queixasContra.slice(0, 10).forEach((q) => l.appendChild(h("div", null, `${data(q.abertaEm)} · ${MOTIVOS_QX[q.motivo] || q.motivo} · ${q.status}${q.resposta ? " · respondida" : ""}`)));
    b.appendChild(l); corpo.appendChild(b);
  }
  // sanções e avisos
  const hist = [...(sancao?.historico || []).map((x) => ({ quando: Date.parse(x.em), t: `${x.tipo === "removida" ? "Sanção removida" : x.tipo === "banimento" ? "Banida" : "Suspensa"}${x.ate ? " até " + new Date(x.ate).toLocaleDateString("pt-BR") : ""} · ${x.motivo || ""} · por ${x.por || "equipe"}` })),
    ...avisos.map((a) => ({ quando: ms(a.em), t: `Aviso (${a.tipo}): ${a.titulo}${a.lidoEm ? " · lido" : " · não lido"}` })),
    ...chamados.map((c) => ({ quando: ms(c.criadoEm), t: `Chamado: ${c.assunto} · ${c.status}` }))].sort((a, b2) => b2.quando - a.quando);
  const bH = h("div", "ad-bloco"); bH.append(h("h3", null, "Histórico com a equipe"));
  const lH = h("div", "ad-hist"); lH.style.marginTop = "10px";
  if (!hist.length) lH.appendChild(h("div", null, "Nenhum aviso, sanção ou chamado."));
  hist.forEach((x) => lH.appendChild(h("div", null, `${x.quando ? new Date(x.quando).toLocaleDateString("pt-BR") : ""} · ${x.t}`)));
  bH.appendChild(lH); corpo.appendChild(bH);
}
