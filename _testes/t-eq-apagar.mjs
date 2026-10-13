// Chat da equipe: editar, apagar para todos (com "Ver mensagem apagada"), apagar para mim
// e o lápis na foto da equipe. Carla (admin) no computador e Daniel (moderação) no celular.
import { navegador, entrar } from "./nav.mjs";
// Precisa das regras novas no emulador (node trocar-regras.mjs main).
const A = await navegador({ mobile: false }), B = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "admin", "admin.html#equipe");
const pb = await entrar(B.ctx, "dani", "admin.html#equipe");
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);
await pa.waitForSelector(".eq-chat", { timeout: 30000 }); await pb.waitForSelector(".eq-chat", { timeout: 30000 });
await pa.waitForTimeout(2000);
// lápis na foto da equipe: na lista e no cabeçalho
await pa.locator(".eq-modos [data-modo=equipe]").click(); await pa.waitForTimeout(300);
ok(await pa.locator(".eq-item .eq-av-com-lapis .eq-eu-lapis").count() === 1, "lápis na foto da equipe (lista)");
ok(await pa.locator(".eq-foto-grupo .eq-eu-lapis").count() === 1, "lápis na foto da equipe (cabeçalho)");
await pa.screenshot({ path: "saida/eq-lapis.png", clip: { x: 0, y: 0, width: 1280, height: 330 } });
// Daniel abre o grupo no celular
await pb.locator(".eq-modos [data-modo=equipe]").tap(); await pb.waitForTimeout(300);
await pb.locator(".eq-item").first().tap(); await pb.waitForTimeout(800);

async function mandar(texto) {
  await pa.locator(".eq-caixa textarea").fill(texto); await pa.dispatchEvent(".eq-caixa textarea", "input");
  await pa.locator(".eq-compor .eq-principal").click();
  await pb.waitForFunction((t) => document.body.innerText.includes(t), texto, { timeout: 15000 });
}
async function menu(texto, opcao) {
  await pa.locator(".eq-linha", { hasText: texto }).last().locator(".eq-balao").click({ button: "right" });
  await pa.locator(".eq-menu:not([hidden]) .eq-menu-item", { hasText: opcao }).first().click();
}
await mandar("Reuniao as 10h");
await mandar("Mensagem que vou apagar");
await mandar("Mensagem que o Daniel apaga para ele");

await menu("Reuniao as 10h", "Editar");
await pa.locator(".hf-ma textarea").fill("Reunião às 11h");
await pa.locator(".hf-ma-acoes .pri").click();
await pb.waitForFunction(() => [...document.querySelectorAll(".eq-linha")].some((l) => l.textContent.includes("Reunião às 11h") && l.querySelector(".eq-editada")), null, { timeout: 10000 }).catch(() => {});
ok(await pb.locator(".eq-linha", { hasText: "Reunião às 11h" }).locator(".eq-editada").count() === 1, "equipe: editada aparece para os outros");
await pb.locator(".eq-linha", { hasText: "Reunião às 11h" }).locator(".eq-editada").tap();
const v = await pb.locator(".hf-ma-versao").allTextContents();
ok(v.length === 2 && v[1].includes("Reuniao as 10h"), "equipe: abre o original");
await pb.keyboard.press("Escape");

await menu("Mensagem que vou apagar", "Apagar");
await pa.locator(".hf-ma-op", { hasText: "Apagar para todos" }).click();
await pb.waitForFunction(() => [...document.querySelectorAll(".eq-balao.apagada")].some((b) => /Carla apagou esta mensagem · \d\d:\d\d/.test(b.textContent)), null, { timeout: 10000 }).catch(() => {});
ok(await pb.locator(".eq-balao.apagada", { hasText: "apagou esta mensagem" }).count() === 1, "equipe: \"Carla apagou esta mensagem · hora\" para os outros");
ok(await pa.locator(".eq-balao.apagada", { hasText: "Você apagou esta mensagem" }).count() === 1, "equipe: \"Você apagou\" para quem apagou");
await pb.locator(".eq-ver-apagada").last().tap();
await pb.waitForSelector(".hf-ma", { timeout: 8000 }); await pb.waitForTimeout(400);
ok((await pb.locator(".hf-ma").textContent()).includes("Mensagem que vou apagar"), "equipe: ver mensagem apagada mostra o conteúdo");
await pb.screenshot({ path: "saida/eq-apagada-cel.png" });
await pb.keyboard.press("Escape");

const alvo = pb.locator(".eq-linha", { hasText: "Mensagem que o Daniel apaga para ele" }).last().locator(".eq-balao");
await alvo.dispatchEvent("contextmenu");
await pb.locator(".eq-menu:not([hidden]) .eq-menu-item", { hasText: "Apagar" }).first().tap();
ok(await pb.locator(".hf-ma-op", { hasText: "Apagar para todos" }).count() === 0, "equipe: mensagem de outra pessoa só tem \"Apagar para mim\"");
await pb.locator(".hf-ma-op", { hasText: "Apagar para mim" }).tap();
await pb.waitForTimeout(800);
ok(!(await pb.locator(".eq-linha", { hasText: "Mensagem que o Daniel apaga para ele" }).count()), "equipe: apagar para mim some para o Daniel");
ok(await pa.locator(".eq-linha", { hasText: "Mensagem que o Daniel apaga para ele" }).count() === 1, "equipe: a Carla continua vendo");
await pb.screenshot({ path: "saida/eq-apagar-cel.png" });
await pa.screenshot({ path: "saida/eq-apagar-pc.png" });
await A.browser.close(); await B.browser.close();
