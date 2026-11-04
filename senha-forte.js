// =====================================================
// Senha forte (sem dependências): a lista de requisitos que vai ficando verde enquanto a pessoa digita.
// Usada no cadastro (cadastre-se.html), na senha nova pelo link do e-mail (conta-acao.html) e em
// Configurações → Alterar senha. Só vale para senha NOVA: quem já tem conta continua entrando com a senha de antes.
// - conferirSenha(senha, dados) → [{ id, texto, ok }] (dados: nome, nick, email, telefone, nascimento "AAAA-MM-DD").
// - senhaForte(senha, dados) → true quando todos os requisitos passam.
// - primeiroProblema(senha, dados) → texto do 1º requisito que falta (para o aviso ao enviar).
// - ligarSenhaForte({ campo, lista, dados }) → desenha a lista embaixo do campo e atualiza a cada letra.
// Obs.: a conferência é no aparelho (o Firebase só exige 6 caracteres). Exigir também no servidor é pela política de
// senha do Firebase Authentication (console → Authentication → Configurações → Política de senha).
// =====================================================

const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const soLetrasNum = (s) => semAcento(s).replace(/[^a-z0-9]/g, "");

// Senhas e pedaços que qualquer pessoa tenta primeiro.
const COMUNS = ["senha", "password", "123456", "12345678", "qwerty", "asdfgh", "zxcvbn", "abc123", "iloveyou", "admin",
  "brasil", "floripa", "florianopolis", "helpfloripa", "teste", "mudar", "trocar", "bemvindo", "welcome", "letmein",
  "amor", "jesus", "flamengo", "corinthians", "palmeiras", "gremio", "figueirense", "qwer", "asdf", "zxcv"];

// "abc", "cba", "123", "321", "aaa", "111" (3 seguidos). Linhas do teclado (qwerty...) estão em COMUNS.
function temSequencia(v) {
  const s = semAcento(v);
  for (let i = 0; i + 2 < s.length; i++) {
    const a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2);
    if (a === b && b === c) return true;
    const alnum = (x) => (x >= 48 && x <= 57) || (x >= 97 && x <= 122);
    if (alnum(a) && alnum(b) && alnum(c) && ((b - a === 1 && c - b === 1) || (a - b === 1 && b - c === 1))) return true;
  }
  return false;
}

// Pedaços pessoais que não podem estar na senha.
function pedacosPessoais({ nome, nick, email } = {}) {
  const p = [];
  semAcento(nome).split(/[^a-z0-9]+/).forEach((x) => { if (x.length >= 3 && !["dos", "das", "der", "von"].includes(x)) p.push(x); });
  const n = soLetrasNum(nick); if (n.length >= 3) p.push(n);
  const local = soLetrasNum(String(email || "").split("@")[0]); if (local.length >= 3) p.push(local);
  // partes do e-mail separadas por ponto/traço (joao.silva → joao, silva)
  semAcento(String(email || "").split("@")[0]).split(/[^a-z0-9]+/).forEach((x) => { if (x.length >= 3) p.push(x); });
  return [...new Set(p)];
}
function datasDe(nasc) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(nasc || ""));
  if (!m) return [];
  const [, a, me, d] = m;
  return [a, d + me, me + d, d + me + a, d + me + a.slice(2), a + me + d, me + d + a];
}
function numerosDoTelefone(tel) {
  const d = String(tel || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length < 8) return [];
  // número sem DDD e os 4 últimos dígitos (os mais usados como senha)
  return [...new Set([d, d.slice(2), d.slice(-8), d.slice(-4)].filter((x) => x.length >= 4))];
}

export function conferirSenha(senha, dados = {}) {
  const v = String(senha || "");
  const plano = soLetrasNum(v), digitos = v.replace(/\D/g, "");
  const temNome = pedacosPessoais({ nome: dados.nome, nick: dados.nick }).some((p) => plano.includes(p));
  const temEmail = (() => {
    const e = String(dados.email || "").trim().toLowerCase();
    if (e && v.toLowerCase().includes(e)) return true;
    const local = soLetrasNum(e.split("@")[0]);
    return local.length >= 3 && plano.includes(local);
  })();
  const temTel = numerosDoTelefone(dados.telefone).some((n) => digitos.includes(n));
  const temData = datasDe(dados.nascimento).some((n) => digitos.includes(n));
  const comum = COMUNS.some((c) => plano.includes(c));
  return [
    { id: "tamanho", texto: "Pelo menos 8 caracteres, com letra maiúscula e minúscula", ok: v.length >= 8 && /[a-zà-ÿ]/.test(v) && /[A-ZÀ-Þ]/.test(v) },
    { id: "numero", texto: "Pelo menos 1 número e 1 símbolo (ex.: ! ? @ # $ * -)", ok: /\d/.test(v) && /[^\p{L}\d\s]/u.test(v) },
    { id: "sequencia", texto: "Sem sequências ou repetições, como abc, 123 ou 111", ok: !!v && !temSequencia(v) },
    { id: "nome", texto: "Sem o seu nome, sobrenome ou @usuário", ok: !!v && !temNome },
    { id: "contato", texto: "Sem o seu e-mail ou celular", ok: !!v && !temEmail && !temTel },
    { id: "data", texto: "Sem a sua data de nascimento", ok: !!v && !temData },
    { id: "comum", texto: "Sem “helpfloripa”, “senha” ou senhas fáceis de adivinhar", ok: !!v && !comum },
  ];
}
export const senhaForte = (senha, dados) => conferirSenha(senha, dados).every((r) => r.ok);
export function primeiroProblema(senha, dados) {
  const r = conferirSenha(senha, dados).find((x) => !x.ok);
  return r ? "Sua senha ainda não está segura: " + r.texto.charAt(0).toLowerCase() + r.texto.slice(1) + "." : "";
}

