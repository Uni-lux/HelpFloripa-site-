// =====================================================
// Segurança compartilhada do Help Floripa
// - Confirmação de e-mail: as regras do Firestore só deixam mandar mensagem,
//   seguir, publicar e criar negócios com o e-mail confirmado. Aqui mostramos
//   um aviso com botão para reenviar o link e atualizamos o login quando a
//   pessoa confirma (o token antigo continua dizendo "não confirmado").
// - Fotos e anexos: só aceitamos imagens do próprio site.
// =====================================================

const AUTH_URL = "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Imagem guardada dentro do documento, Firebase Storage do projeto ou foto da conta Google.
const ORIGENS_FOTO = /^(data:image\/(jpeg|png|webp);base64,|https:\/\/firebasestorage\.googleapis\.com\/|https:\/\/lh3\.googleusercontent\.com\/)/i;
const ORIGENS_MIDIA = /^(data:(image|video|audio)\/[^,]{1,80},|blob:|https:\/\/firebasestorage\.googleapis\.com\/)/i;
export const fotoSegura = (u) => (ORIGENS_FOTO.test(String(u || "")) ? String(u) : "");
export const midiaSegura = (u) => (ORIGENS_FOTO.test(String(u || "")) || ORIGENS_MIDIA.test(String(u || "")) ? String(u) : "");

// Login com e-mail e senha que ainda não confirmou o e-mail.
export const emailPendente = (u) => !!u && !u.emailVerified && (u.providerData || []).some((p) => p.providerId === "password");

export const MSG_EMAIL = "Confirme seu e-mail para fazer isso. Veja o aviso no topo da página.";

// Chame depois do login. Devolve true se está tudo certo.
export async function conferirEmail(usuario) {
  if (!usuario) return false;
  try {
    if (!usuario.emailVerified) await usuario.reload();
    if (usuario.emailVerified) {
      // Confirmou há pouco: o token ainda diz "não confirmado". Pede um novo.
      const t = await usuario.getIdTokenResult();
      if (t.claims.email_verified !== true) await usuario.getIdToken(true);
      document.getElementById("hfAvisoEmail")?.remove();
      return true;
    }
  } catch (e) { console.warn("Não foi possível conferir o e-mail:", e); }
  if (emailPendente(usuario)) mostrarAvisoEmail(usuario);
  return !emailPendente(usuario);
}

export function mostrarAvisoEmail(usuario) {
  if (document.getElementById("hfAvisoEmail")) return;
  if (!document.getElementById("hfAvisoEmailCss")) {
    const st = document.createElement("style");
    st.id = "hfAvisoEmailCss";
    st.textContent = `
      #hfAvisoEmail { position: sticky; top: 0; z-index: 8000; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 14px; background: #3b2a00; color: #ffe7a3; font: 600 13.5px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; border-bottom: 1px solid #6b4e00; }
      #hfAvisoEmail span { flex: 1 1 220px; }
      #hfAvisoEmail button { border: 0; border-radius: 999px; padding: 7px 13px; font: inherit; font-weight: 800; cursor: pointer; background: #ffd54a; color: #2b1d00; }
      #hfAvisoEmail button.sec { background: transparent; color: #ffe7a3; border: 1px solid #8a6a10; }
      #hfAvisoEmail button:disabled { opacity: .6; cursor: default; }`;
    document.head.appendChild(st);
  }
  const bar = document.createElement("div");
  bar.id = "hfAvisoEmail";
  bar.setAttribute("role", "status");
  const txt = document.createElement("span");
  txt.textContent = `Confirme seu e-mail (${usuario.email || "sua conta"}) para mandar mensagens, seguir pessoas, publicar e criar perfis de negócio.`;
  const reenviar = document.createElement("button");
  reenviar.type = "button";
  reenviar.textContent = "Reenviar link";
  reenviar.addEventListener("click", async () => {
    reenviar.disabled = true;
    try {
      const { sendEmailVerification } = await import(AUTH_URL);
      await sendEmailVerification(usuario);
      txt.textContent = "Link enviado! Abra seu e-mail (veja também o spam) e depois toque em \"Já confirmei\".";
    } catch (e) {
      txt.textContent = e?.code === "auth/too-many-requests" ? "Muitos envios seguidos. Espere alguns minutos e tente de novo." : "Não foi possível enviar agora. Tente de novo.";
    }
    setTimeout(() => { reenviar.disabled = false; }, 30000);
  });
  const ja = document.createElement("button");
  ja.type = "button";
  ja.className = "sec";
  ja.textContent = "Já confirmei";
  ja.addEventListener("click", async () => {
    ja.disabled = true;
    const ok = await conferirEmail(usuario);
    if (!ok) { txt.textContent = "Ainda não encontramos a confirmação. Clique no link do e-mail e tente de novo."; ja.disabled = false; }
  });
  bar.append(txt, reenviar, ja);
  document.body.prepend(bar);
}
