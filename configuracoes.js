// =====================================================
// Configurações da conta (configuracoes.html)
// Conta, endereço, aparência, privacidade, notificações,
// contas bloqueadas e restritas, sair e excluir a conta.
// =====================================================
import { avisoHF } from "./confirmar.js?v=4";
import {
  $, pintarAvatar, toast, erroAmigavel, abrirFolha, fecharFolha, abrirLista, config, salvarConfig, aplicarTema,
  fb, authFns, eu, refUsuario, dados, perfis, meusBloqueios, restritos, obterPerfil, linhaPessoa,
  desbloquear, alternarRestricao, marcarPresenca, iniciarRede, montarBarraRede, pintarBarraRede, ouvirAvisos, salvarPrivacidadeConta, confirmarHF, abrirOpcoes
} from "./rede.js?v=46";
import { MOTIVOS_DESATIVAR, desativarConta, pedirExclusao, reautenticar, provedor } from "./conta.js?v=3";
import { camposEndereco, gravarComLocal, NOVOS, textoCidade } from "./endereco.js?v=1";

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
    clicavel: "Rosinha na sua foto de perfil: tocando, aparece a fotinho do seu duo, que abre o perfil.",
    foto: "Tocando na rosinha aparece a fotinho do seu duo, mas ninguém abre o perfil por ela.",
    ocultar: "A rosinha não aparece no seu perfil."
  }[modoDuo];
  $("cfgEnderecoTxt").textContent = resumoEndereco(dados.endereco) || "Privado: não aparece para outros usuários";
  document.querySelectorAll("#cfgTema [data-valor]").forEach((b) => b.classList.toggle("on", b.dataset.valor === config.tema));
  $("cfgOnline").checked = config.mostrarOnline !== false;
  $("cfgSons").checked = config.sons !== false;
  $("cfgLeitura").checked = config.confirmacaoLeitura !== false;
  // Diário e Flash
  const qc = dados.diarioConfig?.quemComenta || "todos";
  document.querySelectorAll("#cfgComenta [data-valor]").forEach((b) => b.classList.toggle("on", b.dataset.valor === qc));
  const pm = permiteMarcar || dados.permiteMarcar || "todos";
  document.querySelectorAll("#cfgMarcar [data-valor]").forEach((b) => b.classList.toggle("on", b.dataset.valor === pm));
  $("cfgMarcarTxt").textContent = { todos: "Qualquer pessoa pode marcar e mencionar você", seguindo: "Só quem você segue pode marcar e mencionar você", ninguem: "Ninguém pode marcar ou mencionar você" }[pm];
  const fc = dados.flashConfig || {};
  $("cfgFlashTxt").textContent = [fc.publico === "amigos" ? "Só Amigos próximos" : "Todos que seguem você", Array.isArray(fc.ocultarDe) && fc.ocultarDe.length ? `oculto de ${fc.ocultarDe.length}` : "", fc.respostas === "ninguem" ? "respostas desligadas" : fc.respostas === "seguindo" ? "respostas de quem você segue" : ""].filter(Boolean).join(" · ");
}
// Quem pode marcar/mencionar (pref_publicas/{uid}: os outros leem antes de marcar). Cópia em usuarios/{uid}.
let permiteMarcar = null;
async function lerPermiteMarcar() {
  try { const d = await fb.getDoc(fb.doc(fb.db, "pref_publicas", eu.uid)); permiteMarcar = d.exists() ? d.data().permiteMarcar || "todos" : null; } catch {}
  pintarConfig();
}
document.querySelectorAll("#cfgMarcar [data-valor]").forEach((b) => b.addEventListener("click", async () => {
  const v = b.dataset.valor, antes = permiteMarcar;
  permiteMarcar = v; dados.permiteMarcar = v; pintarConfig();
  fb.setDoc(refUsuario, { permiteMarcar: v }, { merge: true }).catch(() => {});
  try { await fb.setDoc(fb.doc(fb.db, "pref_publicas", eu.uid), { permiteMarcar: v, atualizadoEm: fb.serverTimestamp() }, { merge: true }); toast("Salvo"); }
  catch (e) { permiteMarcar = antes; pintarConfig(); toast(e?.code === "permission-denied" ? "Essa escolha começa a funcionar quando as regras novas forem publicadas." : "Não foi possível salvar: " + erroAmigavel(e)); }
}));
document.querySelectorAll("#cfgComenta [data-valor]").forEach((b) => b.addEventListener("click", async () => {
  const v = b.dataset.valor;
  dados.diarioConfig = { ...(dados.diarioConfig || {}), quemComenta: v }; pintarConfig();
  try { await fb.setDoc(refUsuario, { diarioConfig: { quemComenta: v } }, { merge: true }); toast("Salvo: vale para as próximas publicações"); }
  catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); }
}));
$("cfgFlash").addEventListener("click", () => import("./stories.js?v=17").then((m) => {
  m.abrirConfigFlash();
  const f = $("folhaLista"); const volta = () => { f?.removeEventListener("fechada", volta); setTimeout(pintarConfig, 60); }; f?.addEventListener("fechada", volta);
}));
$("cfgInsights").addEventListener("click", () => import("./insights.js?v=8").then((m) => m.abrirInsights()));
$("cfgGosto").addEventListener("click", async () => {
  if (!await confirmarHF({ titulo: "Recomeçar o seu Principais?", texto: "O Diário esquece o que aprendeu sobre o seu gosto neste aparelho e volta a mostrar o que está em alta.", ok: "Recomeçar", icone: "alerta", cor: "normal" })) return;
  try { localStorage.removeItem("hf-gosto"); } catch {}
  toast("Pronto: o Principais recomeçou");
});

