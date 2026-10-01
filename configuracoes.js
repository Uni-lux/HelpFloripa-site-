// =====================================================
// Configurações da conta (configuracoes.html)
// Conta, endereço, aparência, privacidade, notificações,
// contas bloqueadas e restritas, sair e excluir a conta.
// =====================================================
import {
  $, pintarAvatar, toast, erroAmigavel, abrirFolha, fecharFolha, abrirLista, config, salvarConfig, aplicarTema,
  fb, authFns, eu, refUsuario, dados, perfis, meusBloqueios, restritos, obterPerfil, linhaPessoa,
  desbloquear, alternarRestricao, marcarPresenca, iniciarRede, montarBarraRede, pintarBarraRede, ouvirAvisos
} from "./rede.js?v=4";

function pintarConfig() {
  pintarAvatar($("cfgAvatar"), dados.fotoPerfil, dados.nome);
  $("cfgNome").textContent = dados.nome || "Você";
  $("cfgEmail").textContent = dados.email || eu?.email || "";
  $("cfgVerificacaoTxt").textContent = dados.verificado ? "Seu perfil é verificado" : (dados.solicitacaoVerificacao ? "Solicitação em análise" : "Solicite o selo de perfil verificado");
  const nt = $("cfgNotifTxt");
  if (!("Notification" in window)) nt.textContent = "Não suportadas neste navegador";
  else if (Notification.permission === "granted") nt.textContent = "Ativadas";
  else if (Notification.permission === "denied") nt.textContent = "Bloqueadas nas configurações do navegador";
  else nt.textContent = "Toque para ativar";
  $("cfgBloqueadosTxt").textContent = meusBloqueios.size ? `${meusBloqueios.size} ${meusBloqueios.size === 1 ? "conta" : "contas"}` : "Ninguém bloqueado";
  $("cfgRestritosTxt").textContent = restritos.size ? `${restritos.size} ${restritos.size === 1 ? "conta" : "contas"}` : "Ninguém restrito";
  document.querySelectorAll("#cfgSocialVis [data-valor]").forEach((b) => b.classList.toggle("on", b.dataset.valor === (dados.socialVisibilidade || "todos")));
  const modoDuo = dados.duoCapa || "clicavel";
  document.querySelectorAll("#cfgDuoCapa [data-valor]").forEach((b) => b.classList.toggle("on", b.dataset.valor === modoDuo));
  $("cfgDuoTxt").textContent = {
    clicavel: "A foto do seu duo aparece na capa e abre o perfil dele.",
    foto: "A foto aparece na capa, mas ninguém consegue abrir o perfil por ela.",
    ocultar: "Ninguém vê seu duo na capa do seu perfil."
  }[modoDuo];
  $("cfgEnderecoTxt").textContent = resumoEndereco(dados.endereco) || "Privado: só você vê";
  document.querySelectorAll("#cfgTema [data-valor]").forEach((b) => b.classList.toggle("on", b.dataset.valor === config.tema));
  $("cfgOnline").checked = config.mostrarOnline !== false;
  $("cfgSons").checked = config.sons !== false;
  $("cfgLeitura").checked = config.confirmacaoLeitura !== false;
}

async function solicitarVerificacao() {
  if (dados.verificado) { toast("Seu perfil já é verificado."); return; }
  if (dados.solicitacaoVerificacao) { toast("Sua solicitação já está em análise."); return; }
  if (!confirm("Enviar pedido de verificação? Nossa equipe vai analisar seu perfil.")) return;
  try {
    await fb.setDoc(refUsuario, { solicitacaoVerificacao: true, solicitacaoVerificacaoEm: fb.serverTimestamp() }, { merge: true });
    dados.solicitacaoVerificacao = true;
    pintarConfig();
    toast("Solicitação enviada");
  } catch (e) { toast("Não foi possível enviar: " + erroAmigavel(e)); }
}

async function abrirContas(tipo) {
  const bloqueados = tipo === "bloqueados";
  const corpo = abrirLista(bloqueados ? "Contas bloqueadas" : "Contas restritas");
  const uids = [...(bloqueados ? meusBloqueios : restritos)];
  if (!uids.length) {
    const v = document.createElement("div");
    v.className = "lista-vazia";
    v.textContent = bloqueados ? "Você não bloqueou ninguém." : "Você não restringiu ninguém.";
    corpo.appendChild(v);
  }
  const lista = await Promise.all(uids.map(obterPerfil));
  uids.forEach((u, i) => corpo.appendChild(linhaPessoa({
    uid: u, nome: lista[i].nome, foto: lista[i].fotoPerfil, sub: lista[i].nickname ? "@" + lista[i].nickname : "", semSeguir: true,
    aoClicar: bloqueados ? () => {} : undefined,
    acoes: [{ rotulo: bloqueados ? "Desbloquear" : "Remover", fn: async (_b, linha) => {
      const ok = bloqueados ? await desbloquear(u) : await alternarRestricao(u, lista[i].nome);
      if (ok) { linha.remove(); pintarConfig(); }
    } }]
  })));
}

