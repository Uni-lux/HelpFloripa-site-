// =====================================================
// Criar conta (cadastre-se.html)
// - Uma conta para tudo: contratar, comprar, publicar e anunciar.
// - @usuário reservado na mesma transação que cria o perfil.
// =====================================================
import { $, destinoSeguro, mensagemErro, aviso, firebasePronto } from "./acesso.js?v=2";

const IDADE_MIN = 16;
if (destinoSeguro("") ) $("linkLogin").href = `login.html?redirect=${encodeURIComponent(destinoSeguro(""))}`;

// ---------- telefone ----------
$("telefone").addEventListener("input", () => {
  const d = $("telefone").value.replace(/\D/g, "").slice(0, 11);
  $("telefone").value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
    : d.length > 6 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
    : d.length > 2 ? d.replace(/(\d{2})(\d{0,5})/, "($1) $2") : d ? `(${d}` : "";
});

// ---------- força da senha ----------
function forca(v) {
  let p = 0;
  if (v.length >= 6) p++; if (v.length >= 10) p++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) p++;
  if (/\d/.test(v)) p++; if (/[^A-Za-z0-9]/.test(v)) p++;
  return p <= 1 ? "fraca" : p <= 3 ? "media" : "forte";
}
$("senha").addEventListener("input", () => {
  const v = $("senha").value;
  const n = v ? forca(v) : "";
  $("forcaBarra").className = n;
  $("forcaTexto").textContent = n ? { fraca: "Senha fraca", media: "Senha média", forte: "Senha forte" }[n] : "Mínimo de 6 caracteres. Misture letras, números e símbolos.";
});

// ---------- data de nascimento ----------
const limite = new Date(); limite.setFullYear(limite.getFullYear() - IDADE_MIN);
$("nascimento").max = limite.toISOString().slice(0, 10);
function idade(s) {
  const n = new Date(s + "T00:00:00");
  if (isNaN(n.getTime())) return null;
  const h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) i--;
  return i;
}

// ---------- sair sem terminar ----------
let podeSair = false;
const comecou = () => ["nome", "nick", "email", "telefone", "senha", "confirmar", "nascimento"].some((id) => $(id).value.trim());
$("cancelar").addEventListener("click", (e) => { if (comecou() && !podeSair) { e.preventDefault(); $("modalSair").hidden = false; $("ficar").focus(); } });
$("ficar").addEventListener("click", () => { $("modalSair").hidden = true; });
$("sair").addEventListener("click", () => { podeSair = true; location.href = "index.html"; });
window.addEventListener("beforeunload", (e) => { if (comecou() && !podeSair) { e.preventDefault(); e.returnValue = ""; } });