async function solicitarVerificacao() {
  if (dados.verificado) { toast("Seu perfil já é verificado."); return; }
  if (dados.solicitacaoVerificacao) { toast("Sua solicitação já está em análise."); return; }
  if (!await confirmarHF({ titulo: "Pedir o selo de verificado?", texto: "Nossa equipe vai analisar seu perfil.", ok: "Enviar pedido", icone: "selo", cor: "normal" })) return;
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
// Online e leitura valem para a conta inteira (todos os aparelhos).
async function salvarPrivacidade() {
  try { await salvarPrivacidadeConta(); toast("Salvo em todos os seus aparelhos"); }
  catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); }
}
$("cfgOnline").addEventListener("change", () => { config.mostrarOnline = $("cfgOnline").checked; marcarPresenca(); salvarPrivacidade(); });
$("cfgSons").addEventListener("change", () => { config.sons = $("cfgSons").checked; salvarConfig(); });
$("cfgLeitura").addEventListener("change", () => { config.confirmacaoLeitura = $("cfgLeitura").checked; salvarPrivacidade(); });
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
function resumoEndereco(e) {
  if (!e || !(e.rua || e.cidade)) return "";
  const local = [e.bairro, textoCidade(e)].filter(Boolean).join(" · ");
  return `Cadastrado${local ? ": " + local : ""}`;
}
// Campos do endereço (componente comum: Estado, Cidade do IBGE, CEP que preenche o resto...).
let endCampos = null;
async function abrirEndereco() {
  const e = dados.endereco || {};
  $("endCampos").replaceChildren();
  endCampos = camposEndereco($("endCampos"), {
    campos: ["cep", "uf", "cidade", "bairro", "rua", "numero", "complemento", "referencia"],
    obrigatorios: ["uf", "cidade", "rua"],
    valor: e.cidade ? e : { uf: dados.uf, cidade: dados.cidade, cidadeIbge: dados.cidadeIbge },
    dicaCep: "Digite o CEP para preencher rua, bairro e cidade"
  });
  // Marcado quando o perfil ainda não tem cidade ou já usa a mesma do endereço.
  $("endUsarPerfil").checked = !dados.cidadeIbge || !e.cidadeIbge || dados.cidadeIbge === e.cidadeIbge;
  $("endRemover").hidden = !dados.endereco;
  abrirFolha("folhaEndereco");
}
$("endSalvar").addEventListener("click", async () => {
  if (!endCampos) return;
  const msg = endCampos.validar();
  if (msg) { toast(msg); return; }
  const e = endCampos.ler();
  const btn = $("endSalvar");
  btn.disabled = true;
  try {
    const local = { cidade: e.cidade, uf: e.uf, cidadeIbge: e.cidadeIbge };
    const usarNoPerfil = $("endUsarPerfil").checked;
    await fb.setDoc(refUsuario, { endereco: { ...e, atualizadoEm: fb.serverTimestamp() }, ...(usarNoPerfil ? local : {}) }, { merge: true });
    if (usarNoPerfil) {
      await gravarComLocal((d) => fb.setDoc(fb.doc(fb.db, "perfis_publicos", eu.uid), d, { merge: true }), { uid: eu.uid, ...local }, NOVOS.perfil);
      Object.assign(dados, local);
      perfis.delete(eu.uid);
    }
    dados.endereco = e;
    pintarConfig();
    fecharFolha("folhaEndereco");
    toast("Endereço salvo com segurança");
  } catch (err) { toast("Não foi possível salvar: " + erroAmigavel(err)); }
  finally { btn.disabled = false; }
});
$("endRemover").addEventListener("click", async () => {
  if (!(await confirmarHF({ titulo: "Remover seu endereço?", texto: "O endereço sai da sua conta. A cidade do seu perfil continua.", ok: "Remover", icone: "lixo" }))) return;
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
// ---------- senha e e-mail ----------
const erroSenha = (e) => (e?.code === "auth/wrong-password" || e?.code === "auth/invalid-credential" ? "Senha atual incorreta."
  : e?.code === "auth/weak-password" ? "A nova senha é fraca. Use pelo menos 6 caracteres."
  : e?.code === "auth/too-many-requests" ? "Muitas tentativas. Espere alguns minutos e tente de novo."
  : e?.code === "auth/email-already-in-use" ? "Esse e-mail já é usado por outra conta."
  : e?.code === "auth/invalid-email" ? "Digite um e-mail válido."
  : e?.code === "auth/requires-recent-login" ? "Por segurança, saia e entre de novo antes de trocar."
  : "Não foi possível concluir: " + erroAmigavel(e));
const usuarioAtual = () => window.firebaseAuth.currentUser;
const credencial = (senha) => authFns.EmailAuthProvider.credential(usuarioAtual().email, senha);

$("cfgSenha").addEventListener("click", () => {
  const google = provedor(usuarioAtual()) === "google.com";
  $("senhaGoogle").hidden = !google; $("formSenha").hidden = google; $("senhaSalvar").hidden = google;
  ["senhaAtual", "senhaNova", "senhaConfirma"].forEach((id) => { $(id).value = ""; });
  abrirFolha("folhaSenha");
});
$("senhaSalvar").addEventListener("click", async () => {
  const atual = $("senhaAtual").value, nova = $("senhaNova").value;
  if (!atual) { toast("Digite sua senha atual."); $("senhaAtual").focus(); return; }
  if (nova.length < 6) { toast("A nova senha precisa ter pelo menos 6 caracteres."); $("senhaNova").focus(); return; }
  if (nova !== $("senhaConfirma").value) { toast("As senhas novas não são iguais."); $("senhaConfirma").focus(); return; }
  if (nova === atual) { toast("A nova senha precisa ser diferente da atual."); return; }
  const b = $("senhaSalvar"); b.disabled = true;
  try {
    await authFns.reauthenticateWithCredential(usuarioAtual(), credencial(atual));
    await authFns.updatePassword(usuarioAtual(), nova);
    fecharFolha("folhaSenha");
    toast("Senha alterada. Use a nova senha da próxima vez que entrar.");
  } catch (e) { toast(erroSenha(e)); }
  finally { b.disabled = false; }
});
$("senhaEsqueci").addEventListener("click", async () => {
  const email = usuarioAtual()?.email;
  if (!email) { toast("Sua conta não tem e-mail cadastrado."); return; }
  try { await authFns.sendPasswordResetEmail(window.firebaseAuth, email); toast(`Enviamos um link para ${email} criar uma nova senha.`); }
  catch (e) { toast(erroSenha(e)); }
});

$("cfgEmailTrocar").addEventListener("click", () => {
  const google = provedor(usuarioAtual()) === "google.com";
  $("emailGoogle").hidden = !google; $("formEmail").hidden = google; $("emailSalvar").hidden = google;
  $("emailAtual").value = usuarioAtual()?.email || ""; $("emailNovo").value = ""; $("emailSenha").value = "";
  abrirFolha("folhaEmail");
});
$("emailSalvar").addEventListener("click", async () => {
  const novo = $("emailNovo").value.trim().toLowerCase(), senha = $("emailSenha").value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo)) { toast("Digite um e-mail válido."); $("emailNovo").focus(); return; }
  if (novo === (usuarioAtual()?.email || "").toLowerCase()) { toast("Esse já é o seu e-mail."); return; }
  if (!senha) { toast("Digite sua senha atual."); $("emailSenha").focus(); return; }
  const b = $("emailSalvar"); b.disabled = true;
  try {
    await authFns.reauthenticateWithCredential(usuarioAtual(), credencial(senha));
    await authFns.verifyBeforeUpdateEmail(usuarioAtual(), novo);
    fecharFolha("folhaEmail");
    toast(`Enviamos um link para ${novo}. A troca acontece quando você abrir o link (veja também o spam).`);
  } catch (e) { toast(erroSenha(e)); }
  finally { b.disabled = false; }
});

