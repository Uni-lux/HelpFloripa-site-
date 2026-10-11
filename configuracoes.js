// =====================================================
// Configurações da conta (configuracoes.html)
// Conta, endereço, aparência, privacidade, notificações,
// contas bloqueadas e restritas, sair e excluir a conta.
// =====================================================
import {
  $, pintarAvatar, toast, erroAmigavel, abrirFolha, fecharFolha, abrirLista, config, salvarConfig, aplicarTema,
  fb, authFns, eu, refUsuario, dados, perfis, meusBloqueios, restritos, obterPerfil, linhaPessoa,
  desbloquear, alternarRestricao, marcarPresenca, iniciarRede, montarBarraRede, pintarBarraRede, ouvirAvisos, salvarPrivacidadeConta
} from "./rede.js?v=25";
import { MOTIVOS_DESATIVAR, desativarConta, pedirExclusao, reautenticar, provedor } from "./conta.js?v=2";

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
  $("cfgEnderecoTxt").textContent = resumoEndereco(dados.endereco) || "Privado: não aparece para outros usuários";
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

$("cfgSair").addEventListener("click", async () => {
  try { await authFns.signOut(window.firebaseAuth); } catch {}
  location.href = "index.html";
});

// ---------- baixar meus dados (LGPD) ----------
$("cfgBaixarDados").addEventListener("click", async () => {
  const b = $("cfgBaixarDados"); b.disabled = true;
  toast("Juntando seus dados... pode levar alguns segundos.");
  try {
    const uid = eu.uid;
    const lista = (col, campo, op = "==") => fb.getDocs(fb.query(fb.collection(fb.db, col), fb.where(campo, op, uid))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []);
    const um = (col, id) => fb.getDoc(fb.doc(fb.db, col, id)).then((s) => (s.exists() ? s.data() : null)).catch(() => null);
    const [conta, perfil, negocios, anuncios, publicacoes, comentarios, estrelasDadas, seguindo, seguidores, conexoes, bloqueios, avaliacoesFeitas, avaliacoesRecebidas, reclamacoesFeitas, reclamacoesRecebidas, chamados, avisos, conversas] = await Promise.all([
      um("usuarios", uid), um("perfis_publicos", uid), lista("negocios", "donoId"), lista("anuncios", "donoId"), lista("diario", "autorId"), lista("comentarios", "autorId"),
      lista("curtidas", "uid"), lista("relacoes", "seguidorId"), lista("relacoes", "alvoId"), lista("vinculos", "participantes", "array-contains"), lista("bloqueios", "bloqueadorId"),
      lista("avaliacoes", "autorId"), lista("avaliacoes", "alvoId"), lista("queixas", "autorId"), lista("queixas", "alvoId"), lista("suporte", "uid"), lista("avisos", "uid"),
      lista("conversas", "participantes", "array-contains")
    ]);
    // Mensagens das suas conversas (até 1.000 por conversa).
    for (const c of conversas) {
      c.mensagens = await fb.getDocs(fb.query(fb.collection(fb.db, "conversas", c.id, "mensagens"), fb.orderBy("criadoEm", "asc"), fb.limit(1000))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []);
    }
    const limpar = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x === "object" && typeof x.toDate === "function" ? x.toDate().toISOString() : x)));
    const pacote = limpar({ geradoEm: new Date().toISOString(), aviso: "Cópia dos seus dados no Help Floripa (LGPD, art. 18). Senha e dados de segurança do login ficam no Google Firebase e não são incluídos.", conta, perfil, negocios, anuncios, publicacoes, comentarios, estrelasDadas, seguindo, seguidores, conexoes, bloqueios, avaliacoesFeitas, avaliacoesRecebidas, reclamacoesFeitas, reclamacoesRecebidas, chamados, avisos, conversas });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(pacote, null, 2)], { type: "application/json" }));
    a.download = `meus-dados-help-floripa-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    toast("Pronto! O arquivo foi baixado.");
  } catch (e) { console.error(e); toast("Não foi possível juntar os dados: " + erroAmigavel(e)); }
  finally { b.disabled = false; }
});

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
    alert(auto ? `Sua conta foi desativada e volta sozinha em ${dataLonga(reativarEm)}. Se quiser voltar antes, é só entrar.` : "Sua conta foi desativada. Para reativar, é só entrar de novo.");
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
    alert(`Exclusão agendada para ${quando}. Até lá, sua conta fica desativada e você pode recuperá-la entrando de novo.`);
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
  $("cfgConteudo").hidden = false;
  $("cfgCarregando").hidden = true;
  aplicarTema();
  // Atalho do painel: só aparece para quem está na equipe (as regras do Firestore protegem o painel de qualquer forma).
  fb.getDoc(fb.doc(fb.db, "admins", eu.uid)).then((s) => { if (s.exists()) $("cfgEquipe").hidden = false; }).catch(() => {});
})();
