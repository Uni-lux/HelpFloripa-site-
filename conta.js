// =====================================================
// Estado da conta: desativar, reativar, excluir (30 dias) e recuperar.
// Usado por configuracoes.js (pedidos) e conta.html (reativar / recuperar).
//
// DESATIVAR
//   - perfil, publicações, negócios e anúncios ficam escondidos (ocultoAte);
//   - ninguém consegue mandar mensagem (regra do Firestore: desativadaAte);
//   - seguidores, conversas, avaliações e reclamações ficam guardados;
//   - volta sozinha na data escolhida (ocultoAte vence) ou quando a pessoa
//     entrar e tocar em "Reativar".
// EXCLUIR
//   - a conta fica desativada na hora e pode ser recuperada por 30 dias;
//   - depois disso, ao entrar, a exclusão é concluída; quem não voltar é
//     apagado pela limpeza automática (scripts/limpeza, Admin SDK).
// =====================================================

export const DIAS_RECUPERAR = 30;
// "Sem data" (reativar só manualmente / exclusão pedida): uma data bem distante.
export const SEM_DATA = new Date("2999-12-31T00:00:00Z");
const ms = (t) => t?.toMillis?.() ?? (t instanceof Date ? t.getTime() : 0);

export const MOTIVOS_DESATIVAR = [
  ["pausa", "Vou dar um tempo"],
  ["notificacoes", "Recebo notificações demais"],
  ["privacidade", "Preocupação com privacidade"],
  ["nao-encontro", "Não estou encontrando o que preciso"],
  ["outra-conta", "Criei outra conta"],
  ["seguranca", "Problema de segurança ou alguém me incomodando"],
  ["outro", "Outro motivo"]
];

// Situação da conta a partir de usuarios/{uid}.
export function estadoConta(d = {}) {
  const agora = Date.now();
  if (d.exclusao?.pedidaEm) {
    const apagarEm = ms(d.exclusao.pedidaEm) + DIAS_RECUPERAR * 864e5;
    return { tipo: "exclusao", apagarEm, vencida: agora >= apagarEm, faltam: Math.max(0, Math.ceil((apagarEm - agora) / 864e5)) };
  }
  if (d.desativacao) {
    const ate = ms(d.desativacao.ate);
    if (!d.desativacao.ate || ate > agora) return { tipo: "desativada", ate: d.desativacao.ate ? ate : 0, desde: ms(d.desativacao.em), automatica: !!d.desativacao.ate };
    return { tipo: "ativa", vencida: true }; // reativação automática já passou: só falta limpar os campos
  }
  return { tipo: "ativa" };
}

// Esconde (ate = data) ou mostra (ate = null) tudo o que é público da pessoa.
async function marcarConteudo(fb, uid, ate) {
  const valor = ate ? fb.Timestamp.fromDate(ate) : null;
  const buscar = (col, campo) => fb.getDocs(fb.query(fb.collection(fb.db, col), fb.where(campo, "==", uid))).catch(() => ({ docs: [] }));
  const [neg, an, posts] = await Promise.all([buscar("negocios", "donoId"), buscar("anuncios", "donoId"), buscar("diario", "autorId")]);
  const refs = [...neg.docs, ...an.docs, ...posts.docs].map((d) => d.ref);
  for (let i = 0; i < refs.length; i += 400) {
    const lote = fb.writeBatch(fb.db);
    refs.slice(i, i + 400).forEach((r) => lote.update(r, { ocultoAte: valor }));
    await lote.commit();
  }
  await fb.setDoc(fb.doc(fb.db, "perfis_publicos", uid), { uid, desativadaAte: valor, ultimoAcesso: null }, { merge: true });
}

function esquecerSessao(uid) {
  try { sessionStorage.removeItem("hf-conta-ok-" + uid); } catch {}
}

// reativarEm: Date (volta sozinha) ou null (só quando a pessoa entrar e reativar).
export async function desativarConta(fb, uid, { motivo, detalhe = "", reativarEm = null }) {
  const ate = reativarEm || SEM_DATA;
  await marcarConteudo(fb, uid, ate);
  await fb.setDoc(fb.doc(fb.db, "usuarios", uid), {
    desativacao: {
      em: fb.serverTimestamp(), ate: reativarEm ? fb.Timestamp.fromDate(reativarEm) : null,
      modo: reativarEm ? "automatica" : "manual", motivo: String(motivo || "outro").slice(0, 30), detalhe: String(detalhe || "").slice(0, 300)
    }
  }, { merge: true });
  esquecerSessao(uid);
}

export async function pedirExclusao(fb, uid, { motivo = "" } = {}) {
  await fb.setDoc(fb.doc(fb.db, "exclusoes", uid), { pedidaEm: fb.serverTimestamp(), motivo: String(motivo || "").slice(0, 300) });
  await marcarConteudo(fb, uid, SEM_DATA);
  await fb.setDoc(fb.doc(fb.db, "usuarios", uid), { exclusao: { pedidaEm: fb.serverTimestamp(), motivo: String(motivo || "").slice(0, 300) } }, { merge: true });
  esquecerSessao(uid);
}

// Reativar (desativação) ou recuperar (exclusão dentro dos 30 dias).
export async function reativarConta(fb, uid) {
  await fb.deleteDoc(fb.doc(fb.db, "exclusoes", uid)).catch(() => {});
  await marcarConteudo(fb, uid, null);
  await fb.updateDoc(fb.doc(fb.db, "usuarios", uid), { desativacao: fb.deleteField(), exclusao: fb.deleteField() });
}

// Reativação automática que já venceu: só limpa os campos (o conteúdo já voltou a aparecer).
export async function limparDesativacaoVencida(fb, uid) {
  await reativarConta(fb, uid).catch(() => {});
}