// A mesma janela "Sair da conta?" do menu e das mensagens.
$("cfgSair").addEventListener("click", () => import("./confirmar.js?v=4").then((m) => m.sairDaConta()));

// ---------- baixar meus dados (LGPD) ----------
// Relatório para ler (HTML, abre em qualquer navegador e salva em PDF) ou arquivo técnico (JSON).
function baixarArquivo(conteudo, tipo, nome) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
async function baixarDados(formato) {
  const b = $("cfgBaixarDados"); b.disabled = true;
  toast("Juntando seus dados... pode levar alguns segundos.");
  try {
    const m = await import("./meus-dados.js?v=1");
    const pacote = await m.juntarDados(fb, eu.uid, obterPerfil);
    const dia = new Date().toISOString().slice(0, 10);
    if (formato === "json") baixarArquivo(m.jsonDos(pacote.dados), "application/json", `meus-dados-help-floripa-${dia}.json`);
    else baixarArquivo(m.relatorioHTML(pacote, eu.uid), "text/html;charset=utf-8", `meus-dados-help-floripa-${dia}.html`);
    toast(formato === "json" ? "Pronto! O arquivo técnico foi baixado." : "Pronto! Abra o arquivo baixado para ver seus dados.");
  } catch (e) { console.error(e); toast("Não foi possível juntar os dados: " + erroAmigavel(e)); }
  finally { b.disabled = false; }
}
$("cfgBaixarDados").addEventListener("click", () => abrirOpcoes("Baixar meus dados", [
  { rotulo: "Relatório para ler", sub: "Página organizada, com fotos e conversas. Abre em qualquer navegador e salva em PDF", icone: "doc", fn: () => baixarDados("html") },
  { rotulo: "Arquivo técnico (JSON)", sub: "Os mesmos dados, para levar a outro serviço", icone: "grade", fn: () => baixarDados("json") }
]));