const CSS = `
.sf-lista { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 7px; }
.sf-lista li { position: relative; padding-left: 26px; font-size: 13px; line-height: 1.35; color: var(--muted, #8a98a4); transition: color .2s; }
.sf-lista li::before { content: ""; position: absolute; left: 0; top: 0; width: 17px; height: 17px; border-radius: 50%;
  border: 1.6px solid currentColor; box-sizing: border-box; opacity: .7; transition: background .2s, border-color .2s, opacity .2s; }
.sf-lista li.ok { color: var(--text, #e8eef2); }
.sf-lista li.ok::before { opacity: 1; border-color: var(--ok, #2fbf71); background: var(--ok, #2fbf71) no-repeat center / 11px
  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.2 4.2L19 7'/%3E%3C/svg%3E"); }
.sf-lista li.falta { color: var(--danger, #ff5a5f); }
.sf-lista li.falta::before { opacity: 1; border-color: var(--danger, #ff5a5f); background: no-repeat center / 9px
  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff5a5f' stroke-width='3.6' stroke-linecap='round'%3E%3Cpath d='M6 6l12 12M18 6L6 18'/%3E%3C/svg%3E"); }
.sf-topo { display: flex; align-items: center; gap: 10px; margin-top: 2px; font-size: 12.5px; font-weight: 700; color: var(--muted, #8a98a4); }
.sf-barra { flex: 1; height: 6px; border-radius: 99px; background: var(--line, rgba(255,255,255,.12)); overflow: hidden; }
.sf-barra b { display: block; height: 100%; width: 0; border-radius: inherit; background: var(--danger, #ff5a5f); transition: width .25s, background .25s; }
.sf-topo.media .sf-barra b { background: #e69500; } .sf-topo.forte .sf-barra b { background: var(--ok, #2fbf71); }
.sf-topo.forte { color: var(--ok, #2fbf71); }
@media (prefers-reduced-motion: reduce) { .sf-lista li, .sf-lista li::before, .sf-barra b { transition: none; } }
`;
let cssPronto = false;
function css() { if (cssPronto) return; cssPronto = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }

// campo: o <input> da senha nova; lista: onde desenhar (div vazia); dados: objeto ou função que devolve os dados de agora
// (no cadastro o nome/e-mail mudam enquanto a pessoa preenche).
export function ligarSenhaForte({ campo, lista, dados = {} } = {}) {
  if (!campo || !lista) return { atualizar() {}, ok: () => false };
  css();
  lista.replaceChildren();
  const topo = document.createElement("div"); topo.className = "sf-topo"; topo.setAttribute("aria-hidden", "true");
  topo.innerHTML = '<span class="sf-barra"><b></b></span><span class="sf-nivel">Segurança da senha</span>';
  const ul = document.createElement("ul"); ul.className = "sf-lista"; ul.id = (campo.id || "senha") + "Regras";
  const viva = document.createElement("span"); viva.className = "sf-viva"; viva.setAttribute("aria-live", "polite");
  viva.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
  lista.append(topo, ul, viva);
  campo.setAttribute("aria-describedby", ul.id);
  const lerDados = () => (typeof dados === "function" ? dados() : dados) || {};
  let tocou = false, ultimoOk = -1;
  function atualizar() {
    const v = campo.value, regras = conferirSenha(v, lerDados());
    const n = regras.filter((r) => r.ok).length;
    ul.replaceChildren(...regras.map((r) => {
      const li = document.createElement("li");
      li.dataset.regra = r.id; li.textContent = r.texto;
      li.className = r.ok && v ? "ok" : tocou && v ? "falta" : "";
      return li;
    }));
    const nivel = !v ? "" : n === regras.length ? "forte" : n >= 5 ? "media" : "fraca";
    topo.className = "sf-topo " + nivel;
    topo.querySelector("b").style.width = v ? Math.max(12, Math.round((n / regras.length) * 100)) + "%" : "0";
    topo.querySelector(".sf-nivel").textContent = { "": "Segurança da senha", fraca: "Senha fraca", media: "Quase lá", forte: "Senha forte" }[nivel];
    if (v && n !== ultimoOk && (n === regras.length || ultimoOk === regras.length)) viva.textContent = n === regras.length ? "Senha forte: todos os requisitos atendidos." : "";
    ultimoOk = v ? n : -1;
    return n === regras.length;
  }
  campo.addEventListener("input", atualizar);
  campo.addEventListener("blur", () => { if (campo.value) { tocou = true; atualizar(); } });
  atualizar();
  return { atualizar, ok: () => atualizar(), mostrarFaltas() { tocou = true; return atualizar(); } };
}
