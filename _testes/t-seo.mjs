// Google e compartilhamento: cada página pública com título, descrição, endereço oficial (canonical) e imagem de prévia;
// nome do site (WebSite/Organization) no Início e no Entrar; a área de quem tem conta fora da busca (noindex); sitemap e
// robots; página "Esqueceu a senha?" funcionando sem login.
// Uso: node t-seo.mjs (emulador + servidor-csp)
import { readFileSync } from "node:fs";
import { navegador } from "./nav.mjs";
let falhas = 0; const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) falhas++; };
const R = new URL("..", import.meta.url).pathname;
const ler = (f) => readFileSync(R + f, "utf8");
const PUB = ["index.html", "login.html", "cadastre-se.html", "recuperar-senha.html", "ajuda.html", "sobre.html", "contato.html", "clientes.html", "profissionais.html", "socios-parcerias.html", "seguranca.html", "diretrizes.html", "como-ordenamos.html", "termos.html", "privacidade.html"];
const PRIV = ["admin.html", "configuracoes.html", "conta.html", "feed.html", "mensagens.html", "mural.html", "negocios.html", "notificacoes.html", "social.html", "suporte.html", "usuarios.html", "rede.html", "verificar-email.html", "offline.html", "link.html", "404.html"];
const titulos = new Set();
for (const f of PUB) {
  const s = ler(f);
  const t = s.match(/<title>([^<]*)<\/title>/)?.[1] || "", d = s.match(/<meta name="description" content="([^"]*)"/)?.[1] || "";
  const can = [...s.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
  const okHead = t && /Help Floripa/.test(t) && d.length >= 90 && d.length <= 190 && can.length === 1 && can[0] === (f === "index.html" ? "https://helpfloripa.com.br/" : "https://helpfloripa.com.br/" + f)
    && /og:image" content="https:\/\/helpfloripa.com.br\/compartilhar.png"/.test(s) && /og:site_name" content="Help Floripa"/.test(s) && !/name="robots" content="noindex/.test(s);
  ok(okHead, `${f}: “${t}” · descrição ${d.length} letras · canonical · prévia`);
  titulos.add(t);
}
ok(titulos.size === PUB.length, "cada página com um título diferente");
for (const f of ["index.html", "login.html"]) {
  const j = JSON.parse(ler(f).match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const site = j["@graph"].find((x) => x["@type"] === "WebSite"), org = j["@graph"].find((x) => x["@type"] === "Organization");
  ok(site?.name === "Help Floripa" && site.url === "https://helpfloripa.com.br/" && org?.logo && org.sameAs?.length, `${f}: nome do site e organização para o Google`);
}
ok(PRIV.every((f) => /<meta name="robots" content="noindex"/.test(ler(f))), "área de quem tem conta com noindex (fora da busca)");
ok(!/sem comiss/i.test(ler("login.html")) && !/sem comiss/i.test(ler("cadastre-se.html")), "Entrar/Criar conta sem “sem comissão” (texto que o Google mostrava)");
const sm = ler("sitemap.xml");
ok(PUB.every((f) => sm.includes("https://helpfloripa.com.br/" + (f === "index.html" ? "" : f) + "</loc>")) && !/feed\.html|mensagens\.html/.test(sm), "sitemap com as páginas públicas e sem as da conta");
ok(/Sitemap: https:\/\/helpfloripa.com.br\/sitemap.xml/.test(ler("robots.txt")) && !/Disallow: \/feed/.test(ler("robots.txt")), "robots aponta o sitemap e não esconde as páginas com noindex");

// Esqueceu a senha? (sem login)
const A = await navegador({ mobile: true });
const p = await A.ctx.newPage();
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
const base = "http://127.0.0.1:5057/";
await p.goto(base + "login.html"); await p.waitForTimeout(1500);
await p.fill("#email", "ana@teste.com");
ok((await p.getAttribute("#esqueci", "href")) === "recuperar-senha.html?email=ana%40teste.com", "Entrar: “Esqueceu a senha?” leva à página própria com o e-mail");
await p.click("#esqueci"); await p.waitForLoadState(); await p.waitForTimeout(1500);
ok(/recuperar-senha\.html/.test(p.url()) && (await p.inputValue("#email")) === "ana@teste.com", "página “Esqueceu a senha?” abre sem login, com o e-mail preenchido");
await p.click("#enviar");
await p.waitForSelector("#avisoSenha:not([hidden])", { timeout: 10000 }).catch(() => {});
ok(/enviamos um link/.test(await p.textContent("#avisoSenha")), "enviar: aviso de link enviado");
ok(/Enviar de novo em/.test(await p.textContent("#enviar")) && (await p.isDisabled("#enviar")), "espera antes de enviar de novo");
await p.screenshot({ path: "saida/recuperar-senha.png" });
await p.fill("#email", "naoexiste@teste.com"); await p.evaluate(() => localStorage.removeItem("hf-senha-ate")); await p.reload(); await p.waitForTimeout(1200);
await p.fill("#email", "ninguem@teste.com"); await p.click("#enviar");
await p.waitForTimeout(2000);
ok(/Se existir uma conta/.test(await p.textContent("#avisoSenha")), "e-mail sem conta: a mesma resposta (não revela quem tem conta)");
for (const f of ["sitemap.xml", "robots.txt", "compartilhar.png"]) ok((await p.request.get(base + f)).ok(), `${f} publicado`);
ok(!erros.length, "sem erros na página" + (erros.length ? ": " + erros.join(" | ") : ""));
await A.browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo"); process.exit(falhas ? 1 : 0);
