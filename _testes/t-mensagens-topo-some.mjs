// Mensagens: topo (título, busca, abas, filtros) e barra de baixo somem ao descer a lista e voltam ao subir
// (13/11/2026, pedido do dono). Uso: node t-mensagens-topo-some.mjs (rodar seed.mjs antes)
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(A.ctx, "ana", "mensagens.html");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#listaConversas > *"); await p.waitForTimeout(2000);
const est = () => p.evaluate(() => {
  const c = document.querySelector(".side-cabeca"), l = document.getElementById("listaConversas"), b = document.getElementById("barraRede");
  const rc = c.getBoundingClientRect(), rb = b.getBoundingClientRect(), pri = l.firstElementChild.getBoundingClientRect();
  return { cTop: Math.round(rc.top), cBot: Math.round(rc.bottom), cAlt: Math.round(rc.height), pad: parseFloat(l.style.paddingTop) || 0,
    bTop: Math.round(rb.top), vh: innerHeight, pri: Math.round(pri.top), y: l.scrollTop, fab: getComputedStyle(document.getElementById("btnNovaConversa")).transform };
});
// lista longa para dar o que rolar
await p.evaluate(() => { const l = document.getElementById("listaConversas"); for (let i = 0; i < 40; i++) { const d = document.createElement("div"); d.style.height = "72px"; d.className = "teste-linha"; d.textContent = "linha " + i; l.appendChild(d); } });
let e = await est();
ok(e.cTop === 0 && Math.abs(e.pad - e.cAlt) <= 1, `cabeça no topo e a lista começa embaixo dela (${e.cAlt} px)`);
ok(e.pri >= e.cBot - 1, `primeira conversa aparece inteira, abaixo da cabeça (${e.pri} ≥ ${e.cBot})`);
const barraNormal = e.bTop;
const abas = await p.evaluate(() => { const m = document.querySelector(".modos"); const bs = [...m.querySelectorAll("button")].filter((b) => !b.hidden).map((b) => b.getBoundingClientRect()); return { sem: m.classList.contains("sem-negocios"), n: bs.length, esq: Math.round(bs[0].left), dir: Math.round(innerWidth - bs[bs.length - 1].right) }; });
if (abas.sem && abas.n === 2) ok(abas.esq <= 16 && abas.dir <= 16, `sem negócio: Pessoal e Chamadas uma em cada ponta (${abas.esq} px | ${abas.dir} px)`);

const rolar = async (ate) => { for (let i = 0; i < 12; i++) { await p.evaluate((ate) => { const l = document.getElementById("listaConversas"); l.scrollTop += (ate - l.scrollTop) / 3; }, ate); await p.waitForTimeout(30); } await p.evaluate((ate) => { document.getElementById("listaConversas").scrollTop = ate; }, ate); await p.waitForTimeout(400); };
await rolar(600);
e = await est();
ok(e.cBot <= 1, `ao descer, o topo some (${e.cTop}..${e.cBot})`);
ok(e.bTop >= e.vh - 1, `ao descer, a barra de baixo some (${e.bTop} de ${e.vh})`);
ok(e.fab !== "none", "o \"+\" desce junto");
await rolar(450);
e = await est();
ok(e.cTop === 0 && Math.abs(e.bTop - barraNormal) <= 1, `ao subir, topo e barra voltam (${e.cTop}, ${e.bTop})`);
await rolar(900);
await p.locator('.modos [data-modo="chamadas"]').evaluate((b) => b.click()).catch(() => {});
await p.waitForTimeout(500);
e = await est();
ok(e.cTop === 0, "trocar para Chamadas mostra o topo de novo");
await p.screenshot({ path: "saida/msg-topo-some.png" });
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros[0] : ""));
process.exit(process.exitCode || 0);
