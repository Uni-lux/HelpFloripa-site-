// Barra de baixo igual em todas as abas da rede (13/11/2026, print do dono: no Mensagens ela ficava um pouco menor).
// Confere largura, altura, colunas e ícones da barra no Diário, Comunidade, Mensagens e Perfil, em 360 e 390 px, e que
// nenhuma página empurra a tela para o lado. Uso: node t-barra-igual.mjs (rodar seed.mjs antes)
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const PAGS = ["feed.html", "mural.html", "mensagens.html", "usuarios.html"];
for (const largura of [360, 390]) {
  const medidas = {};
  for (const pg of PAGS) {
    const p = await entrar(A.ctx, "ana", pg);
    await p.setViewportSize({ width: largura, height: 780 });
    await p.waitForSelector("#barraRede a"); await p.waitForTimeout(2500);
    medidas[pg] = await p.evaluate(() => {
      const b = document.querySelector("#barraRede"); const r = b.getBoundingClientRect();
      return { esq: Math.round(r.left), larg: Math.round(r.width), alt: Math.round(r.height), baixo: Math.round(innerHeight - r.bottom),
        rola: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        icones: [...b.querySelectorAll("a")].map((a) => { const s = (a.querySelector(".mini-av") || a.querySelector("svg")).getBoundingClientRect(); return Math.round(s.left + s.width / 2); }) };
    });
    await p.close();
  }
  const base = medidas["feed.html"];
  for (const pg of PAGS) {
    const m = medidas[pg];
    ok(m.esq === 0 && m.larg === largura && m.baixo === 0, `${largura}px ${pg}: barra de ponta a ponta e colada embaixo (${m.esq}, ${m.larg}, ${m.baixo})`);
    ok(m.alt === base.alt && JSON.stringify(m.icones) === JSON.stringify(base.icones), `${largura}px ${pg}: mesma altura e ícones nos mesmos lugares do Diário (${m.icones.join(",")})`);
    ok(m.rola === 0, `${largura}px ${pg}: nada empurra a tela para o lado (${m.rola})`);
  }
}
process.exit(process.exitCode || 0);