$("cfgEditar").addEventListener("click", () => { location.href = "usuarios.html?acao=editar"; });
$("cfgVerificacao").addEventListener("click", solicitarVerificacao);
$("cfgTema").addEventListener("click", (e) => {
  const b = e.target.closest("[data-valor]");
  if (!b) return;
  config.tema = b.dataset.valor;
  salvarConfig();
  pintarConfig();
});
$("cfgOnline").addEventListener("change", () => { config.mostrarOnline = $("cfgOnline").checked; salvarConfig(); marcarPresenca(); });
$("cfgSons").addEventListener("change", () => { config.sons = $("cfgSons").checked; salvarConfig(); });
$("cfgLeitura").addEventListener("change", () => { config.confirmacaoLeitura = $("cfgLeitura").checked; salvarConfig(); });
$("cfgBloqueados").addEventListener("click", () => abrirContas("bloqueados"));
$("cfgRestritos").addEventListener("click", () => abrirContas("restritos"));
$("cfgSocialVis").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-valor]");
  if (!b) return;
  const antes = dados.socialVisibilidade;
  dados.socialVisibilidade = b.dataset.valor;
  pintarConfig();
  try {
    await fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), { uid: eu.uid, socialVisibilidade: b.dataset.valor }, { merge: true });
    perfis.delete(eu.uid);
    toast("Privacidade do social atualizada");
  } catch (err) { dados.socialVisibilidade = antes; pintarConfig(); toast("Não foi possível salvar: " + erroAmigavel(err)); }
});
$("cfgDuoCapa").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-valor]");
  if (!b || b.dataset.valor === (dados.duoCapa || "clicavel")) return;
  const antes = dados.duoCapa;
  dados.duoCapa = b.dataset.valor;
  pintarConfig();
  try {
    await fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), { uid: eu.uid, duoCapa: b.dataset.valor }, { merge: true });
    perfis.delete(eu.uid);
    toast({ clicavel: "Duo clicável na capa", foto: "Duo aparece só como foto", ocultar: "Duo oculto da capa" }[b.dataset.valor]);
  } catch (err) { dados.duoCapa = antes; pintarConfig(); toast("Não foi possível salvar: " + erroAmigavel(err)); }
});

// ---------- Endereço (fica só em usuarios/{uid}, que as regras deixam só o dono ler) ----------
const CAMPOS_END = { cep: "endCep", rua: "endRua", numero: "endNumero", complemento: "endComplemento", bairro: "endBairro", cidade: "endCidade", uf: "endUf", referencia: "endReferencia" };
function resumoEndereco(e) {
  if (!e || !e.rua) return "";
  const local = [e.bairro, [e.cidade, e.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ");
  return `Cadastrado${local ? ": " + local : ""}`;
}
const soDigitos = (v) => String(v || "").replace(/\D/g, "");
function formatarCep(v) { const d = soDigitos(v).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; }
function abrirEndereco() {
  const e = dados.endereco || {};
  for (const [k, id] of Object.entries(CAMPOS_END)) $(id).value = e[k] || "";
  $("endCep").value = formatarCep(e.cep);
  $("endCepStatus").textContent = "Digite o CEP para preencher rua, bairro e cidade";
  $("endRemover").hidden = !dados.endereco;
  abrirFolha("folhaEndereco");
}
let ultimoCep = "";
$("endCep").addEventListener("input", async () => {
  const campo = $("endCep");
  campo.value = formatarCep(campo.value);
  const cep = soDigitos(campo.value);
  if (cep.length !== 8 || cep === ultimoCep) return;
  ultimoCep = cep;
  const st = $("endCepStatus");
  st.textContent = "Buscando CEP...";
  try {
    // Só o CEP é enviado ao ViaCEP; nada da sua conta vai junto.
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { referrerPolicy: "no-referrer", credentials: "omit" });
    const j = await r.json();
    if (soDigitos($("endCep").value) !== cep) return;
    if (j.erro) { st.textContent = "CEP não encontrado. Preencha à mão."; return; }
    if (j.logradouro) $("endRua").value = j.logradouro;
    if (j.bairro) $("endBairro").value = j.bairro;
    if (j.localidade) $("endCidade").value = j.localidade;
    if (j.uf) $("endUf").value = j.uf;
    st.textContent = "Endereço encontrado. Confira e informe o número.";
    $("endNumero").focus();
  } catch { st.textContent = "Não foi possível buscar o CEP agora. Preencha à mão."; }
});
$("endUf").addEventListener("input", () => { $("endUf").value = $("endUf").value.replace(/[^a-z]/gi, "").toUpperCase(); });
$("endSalvar").addEventListener("click", async () => {
  const e = {};
  for (const [k, id] of Object.entries(CAMPOS_END)) e[k] = $(id).value.trim().slice(0, 100);
  e.cep = soDigitos(e.cep);
  if (e.cep && e.cep.length !== 8) { toast("CEP inválido."); $("endCep").focus(); return; }
  if (!e.rua) { toast("Informe a rua."); $("endRua").focus(); return; }
  if (!e.cidade) { toast("Informe a cidade."); $("endCidade").focus(); return; }
  const btn = $("endSalvar");
  btn.disabled = true;
  try {
    await fb.setDoc(refUsuario, { endereco: { ...e, atualizadoEm: fb.serverTimestamp() } }, { merge: true });
    dados.endereco = e;
    pintarConfig();
    fecharFolha("folhaEndereco");
    toast("Endereço salvo com segurança");
  } catch (err) { toast("Não foi possível salvar: " + erroAmigavel(err)); }
  finally { btn.disabled = false; }
});
$("endRemover").addEventListener("click", async () => {
  if (!confirm("Remover seu endereço da conta?")) return;
  try {
    await fb.updateDoc(refUsuario, { endereco: fb.deleteField() });
    delete dados.endereco;
    pintarConfig();
    fecharFolha("folhaEndereco");
    toast("Endereço removido");
  } catch (err) { toast("Não foi possível remover: " + erroAmigavel(err)); }
});
$("cfgEndereco").addEventListener("click", abrirEndereco);

$("cfgNotifNavegador").addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") { try { await Notification.requestPermission(); } catch {} }
  else if (Notification.permission === "denied") toast("Libere as notificações nas configurações do navegador.");
  pintarConfig();
});
$("cfgSenha").addEventListener("click", async () => {
  const email = eu.email || dados.email;
  if (!email) { toast("Sua conta não tem e-mail cadastrado."); return; }
  try {
    await authFns.sendPasswordResetEmail(window.firebaseAuth, email);
    toast(`Enviamos um link para ${email}`);
  } catch (e) { toast("Não foi possível enviar o e-mail: " + erroAmigavel(e)); }
});
$("cfgSair").addEventListener("click", async () => {
  try { await authFns.signOut(window.firebaseAuth); } catch {}
  location.href = "index.html";
});
$("cfgExcluir").addEventListener("click", excluirConta);

