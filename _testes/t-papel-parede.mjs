// Papel de parede do Mensagens (09/11/2026, pedido do dono): a Ponte saiu do padrão. Conta nova = Pontilhado; quem estava
// com a Ponte só por ser o padrão antigo passa para o Pontilhado; quem escolheu a Ponte continua com ela.
// Uso: node t-papel-parede.mjs
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const fundo = async (cfg) => {
  const B = await navegador({ mobile: true });
  if (cfg) await B.ctx.addInitScript((c) => { try { localStorage.setItem("hf-chat-config", c); } catch {} }, JSON.stringify(cfg));
  const p = await entrar(B.ctx, "bruno", "mensagens.html");
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => [document.documentElement.dataset.fundo, document.querySelector('[data-cfg="fundo"] [data-valor]')?.dataset.valor]);
  await B.browser.close(); return r;
};
const [nova, primeiro] = await fundo(null);
ok(nova === "padrao", "conta nova: Pontilhado (" + nova + ")");
ok(primeiro === "padrao", "Pontilhado é o primeiro da lista");
ok((await fundo({ fundo: "ponte", tema: "escuro" }))[0] === "padrao", "Ponte do padrão antigo vira Pontilhado");
ok((await fundo({ fundo: "ponte", fundoEscolhido: true }))[0] === "ponte", "quem escolheu a Ponte continua com ela");
ok((await fundo({ fundo: "oceano" }))[0] === "oceano", "outros fundos escolhidos ficam como estão");
