// "Nova publicação" sem nada passando da largura (celular 360/390 px e computador): grade "Adicionar à publicação"
// com nome em cada botão, contador dentro do campo, campo que cresce com o texto e botões que continuam abrindo
// a enquete e a caixa de perguntas (marcados como ativos). Capturas em saida/compositor-*.png.
import { navegador, entrar } from "./nav.mjs";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
for (const [nome, larg] of [["celular-360", 360], ["celular-390", 390], ["computador", 1280]]) {
  const { browser, ctx } = await navegador({ mobile: larg < 600 });
  const page = await entrar(ctx, "ana", "feed.html");
  await page.setViewportSize({ width: larg, height: larg < 600 ? 780 : 860 });
  await page.waitForSelector("#btnComporFeed", { timeout: 30000 }); await page.waitForTimeout(1200);
  await page.locator("#btnComporFeed").click(); await page.waitForTimeout(700);
  const corpo = page.locator("#folhaPublicar .folha-corpo");
  const med = await corpo.evaluate((c) => ({ sw: c.scrollWidth, cw: c.clientWidth, fora: [...c.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(), rc = c.getBoundingClientRect(); return r.width && (r.right > rc.right + 1 || r.left < rc.left - 1); }).map((e) => e.id || e.className).slice(0, 4) }));
  ok(med.sw <= med.cw && !med.fora.length, `${nome}: nada passa da largura (scroll ${med.sw} / ${med.cw}${med.fora.length ? " · fora: " + med.fora.join(", ") : ""})`);
  const rotulos = await page.locator(".pub-ferr:visible span:last-child").allTextContents();
  ok(rotulos.length === 8 && ["Imagem", "Marcar", "Hashtag", "Local", "Agendar", "Público", "Ajustes", "Rascunhos"].every((r) => rotulos.includes(r)), `${nome}: 8 botões com nome (sem espaço vazio) → ${rotulos.join(", ")}`);
  const tipos = await page.locator(".pub-tipo:visible").allTextContents();
  ok(tipos.join() === "Texto,Foto,Enquete,Perguntas" && await page.locator(".pub-tipo.ativo").textContent() === "Texto", `${nome}: tipos → ${tipos.join(", ")} (Vídeo só com Storage)`);
  const tiposCabem = await page.locator("#pubTipos").evaluate((w) => w.scrollWidth <= w.clientWidth + 1);
  ok(tiposCabem, `${nome}: os tipos cabem sem rolar`);
  await page.screenshot({ path: `saida/compositor-${nome}.png` });
  if (nome === "celular-390") {
    const h0 = await page.locator("#pubTexto").evaluate((t) => t.offsetHeight);
    await page.locator("#pubTexto").fill("Linha\n".repeat(9) + "Reforma pronta #reforma");
    await page.locator("#pubTexto").dispatchEvent("input");
    const h1 = await page.locator("#pubTexto").evaluate((t) => t.offsetHeight);
    ok(h1 > h0 && /\d+\/1000/.test(await page.locator("#pubCont").textContent()), `campo cresce com o texto (${h0} → ${h1} px) e conta ${await page.locator("#pubCont").textContent()}`);
    await page.locator("#pubEnqueteBtn").click(); await page.waitForTimeout(300);
    await page.locator("#pubCaixaBtn").click(); await page.waitForTimeout(300);
    ok(await page.locator("#pubCaixa").isVisible() && !(await page.locator("#pubEnquete").isVisible()) && await page.locator("#pubCaixaBtn.ativo").count() === 1 && await page.locator(".pub-tipo.ativo").count() === 1, "um tipo por vez: Perguntas troca a Enquete");
    const med2 = await corpo.evaluate((c) => c.scrollWidth <= c.clientWidth);
    ok(med2, "com a caixa aberta, continua sem passar da largura");
    await page.screenshot({ path: "saida/compositor-com-enquete.png", fullPage: false });
  }
  await browser.close();
}
