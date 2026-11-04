// Senha forte (senha-forte.js): regras no aparelho + a lista de requisitos no cadastro e em Configurações → Alterar senha.
// Uso: node t-senha-forte.mjs (emulador + servidor-csp + seed). No fim roda o seed de novo (a senha da Ana muda).
import { execSync } from "node:child_process";
import { navegador, entrar, BASE } from "./nav.mjs";
import { conferirSenha, senhaForte } from "../senha-forte.js";
let falhas = 0; const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
const falta = (s, d) => conferirSenha(s, d).filter((r) => !r.ok).map((r) => r.id);

// 1) regras
const d = { nome: "Ana Souza", nick: "aninha", email: "ana.teste@gmail.com", telefone: "(48) 99684-9431", nascimento: "1995-07-14" };
ok(senhaForte("Kq8!vRt2mz", d), "senha aleatória passa");
ok(falta("kq8!vrt2mz", d).includes("tamanho"), "sem maiúscula: falta");
ok(falta("Kq8vRt2mzp", d).includes("numero"), "sem símbolo: falta");
ok(falta("Kq8!vRt123", d).includes("sequencia") && falta("Kq8!vRtzzz", d).includes("sequencia") && falta("Kq8!vRtcba", d).includes("sequencia"), "123, zzz e cba: sequência");
ok(falta("Kq8!Souza2m", d).includes("nome") && falta("Kq8!ANINHA2", d).includes("nome"), "sobrenome e @usuário (sem diferenciar maiúsculas)");
ok(falta("Kq8!ana.teste@gmail.com", d).includes("contato") && falta("Kq8!vRt9431", d).includes("contato"), "e-mail e final do celular");
ok(falta("Kq8!vRt1407", d).includes("data") && falta("Kq8!vRt1995", d).includes("data"), "dia+mês e ano de nascimento");
ok(falta("Helpfloripa#9k", d).includes("comum") && falta("MinhaSenha!9k", d).includes("comum"), "“helpfloripa” e “senha”");
ok(senhaForte("Pão!d3Queijo", d), "acento conta como letra");

const A = await navegador({ mobile: true });
const erros = [];
// 2) cadastro
const p = await A.ctx.newPage(); p.on("pageerror", (e) => erros.push(e.message));
await p.goto(BASE + "cadastre-se.html"); await p.waitForTimeout(1200);
ok((await p.$$("#senhaRegras li")).length === 7, "cadastro: lista com os 7 requisitos");
ok((await p.$$("#senhaRegras li.ok, #senhaRegras li.falta")).length === 0, "antes de digitar: nada marcado");
await p.fill("#nome", "Carla Mendes"); await p.fill("#email", "carla@teste.com");
await p.fill("#senha", "Carla#2mzK");
ok((await p.getAttribute("[data-regra=nome]", "class")) === "" && (await p.getAttribute("[data-regra=tamanho]", "class")) === "ok", "digitando: verde no que passou, neutro no que falta");
await p.locator("#confirmar").focus();
ok((await p.getAttribute("[data-regra=nome]", "class")) === "falta", "saiu do campo: o que falta fica vermelho");
await p.screenshot({ path: "saida/senha-forte-cadastro.png", fullPage: true });
await p.fill("#senha", "Kq8!vRt2mz");
ok((await p.$$("#senhaRegras li.ok")).length === 7 && /Senha forte/.test(await p.textContent(".sf-nivel")), "senha boa: tudo verde e “Senha forte”");
await p.fill("#nome", "Kq8 Teste");
ok((await p.getAttribute("[data-regra=nome]", "class")) === "falta", "mudar o nome depois confere a senha de novo");
// 3) Configurações → Alterar senha
const c = await entrar(A.ctx, "ana", "configuracoes.html"); c.on("pageerror", (e) => erros.push(e.message));
await c.waitForSelector("#cfgSenha", { timeout: 15000 }); await c.waitForTimeout(1500);
await c.click("#cfgSenha");
await c.fill("#senhaAtual", "teste123");
await c.fill("#senhaNova", "Ana!2mzKqv"); await c.fill("#senhaConfirma", "Ana!2mzKqv");
await c.click("#senhaSalvar"); await c.waitForTimeout(500);
ok(/não está segura/.test(await c.textContent("body")) && (await c.getAttribute("#senhaRegras [data-regra=nome]", "class")) === "falta", "Configurações: senha com o nome não salva e avisa");
await c.screenshot({ path: "saida/senha-forte-config.png" });
await c.fill("#senhaNova", "Kq8!vRt2mz"); await c.fill("#senhaConfirma", "Kq8!vRt2mz");
await c.click("#senhaSalvar");
await c.waitForFunction(() => /Senha alterada/.test(document.body.textContent), null, { timeout: 15000 }).catch(() => {});
ok(/Senha alterada/.test(await c.textContent("body")), "Configurações: senha forte salva");
const r = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "ana@teste.com", password: "Kq8!vRt2mz", returnSecureToken: true }) }).then((x) => x.json());
ok(!!r.idToken, "entra com a senha nova");
ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
try { execSync("node seed.mjs", { cwd: new URL(".", import.meta.url).pathname, stdio: "ignore" }); } catch {}
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo"); process.exit(falhas ? 1 : 0);