// Fim do prazo de 30 dias: apaga o que a própria pessoa pode apagar e a conta de login.
// O que só o servidor pode fazer (anonimizar avaliações e reclamações, apagar estrelas
// que outros deram) fica com a limpeza automática, que lê exclusoes/{uid}.
export async function apagarTudo(fb, authFns, usuario, aoProgresso = () => {}) {
  const uid = usuario.uid;
  const col = (n) => fb.collection(fb.db, n);
  const pegar = (n, campo, op = "==") => fb.getDocs(fb.query(col(n), fb.where(campo, op, uid))).catch(() => ({ docs: [] }));
  aoProgresso("Apagando publicações, comentários e estrelas...");
  const lotes = await Promise.all([
    pegar("diario", "autorId"), pegar("comentarios", "autorId"), pegar("comentarios", "postAutorId"),
    pegar("curtidas", "uid"), pegar("curtidas_comentarios", "uid"),
    pegar("relacoes", "seguidorId"), pegar("relacoes", "alvoId"), pegar("bloqueios", "bloqueadorId"),
    pegar("vinculos", "participantes", "array-contains"), pegar("negocios", "donoId"), pegar("anuncios", "donoId")
  ]);
  const docs = [...new Map(lotes.flatMap((l) => l.docs).map((d) => [d.ref.path, d])).values()];
  await Promise.all(docs.map((d) => fb.deleteDoc(d.ref).catch(() => {})));
  aoProgresso("Apagando suas mensagens...");
  const convs = await pegar("conversas", "participantes", "array-contains");
  for (const c of convs.docs) {
    const minhas = await fb.getDocs(fb.query(fb.collection(fb.db, "conversas", c.id, "mensagens"), fb.where("remetenteId", "==", uid))).catch(() => ({ docs: [] }));
    await Promise.all(minhas.docs.map((m) => fb.deleteDoc(m.ref).catch(() => {})));
  }
  aoProgresso("Apagando seu perfil...");
  const u = await fb.getDoc(fb.doc(fb.db, "usuarios", uid)).catch(() => null);
  const nick = u?.exists() ? u.data().nickname : "";
  if (nick) {
    const n = await fb.getDoc(fb.doc(fb.db, "nicknames", nick)).catch(() => null);
    if (n?.exists() && n.data().uid === uid) await fb.deleteDoc(n.ref).catch(() => {});
  }
  await fb.deleteDoc(fb.doc(fb.db, "perfis_publicos", uid)).catch(() => {});
  await fb.deleteDoc(fb.doc(fb.db, "usuarios", uid)).catch(() => {});
  aoProgresso("Encerrando a conta de login...");
  await authFns.deleteUser(usuario);
}

// ---------- confirmar identidade ----------
// O Firebase exige login recente para trocar senha/e-mail e excluir. Senha: pede na tela.
export const provedor = (usuario) => (usuario?.providerData || []).map((p) => p.providerId).includes("password") ? "password"
  : (usuario?.providerData || []).some((p) => p.providerId === "google.com") ? "google.com" : "";

export function pedirSenha({ titulo = "Confirme sua senha", texto = "Por segurança, digite a senha da sua conta." } = {}) {
  return new Promise((resolver) => {
    const fundo = document.createElement("div");
    fundo.className = "hf-senha-fundo";
    fundo.innerHTML = `<style>
      .hf-senha-fundo{position:fixed;inset:0;z-index:9700;display:grid;place-items:center;padding:20px;background:rgba(2,6,9,.78);backdrop-filter:blur(4px)}
      .hf-senha{width:min(400px,100%);background:var(--panel,#10181d);color:var(--text,#eef3f5);border:1px solid var(--line,#22313a);border-radius:20px;padding:20px;display:grid;gap:12px;font-family:inherit}
      .hf-senha h3{margin:0;font-size:18px}.hf-senha p{margin:0;font-size:14px;color:var(--muted,#8fa0ab)}
      .hf-senha input{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--line,#22313a);background:var(--panel-2,#162128);color:inherit;font:inherit;font-size:15px}
      .hf-senha .bts{display:flex;gap:8px}.hf-senha button{flex:1;min-height:44px;border:0;border-radius:12px;font:inherit;font-weight:800;cursor:pointer}
      .hf-senha .ok{background:var(--accent,#00adee);color:#fff}.hf-senha .nao{background:rgba(140,160,171,.15);color:inherit}
    </style><form class="hf-senha" role="dialog" aria-modal="true"><h3></h3><p></p><input type="password" autocomplete="current-password" placeholder="Sua senha" aria-label="Senha" required /><div class="bts"><button type="button" class="nao">Cancelar</button><button type="submit" class="ok">Confirmar</button></div></form>`;
    fundo.querySelector("h3").textContent = titulo;
    fundo.querySelector("p").textContent = texto;
    const inp = fundo.querySelector("input");
    const fim = (v) => { fundo.remove(); resolver(v); };
    fundo.querySelector(".nao").addEventListener("click", () => fim(null));
    fundo.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); if (inp.value) fim(inp.value); });
    fundo.addEventListener("keydown", (e) => { if (e.key === "Escape") fim(null); });
    document.body.appendChild(fundo);
    inp.focus();
  });
}

// Devolve true se confirmou; false se a pessoa cancelou. Erros de senha sobem.
export async function reautenticar(authFns, usuario, opcoes) {
  const p = provedor(usuario);
  if (p === "password") {
    const senha = await pedirSenha(opcoes);
    if (!senha) return false;
    await authFns.reauthenticateWithCredential(usuario, authFns.EmailAuthProvider.credential(usuario.email, senha));
    return true;
  }
  if (p === "google.com") { await authFns.reauthenticateWithPopup(usuario, new authFns.GoogleAuthProvider()); return true; }
  return true;
}
