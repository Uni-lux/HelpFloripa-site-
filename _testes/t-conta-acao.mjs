// Link dos e-mails da conta (conta-acao.html): pedir senha nova → abrir o link → criar a senha (força, confirmação,
// erros) → entrar com ela; link usado de novo / incompleto; confirmar e-mail; "continuar" de fora não é seguido; o código
// sai do endereço. Também: "Esqueceu a senha?" sem "sem comissão" e o ano do rodapé.
// Uso: node t-conta-acao.mjs (emulador + servidor-csp + seed). No fim roda o seed de novo (a senha da Ana muda).
import { execSync } from "node:child_process";
import { navegador } from "./nav.mjs";
let falhas = 0; const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
const BASE = "http://127.0.0.1:5057/", AUTH = "http://127.0.0.1:9099";
const codigos = async () => (await (await fetch(`${AUTH}/emulator/v1/projects/demo-hf/oobCodes`)).json()).oobCodes || [];
const ultimo = async (email, tipo) => (await codigos()).filter((c) => c.email === email && c.requestType === tipo).at(-1)?.oobCode;
const api = (rota, corpo) => fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/${rota}?key=x`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) }).then((r) => r.json());

const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await A.ctx.newPage();
const erros = []; p.on("pageerror", (e) => erros.push(e.message));

// 1) pedir o link
await p.goto(BASE + "recuperar-senha.html?email=ana@teste.com"); await p.waitForTimeout(1200);
ok(!/sem comiss/i.test(await p.content()), "Esqueceu a senha?: sem “sem comissão” no texto");
ok((await p.textContent("[data-ano]")) === String(new Date().getFullYear()), "ano do rodapé atual");
await p.click("#enviar");
await p.waitForSelector("#avisoSenha:not([hidden])", { timeout: 10000 });
const cod = await ultimo("ana@teste.com", "PASSWORD_RESET");
ok(!!cod, "e-mail de senha nova gerado (emulador)");

// 2) abrir o link (com um "continuar" de fora, que não pode ser seguido)
await p.goto(`${BASE}conta-acao.html?mode=resetPassword&oobCode=${cod}&apiKey=x&lang=pt&continueUrl=${encodeURIComponent("https://golpe.example.com/x.html")}`);
await p.waitForSelector("#telaSenha:not([hidden])", { timeout: 10000 }).catch(() => {});
ok((await p.textContent("#emailConta")) === "ana@teste.com", "tela “Criar senha nova” mostra de qual conta é");
ok(await p.evaluate(() => !location.search), "o código saiu do endereço (não fica no histórico)");
await p.screenshot({ path: "saida/conta-acao-senha.png" });
await p.fill("#senha", "abc"); await p.fill("#senha2", "abc"); await p.click("#salvar");
ok(/pelo menos 8/.test(await p.textContent("#avisoAcao")), "senha curta: avisa");
await p.fill("#senha", "Ana#Kq8!vRt"); await p.click("#salvar");
ok(/e-mail ou celular/.test(await p.textContent("#avisoAcao")) && (await p.getAttribute("[data-regra=contato]", "class")) === "falta", "senha com o e-mail: avisa e marca o requisito");
await p.fill("#senha", "Kq8!vRt2mz"); await p.fill("#senha2", "Kq8!vRt2my"); await p.click("#salvar");
ok(/não são iguais/.test(await p.textContent("#avisoAcao")), "senhas diferentes: avisa");
ok(/Senha forte/.test(await p.textContent(".sf-nivel")) && (await p.$$("#senhaRegras li.ok")).length === 7, "todos os requisitos verdes: “Senha forte”");
await p.fill("#senha2", "Kq8!vRt2mz"); await p.click("#salvar");
await p.waitForSelector("#telaResultado:not([hidden])", { timeout: 10000 }).catch(() => {});
ok(/Senha nova salva/.test(await p.textContent("#resTitulo")), "senha salva");
const href = await p.getAttribute("#resBotoes a", "href");
ok(href === "login.html?email=ana%40teste.com", `botão vai para o Entrar com o e-mail, sem o site de fora (${href})`);
await p.screenshot({ path: "saida/conta-acao-pronto.png" });

// 3) entrar com a senha nova
await p.click("#resBotoes a"); await p.waitForTimeout(1500);
ok((await p.inputValue("#email")) === "ana@teste.com", "Entrar já vem com o e-mail");
await p.fill("#senha", "Kq8!vRt2mz"); await p.click("#entrar");
await p.waitForURL((u) => !/login\.html/.test(u.toString()), { timeout: 15000 }).catch(() => {});
ok(!/login\.html/.test(p.url()), "entra com a senha nova");

// 4) o mesmo link de novo / link incompleto
await p.goto(`${BASE}conta-acao.html?mode=resetPassword&oobCode=${cod}`);
await p.waitForSelector("#telaResultado:not([hidden])", { timeout: 10000 }).catch(() => {});
ok(/não vale mais/.test(await p.textContent("#resTitulo")) && (await p.getAttribute("#resBotoes a", "href")) === "recuperar-senha.html", "link já usado: explica e oferece pedir outro");
await p.goto(`${BASE}conta-acao.html`);
await p.waitForSelector("#telaResultado:not([hidden])", { timeout: 10000 }).catch(() => {});
ok(/não vale mais/.test(await p.textContent("#resTitulo")), "link incompleto: explica");

// 5) confirmar e-mail
const email = `novo${Date.now()}@teste.com`;
const cad = await api("accounts:signUp", { email, password: "teste123", returnSecureToken: true });
await api("accounts:sendOobCode", { requestType: "VERIFY_EMAIL", idToken: cad.idToken });
const codV = await ultimo(email, "VERIFY_EMAIL");
const B = await navegador({ mobile: true });
const pv = await B.ctx.newPage(); pv.on("pageerror", (e) => erros.push(e.message));
await pv.goto(`${BASE}conta-acao.html?mode=verifyEmail&oobCode=${codV}&continueUrl=${encodeURIComponent(BASE + "feed.html")}`);
await pv.waitForSelector("#telaResultado:not([hidden])", { timeout: 10000 }).catch(() => {});
ok(/E-mail confirmado/.test(await pv.textContent("#resTitulo")), "confirmar e-mail: “E-mail confirmado”");
ok((await pv.getAttribute("#resBotoes a", "href")) === "login.html?continuar=feed.html", "sem conta aberta: vai para o Entrar e depois para a página do link");
const info = await api("accounts:lookup", { idToken: cad.idToken });
ok(info.users?.[0]?.emailVerified === true, "a conta ficou confirmada de verdade");
await pv.screenshot({ path: "saida/conta-acao-email.png" });
await B.browser.close();

ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
try { execSync("node seed.mjs", { cwd: new URL(".", import.meta.url).pathname, stdio: "ignore" }); } catch {}
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo"); process.exit(falhas ? 1 : 0);