// ---------- desativar ----------
let desDias = 7;
$("desMotivos").replaceChildren(...MOTIVOS_DESATIVAR.map(([v, rotulo], i) => {
  const l = document.createElement("label"); l.className = "conta-op";
  const r = document.createElement("input"); r.type = "radio"; r.name = "desMotivo"; r.value = v; if (i === 0) r.checked = true;
  const t = document.createElement("span"); t.textContent = rotulo;
  l.append(r, t); return l;
}));
const dataLonga = (d) => d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
function pintarPrazo() {
  const auto = document.querySelector('input[name="desModo"]:checked').value === "automatica";
  $("desPrazo").hidden = !auto; $("desPrazoTxt").hidden = !auto;
  document.querySelectorAll("#desPrazo [data-dias]").forEach((b) => b.classList.toggle("on", Number(b.dataset.dias) === desDias));
  $("desPrazoTxt").textContent = `Sua conta volta a aparecer em ${dataLonga(new Date(Date.now() + desDias * 864e5))}.`;
}
document.querySelectorAll('input[name="desModo"]').forEach((r) => r.addEventListener("change", pintarPrazo));
$("desPrazo").addEventListener("click", (e) => { const b = e.target.closest("[data-dias]"); if (b) { desDias = Number(b.dataset.dias); pintarPrazo(); } });
$("cfgDesativar").addEventListener("click", () => { pintarPrazo(); abrirFolha("folhaDesativar"); });
$("desConfirmar").addEventListener("click", async () => {
  const motivo = document.querySelector('input[name="desMotivo"]:checked')?.value || "outro";
  const auto = document.querySelector('input[name="desModo"]:checked').value === "automatica";
  const reativarEm = auto ? new Date(Date.now() + desDias * 864e5) : null;
  const b = $("desConfirmar"); b.disabled = true;
  try {
    if (!(await reautenticar(authFns, usuarioAtual(), { titulo: "Desativar conta", texto: "Digite sua senha para confirmar a desativação." }))) return;
    toast("Desativando sua conta...");
    await desativarConta(fb, eu.uid, { motivo, detalhe: $("desDetalhe").value.trim(), reativarEm });
    await authFns.signOut(window.firebaseAuth).catch(() => {});
    await avisoHF({ titulo: "Conta desativada", icone: "check", texto: auto ? `Sua conta foi desativada e volta sozinha em ${dataLonga(reativarEm)}. Se quiser voltar antes, é só entrar.` : "Sua conta foi desativada. Para reativar, é só entrar de novo." });
    location.href = "login.html";
  } catch (e) { console.error(e); toast(erroSenha(e)); }
  finally { b.disabled = false; }
});

