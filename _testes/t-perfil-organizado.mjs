// Perfil como nas redes (13/11/2026): números ao lado da foto, sem convites vazios (bio/links), pronomes e profissão,
// 5 redes (Instagram, WhatsApp, TikTok, X, YouTube) com "quem pode ver", abas Publicações · Vídeos · Republicados · Salvos,
// sem a média de estrelas no perfil pessoal e perfil de outra pessoa com topo "voltar · @nome · compartilhar".
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && node t-perfil-organizado.mjs
import { navegador, entrar } from "./nav.mjs";
import { readFileSync } from "node:fs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const erros = [];
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
const A = await navegador({ mobile: true });
await A.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const p = await entrar(A.ctx, "bruno", "usuarios.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#meuPerfil .pf-nome", { timeout: 25000 }); await p.waitForTimeout(2500);
const info = await p.evaluate(() => {
  const r = document.querySelector("#meuPerfil"), av = r.querySelector(".pf-avatar-wrap").getBoundingClientRect(), st = r.querySelector(".pf-stats").getBoundingClientRect();
  return { mais: !!r.querySelector(".pf-mais-flash"), nota: !!r.querySelector('[data-stat="nota"]'), insights: !!r.querySelector('[data-stat="insights"]'),
    ladoFoto: st.left >= av.right - 2 && st.top < av.bottom && st.bottom > av.top + av.height / 3,
    bioConvite: !!r.querySelector(".pf-bio-add"), linksVisiveis: !r.querySelector(".pf-links")?.hidden,
    abas: [...document.querySelectorAll("#abasMeuPerfil [data-aba]")].map((b) => b.dataset.aba).join(","),
    botoes: [...r.querySelectorAll(".pf-acoes > .btn")].map((b) => Math.round(b.getBoundingClientRect().height)),
    sw: document.documentElement.scrollWidth, vw: innerWidth };
});
ok(!info.mais && !info.nota && !info.insights, "sem o \"+\" na foto, sem estrelas e sem o ícone solto de estatísticas");
ok(info.ladoFoto, "números ao lado da foto");
ok(!info.bioConvite && !info.linksVisiveis, "sem bio e sem links: nada de convite (perfil limpo)");
ok(info.abas === "posts,reels,repub,salvos", "abas Publicações · Vídeos · Republicados · Salvos (" + info.abas + ")");
ok(info.botoes.every((h) => h <= 36), "botões baixos (" + info.botoes.join(", ") + ")");
ok(info.sw <= info.vw, "sem passar da largura");
await p.screenshot({ path: "saida/po-limpo.png" });
// Editar perfil: pronomes, profissão e as 5 redes
await p.locator("#meuPerfil .pf-acoes .btn.pri").click(); await p.waitForTimeout(700);
ok(await p.locator("#edLinksLista .ed-rede").count() === 5, "editor com as 5 redes");
await p.fill("#edBio", "Reparos elétricos e hidráulicos em toda a Grande Florianópolis.");
await p.evaluate(() => { const s = document.querySelector("#edPronomes"); s.value = "ele/dele"; s.dispatchEvent(new Event("change")); });
await p.fill("#edProfissao", "Engenheiro");
await p.fill("#edLink-instagram", "https://www.instagram.com/Help.Floripa/?igsh=abc");
await p.fill("#edLink-whatsapp", "(48) 99684-9431");
await p.fill("#edLink-tiktok", "https://www.tiktok.com/@help.floripa");
await p.fill("#edLink-x", "@help_floripa");
await p.fill("#edLink-youtube", "youtube.com/@HelpFloripa");
await p.evaluate(() => { const s = document.querySelector("#edLinkVer-whatsapp"); s.value = "ninguem"; s.dispatchEvent(new Event("change")); });
await p.locator("#edSalvar").click(); await p.waitForTimeout(3000);
const d = await p.evaluate(() => ({ links: [...document.querySelectorAll("#meuPerfil .pf-link:not(.add)")].map((a) => [a.className.replace("pf-link ", ""), a.getAttribute("href"), !!a.querySelector(".pf-link-priv")]),
  pron: document.querySelector("#meuPerfil .pf-pron")?.textContent, prof: document.querySelector("#meuPerfil .pf-prof")?.textContent }));