(async function iniciar() {
  let auth, db;
  try { ({ auth, db } = await firebasePronto()); } catch (e) { aviso("avisoCadastro", e.message, "erro"); return; }
  const [A, F] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);

  // ---------- @usuário ----------
  const normalizar = (v) => String(v || "").trim().toLowerCase().replace(/\s+/g, "");
  let nickLivre = false, tempo = null;
  const status = (t, c = "") => { $("nickStatus").textContent = t; $("nickStatus").className = "ajuda " + c; };
  $("nick").addEventListener("input", () => {
    $("nick").value = $("nick").value.replace(/\s+/g, "").replace(/^@/, "");
    const n = normalizar($("nick").value);
    nickLivre = false; clearTimeout(tempo);
    if (n.length < 3) return status("Mínimo de 3 caracteres, sem espaços.");
    if (!/^[a-z0-9._]+$/.test(n)) return status("Use só letras, números, ponto ou underline.", "erro");
    status("Verificando...");
    tempo = setTimeout(async () => {
      try {
        const s = await F.getDoc(F.doc(db, "nicknames", n));
        if (normalizar($("nick").value) !== n) return;
        if (s.exists()) status(`@${n} já está em uso.`, "erro");
        else { nickLivre = true; status(`@${n} está disponível.`, "ok"); }
      } catch { status("Não foi possível verificar agora. Tente de novo.", "erro"); }
    }, 450);
  });

  // ---------- enviar ----------
  $("formCadastro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = (t, foco) => { aviso("avisoCadastro", t, "erro"); foco?.focus(); };
    const nome = $("nome").value.trim(), nick = normalizar($("nick").value), email = $("email").value.trim().toLowerCase();
    const telefone = $("telefone").value.trim(), senha = $("senha").value, nasc = $("nascimento").value;
    if (nome.length < 2) return erro("Informe seu nome ou o nome da empresa.", $("nome"));
    if (nick.length < 3 || !nickLivre) return erro("Escolha um @usuário válido e disponível.", $("nick"));
    if (!email) return erro("Informe seu e-mail.", $("email"));
    if (telefone.replace(/\D/g, "").length < 10) return erro("Informe um telefone com DDD.", $("telefone"));
    const i = idade(nasc);
    if (i === null || i < 0) return erro("Informe uma data de nascimento válida.", $("nascimento"));
    if (i < IDADE_MIN) return erro(`É preciso ter ${IDADE_MIN} anos ou mais para criar uma conta.`, $("nascimento"));
    if (senha.length < 6) return erro("A senha precisa ter pelo menos 6 caracteres.", $("senha"));
    if (senha !== $("confirmar").value) return erro("As senhas não são iguais.", $("confirmar"));
    if (!$("aceite").checked) return erro("Para continuar, aceite os Termos de Uso e a Política de Privacidade.", $("aceite"));

    const b = $("criar");
    b.disabled = true; b.textContent = "Criando sua conta...";
    aviso("avisoCadastro", "Criando sua conta...", "info");
    const refNick = F.doc(db, "nicknames", nick);
    let user = null;
    try {
      if ((await F.getDoc(refNick)).exists()) throw new Error("nickname-em-uso");
      const cred = await A.createUserWithEmailAndPassword(auth, email, senha);
      user = cred.user;
      await A.updateProfile(user, { displayName: nome });
      await F.runTransaction(db, async (tx) => {
        if ((await tx.get(refNick)).exists()) throw new Error("nickname-em-uso");
        tx.set(F.doc(db, "usuarios", user.uid), {
          uid: user.uid, nome, nickname: nick, dataNascimento: nasc, telefone, email,
          fotoPerfil: "", fotoCapa: "", tipoUsuario: "usuario", aceiteTermos: true, criadoEm: F.serverTimestamp()
        });
        tx.set(refNick, { uid: user.uid, criadoEm: F.serverTimestamp() });
        tx.set(F.doc(db, "perfis_publicos", user.uid), { uid: user.uid, nome, nickname: nick, fotoPerfil: "", cidade: "", criadoEm: F.serverTimestamp() });
      });
      podeSair = true;
      // Sem e-mail confirmado não dá para mandar mensagens, seguir, publicar nem anunciar.
      try { await A.sendEmailVerification(user); } catch (err) { console.warn("E-mail de confirmação não enviado:", err); }
      aviso("avisoCadastro", "Conta criada! Enviamos um link de confirmação para o seu e-mail.", "ok");
      const depois = destinoSeguro("index.html");
      setTimeout(() => { location.href = `verificar-email.html?continuar=${encodeURIComponent(depois)}`; }, 1200);
    } catch (err) {
      console.error("[Cadastro]", err);
      let msg = err?.message === "nickname-em-uso" ? `@${nick} acabou de ser escolhido por outra pessoa. Escolha outro.` : mensagemErro(err?.code);
      if (user) {
        try { await A.deleteUser(user); }
        catch { msg = "Sua conta foi criada, mas houve um problema ao salvar seus dados. Fale com o suporte pela página de Contato."; }
      }
      aviso("avisoCadastro", msg, "erro");
      b.disabled = false; b.textContent = "Criar minha conta grátis";
    }
  });
})();
