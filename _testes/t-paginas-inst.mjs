// Páginas institucionais nacionais: barra entre páginas, Segurança, Diretrizes, Ajuda com temas, sem erros.
import { navegador, entrar, BASE } from "./nav.mjs";
const { browser, ctx } = await navegador({ mobile: true });
const erros = [];
const p = await entrar(ctx, "ana", "seguranca.html");
p.on("pageerror", (e) => erros.push(p.url() + " " + e.message));
p.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) erros.push(p.url() + " " + m.text()); });
const paginas = ["seguranca.html", "diretrizes.html", "ajuda.html", "sobre.html", "contato.html", "clientes.html", "profissionais.html", "socios-parcerias.html", "termos.html", "privacidade.html"];
for (const pg of paginas) {
  await p.goto(BASE + pg); await p.waitForTimeout(1300);
  const r = await p.evaluate(() => ({ nav: document.querySelectorAll(".nav-inst a").length, atual: document.querySelector('.nav-inst [aria-current="page"]')?.textContent, largura: document.documentElement.scrollWidth > innerWidth + 1, simbolosFaltando: [...document.querySelectorAll("use")].map((u) => u.getAttribute("href")).filter((h) => h.startsWith("#") && !document.getElementById(h.slice(1))) }));
  console.log(pg, JSON.stringify(r));
  await p.screenshot({ path: `saida/inst-${pg.replace(".html", "")}.png`, fullPage: true });
}
// Ajuda: link "mais procuradas" abre a pergunta; busca esconde os temas
await p.goto(BASE + "ajuda.html"); await p.waitForTimeout(1000);
await p.tap('.populares a[href="#p-planos"]'); await p.waitForTimeout(400);
console.log("pergunta aberta:", await p.evaluate(() => document.getElementById("p-planos").open));
await p.fill("#buscaFaq", "enquete"); await p.waitForTimeout(200);
console.log("busca:", await p.evaluate(() => ({ temas: document.getElementById("topicosAjuda").hidden, achadas: [...document.querySelectorAll(".faq details:not([hidden])")].map((d) => d.querySelector("summary").textContent) })));
// Menu com os itens novos
await p.tap("#btnMenu"); await p.waitForTimeout(500);
console.log("menu:", await p.evaluate(() => [...document.querySelectorAll(".gaveta-item .rot")].map((r) => r.firstChild.textContent).join(" | ")));
console.log("erros:", erros.length ? erros : "nenhum");
await browser.close();