const L = Object.fromEntries(d.links.map(([k, h, pr]) => [k, { h, pr }]));
ok(L.instagram?.h === "https://instagram.com/Help.Floripa" && L.tiktok?.h === "https://www.tiktok.com/@help.floripa" && L.x?.h === "https://x.com/help_floripa" && L.youtube?.h === "https://www.youtube.com/@HelpFloripa", "Instagram, TikTok, X e YouTube com os links limpos");
ok(L.whatsapp?.h === "https://wa.me/5548996849431" && L.whatsapp.pr, "WhatsApp com cadeado (só eu)");
ok(d.pron === "ele/dele" && d.prof === "Engenheiro", "pronomes ao lado do nome e profissão embaixo");
await p.screenshot({ path: "saida/po-completo.png" });
// aba Republicados
await p.locator('#abasMeuPerfil [data-aba="repub"]').click(); await p.waitForTimeout(1500);
ok(await p.locator("#gradePosts .vazio-grade, #gradePosts .tile").count() > 0, "aba Republicados abre (vazia ou com publicações)");
// visitante
const B = await navegador({ mobile: true });
await B.ctx.addInitScript(() => { try { localStorage.setItem("hf-chat-config", JSON.stringify({ tema: "escuro" })); } catch {} });
const q = await entrar(B.ctx, "ana", "usuarios.html");
q.on("pageerror", (e) => erros.push(e.message));
await q.goto(`http://127.0.0.1:5057/usuarios.html?perfil=${ids.bruno}`); await q.waitForSelector("#ppCabecalho .pf-nome", { timeout: 25000 }); await q.waitForTimeout(3500);
const v = await q.evaluate(() => ({ links: [...document.querySelectorAll("#ppCabecalho .pf-link")].map((a) => a.className.replace("pf-link ", "")).sort().join(","),
  topo: document.querySelector("#tPerfilPublico")?.textContent, voltar: document.querySelector(".pp-topo [data-fechar] use")?.getAttribute("href"),
  comp: !!document.querySelector("#ppCompartilhar"), nota: !!document.querySelector('#ppCabecalho [data-stat="nota"]'),
  pron: document.querySelector("#ppCabecalho .pf-pron")?.textContent, abas: [...document.querySelectorAll("#folhaPerfil .abas-perfil [data-aba]")].map((b) => b.dataset.aba).join(",") }));
ok(v.links === "instagram,tiktok,x,youtube", "visitante vê as redes públicas e não o WhatsApp 'só eu' (" + v.links + ")");
ok(/^@brunoreparos/.test(v.topo || "") && v.voltar === "#i-voltar" && v.comp, "topo do perfil: voltar · @nome · compartilhar (" + v.topo + ")");
ok(!v.nota && v.pron === "ele/dele", "visitante: sem estrelas e com os pronomes");
ok(v.abas === "posts,reels,repub", "visitante: Publicações · Vídeos · Republicados (" + v.abas + ")");
await q.screenshot({ path: "saida/po-visitante.png" });
// limpa
await p.locator('#abasMeuPerfil [data-aba="posts"]').click(); await p.waitForTimeout(300);
await p.locator("#meuPerfil .pf2 .pf-acoes .btn.pri").click(); await p.waitForTimeout(600);
for (const t of ["instagram", "whatsapp", "tiktok", "x", "youtube"]) await p.fill("#edLink-" + t, "");
await p.fill("#edBio", ""); await p.fill("#edProfissao", "");
await p.evaluate(() => { const s = document.querySelector("#edPronomes"); s.value = ""; s.dispatchEvent(new Event("change")); });
await p.locator("#edSalvar").click(); await p.waitForTimeout(2500);
ok(await p.evaluate(() => document.querySelector("#meuPerfil .pf-links").hidden && document.querySelector("#meuPerfil .pf-pron").hidden), "apagar tudo deixa o perfil limpo de novo");
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close(); await B.browser.close();