async function excluirConta() {
  const confirmacao = prompt('Isso apaga seu perfil, suas publicações, curtidas, comentários e quem você segue, e não pode ser desfeito.\n\nPara confirmar, digite EXCLUIR:');
  if (confirmacao?.trim().toUpperCase() !== "EXCLUIR") return;
  const usuario = window.firebaseAuth.currentUser;
  try {
    // Confirma a identidade antes de apagar qualquer coisa (o Firebase exige login recente).
    const provedor = usuario.providerData[0]?.providerId;
    if (provedor === "password") {
      const senha = prompt("Por segurança, digite sua senha:");
      if (!senha) return;
      await authFns.reauthenticateWithCredential(usuario, authFns.EmailAuthProvider.credential(usuario.email, senha));
    } else if (provedor === "google.com") {
      await authFns.reauthenticateWithPopup(usuario, new authFns.GoogleAuthProvider());
    }
    toast("Excluindo sua conta...");
    const pegar = (col, campo, op = "==") => fb.getDocs(fb.query(fb.collection(fb.db, col), fb.where(campo, op, eu.uid))).catch(() => ({ docs: [] }));
    const lotes = await Promise.all([
      pegar("diario", "autorId"), pegar("relacoes", "seguidorId"), pegar("negocios", "donoId"), pegar("anuncios", "donoId"),
      pegar("vinculos", "participantes", "array-contains"), pegar("curtidas", "uid"), pegar("comentarios", "autorId")
    ]);
    await Promise.all(lotes.flatMap((l) => l.docs).map((d) => fb.deleteDoc(d.ref).catch(() => {})));
    if (dados.nickname) {
      const n = await fb.getDoc(fb.doc(fb.db, "nicknames", dados.nickname)).catch(() => null);
      if (n?.exists() && n.data().uid === eu.uid) await fb.deleteDoc(n.ref).catch(() => {});
    }
    await fb.deleteDoc(fb.doc(fb.db, "perfis_publicos", eu.uid)).catch(() => {});
    await fb.deleteDoc(refUsuario).catch(() => {});
    await authFns.deleteUser(usuario);
    alert("Sua conta foi excluída.");
    location.href = "index.html";
  } catch (e) {
    console.error(e);
    if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") toast("Senha incorreta.");
    else if (e.code === "auth/requires-recent-login") toast("Entre novamente e repita a exclusão.");
    else if (e.code !== "auth/popup-closed-by-user") toast("Não foi possível excluir: " + erroAmigavel(e));
  }
}

(async function iniciar() {
  try { await iniciarRede(); }
  catch (e) { toast(e.message || "Não foi possível carregar."); return; }
  montarBarraRede("");
  pintarBarraRede();
  ouvirAvisos({ notificarNovos: false });
  pintarConfig();
  $("cfgConteudo").hidden = false;
  $("cfgCarregando").hidden = true;
  aplicarTema();
})();