// ---------- excluir (30 dias para recuperar) ----------
$("cfgExcluir").addEventListener("click", () => { $("excEntendi").checked = false; $("excConfirmar").disabled = true; abrirFolha("folhaExcluir"); });
$("excEntendi").addEventListener("change", () => { $("excConfirmar").disabled = !$("excEntendi").checked; });
$("excluirParaDesativar").addEventListener("click", () => { fecharFolha("folhaExcluir"); pintarPrazo(); abrirFolha("folhaDesativar"); });
$("excConfirmar").addEventListener("click", async () => {
  const b = $("excConfirmar"); b.disabled = true;
  try {
    if (!(await reautenticar(authFns, usuarioAtual(), { titulo: "Excluir conta", texto: "Digite sua senha para pedir a exclusão da conta." }))) return;
    toast("Agendando a exclusão...");
    await pedirExclusao(fb, eu.uid, { motivo: $("excMotivo").value.trim() });
    const quando = new Date(Date.now() + 30 * 864e5).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    await authFns.signOut(window.firebaseAuth).catch(() => {});
    await avisoHF({ titulo: "Exclusão agendada", icone: "check", texto: `Sua conta será excluída em ${quando}. Até lá, ela fica desativada e você pode recuperá-la entrando de novo.` });
    location.href = "index.html";
  } catch (e) { console.error(e); toast(erroSenha(e)); }
  finally { b.disabled = !$("excEntendi").checked; }
});

(async function iniciar() {
  try { await iniciarRede(); }
  catch (e) { toast(e.message || "Não foi possível carregar."); return; }
  montarBarraRede("");
  pintarBarraRede();
  ouvirAvisos({ notificarNovos: false });
  pintarConfig();
  lerPermiteMarcar();
  $("cfgConteudo").hidden = false;
  $("cfgCarregando").hidden = true;
  aplicarTema();
  // Atalho do painel: só aparece para quem está na equipe (as regras do Firestore protegem o painel de qualquer forma).
  fb.getDoc(fb.doc(fb.db, "admins", eu.uid)).then((s) => { if (s.exists()) $("cfgEquipe").hidden = false; }).catch(() => {});
})();
