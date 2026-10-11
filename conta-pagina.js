// =====================================================
// conta.html — aparece quando a pessoa entra com a conta desativada
// ou com a exclusão pedida (o portão em firebase.js manda para cá).
//   - desativada: Reativar agora / Sair
//   - exclusão dentro de 30 dias: Recuperar minha conta / Sair
//   - exclusão vencida: Concluir exclusão (confirma a senha) / Sair
// =====================================================
import { destinoSeguro, firebasePronto } from "./acesso.js?v=2";
import { estadoConta, reativarConta, apagarTudo, reautenticar } from "./conta.js?v=2";

const $ = (id) => document.getElementById(id);
const data = (t) => new Date(t).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
const aviso = (texto, tipo = "info") => { const a = $("aviso"); a.hidden = !texto; a.className = "aviso " + tipo; a.textContent = texto; };
const destino = destinoSeguro("index.html");

(async function iniciar() {
  let auth, db;
  try { ({ auth, db } = await firebasePronto()); } catch (e) { aviso(e.message, "erro"); return; }
  const [A, F] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);
  const fb = { ...F, db };
  const usuario = await new Promise((ok) => { const parar = A.onAuthStateChanged(auth, (u) => { parar(); ok(u); }); });
  if (!usuario) { location.replace("login.html?redirect=" + encodeURIComponent("conta.html")); return; }

  $("sair").hidden = false;
  $("sair").addEventListener("click", async () => { await A.signOut(auth).catch(() => {}); location.href = "index.html"; });

  let d = {}, sancao = null;
  try {
    const [s, sc] = await Promise.all([F.getDoc(F.doc(db, "usuarios", usuario.uid)), F.getDoc(F.doc(db, "sancoes", usuario.uid)).catch(() => null)]);
    d = s.exists() ? s.data() : {};
    sancao = sc?.exists() ? sc.data() : null;
  } catch { aviso("Não foi possível carregar sua conta. Verifique a internet e tente de novo.", "erro"); return; }
  // Suspensão ou banimento aplicado pela equipe: vem antes de tudo.
  const fimSancao = sancao?.ate?.toMillis?.() ?? 0;
  if (sancao && (sancao.tipo === "banimento" || fimSancao > Date.now())) {
    const banida = sancao.tipo === "banimento";
    $("titulo").textContent = banida ? "Sua conta foi banida" : "Sua conta está suspensa";
    $("sub").textContent = banida ? "Você não pode mais publicar, conversar, avaliar nem anunciar no Help Floripa." : `Até ${data(fimSancao)}, você não consegue publicar, conversar, avaliar nem anunciar. Seu perfil fica escondido.`;
    $("detalhe").hidden = false;
    $("detalhe").textContent = `Motivo: ${sancao.motivo || "descumprimento dos Termos de Uso"}. Se achar que foi um engano, conte o que aconteceu para a equipe.`;
    const b = $("principal"); b.hidden = false; b.textContent = "Contestar no suporte";
    b.addEventListener("click", () => { location.href = "suporte.html?categoria=contestacao"; });
    return;
  }
  const est = estadoConta(d);
  const marcarOk = () => { try { sessionStorage.setItem("hf-conta-ok-" + usuario.uid, "1"); } catch {} };
  const b = $("principal");
  const detalhe = (t) => { $("detalhe").hidden = false; $("detalhe").textContent = t; };

  if (est.tipo === "ativa") {
    if (est.vencida) await reativarConta(fb, usuario.uid).catch(() => {}); // reativação automática: limpa os campos
    marcarOk(); location.replace(destino); return;
  }

  if (est.tipo === "desativada") {
    $("titulo").textContent = "Sua conta está desativada";
    $("sub").textContent = est.automatica
      ? `Ela volta sozinha em ${data(est.ate)}. Se quiser, reative agora.`
      : "Você escolheu reativar quando voltasse. É só tocar no botão abaixo.";
    detalhe("Enquanto estiver desativada, seu perfil, publicações, negócios e anúncios não aparecem e ninguém consegue te mandar mensagem. Seguidores, conversas e avaliações continuam guardados.");
    b.textContent = "Reativar minha conta";
  } else if (!est.vencida) {
    $("titulo").textContent = "Exclusão agendada";
    $("sub").textContent = `Sua conta será excluída em ${data(est.apagarEm)} (${est.faltam === 1 ? "falta 1 dia" : `faltam ${est.faltam} dias`}).`;
    detalhe("Até lá ela fica desativada e você pode recuperar tudo como estava. Depois dessa data, a exclusão não pode ser desfeita.");
    b.textContent = "Recuperar minha conta";
  } else {
    $("titulo").textContent = "O prazo para recuperar terminou";
    $("sub").textContent = "Os 30 dias se passaram. Confirme para concluir a exclusão agora.";
    detalhe("Serão apagados seu perfil, publicações, comentários, estrelas, quem você segue e seus seguidores, negócios, anúncios e as mensagens que você enviou. Avaliações e reclamações que você fez continuam contando, mas sem seu nome.");
    b.textContent = "Concluir exclusão";
    b.style.background = "var(--danger)";
  }
  b.hidden = false;

  b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      if (est.tipo === "exclusao" && est.vencida) {
        if (!(await reautenticar(A, usuario, { titulo: "Confirmar exclusão", texto: "Digite sua senha para concluir a exclusão da conta." }))) { b.disabled = false; return; }
        await apagarTudo(fb, A, usuario, (t) => aviso(t, "info"));
        $("titulo").textContent = "Conta excluída";
        $("sub").textContent = "Sua conta e seus dados foram apagados. Obrigado por ter feito parte do Help Floripa.";
        $("detalhe").hidden = true; b.hidden = true; $("sair").hidden = true;
        aviso("Você pode criar uma conta nova quando quiser.", "ok");
        setTimeout(() => { location.href = "index.html"; }, 4000);
        return;
      }
      aviso(est.tipo === "exclusao" ? "Recuperando sua conta..." : "Reativando sua conta...", "info");
      await reativarConta(fb, usuario.uid);
      marcarOk();
      aviso(est.tipo === "exclusao" ? "Conta recuperada! Bem-vindo de volta." : "Conta reativada! Bem-vindo de volta.", "ok");
      setTimeout(() => location.replace(destino), 1200);
    } catch (e) {
      console.error(e);
      const senha = e?.code === "auth/wrong-password" || e?.code === "auth/invalid-credential";
      aviso(senha ? "Senha incorreta." : e?.code === "auth/requires-recent-login" ? "Por segurança, saia e entre de novo para concluir." : "Não foi possível concluir agora. Tente de novo.", "erro");
      b.disabled = false;
    }
  });
})();
