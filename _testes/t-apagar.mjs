// Editar e apagar mensagens em Mensagens (duas pessoas, cada uma no seu navegador).
// Uso: node t-apagar.mjs [novas|ar]   novas = regras do repositório (padrão) · ar = regras antigas (sem editar/apagar p/ todos)
import { navegador, entrar, USUARIOS } from "./nav.mjs";
const modo = process.argv[2] || "novas";
// As regras do emulador já devem estar trocadas (rodar-tudo.sh): "novas" = main, "ar" = regras publicadas/pr25.
const A = await navegador({ mobile: false }), B = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", `mensagens.html?conversa=${USUARIOS.conv}`);
const pb = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${USUARIOS.conv}`);
await pa.waitForSelector(".linha-msg", { timeout: 20000 }); await pb.waitForSelector(".linha-msg", { timeout: 20000 });
const ok = (c, t) => console.log(c ? "  ✔" : "  ✘", t);

async function mandar(p, texto) {
  await p.fill("#texto", texto); await p.click("#btnEnviar");
  await p.waitForFunction((t) => [...document.querySelectorAll(".linha-msg.minha:not(.pendente) .texto")].some((e) => e.textContent.includes(t)), texto, { timeout: 15000 });
}
const linha = (p, texto) => p.locator(".linha-msg", { hasText: texto }).last();
async function menu(p, texto, opcao) {
  const l = linha(p, texto);
  await l.locator(".bolha").click({ button: "right" });
  await p.locator("#menuMsg button", { hasText: opcao }).first().click();
}

await mandar(pa, "Texto com erro de digitaçao");
await mandar(pa, "Esta vai ser apagada");
await mandar(pa, "Esta some só para o Bruno");
await pb.waitForFunction(() => document.body.innerText.includes("Esta some só para o Bruno"), null, { timeout: 15000 });

// 1) Editar
await menu(pa, "Texto com erro de digitaçao", "Editar");
await pa.locator(".hf-ma textarea").fill("Texto com erro de digitação corrigido");
await pa.locator(".hf-ma-acoes .pri").click();
if (modo === "novas") {
  await pa.waitForSelector(".linha-msg .editada", { timeout: 10000 }).catch(() => {});
  ok(await linha(pa, "corrigido").locator(".editada").count() === 1, "editada: aparece \"editada\" para quem editou");
  await pb.waitForFunction(() => [...document.querySelectorAll(".linha-msg")].some((l) => l.textContent.includes("corrigido") && l.querySelector(".editada")), null, { timeout: 10000 }).catch(() => {});
  ok(await linha(pb, "corrigido").locator(".editada").count() === 1, "editada: a outra pessoa vê \"editada\"");
  await linha(pb, "corrigido").locator(".editada").click();
  const versoes = await pb.locator(".hf-ma-versao").allTextContents();
  ok(versoes.length === 2 && versoes[1].includes("Original") && versoes[1].includes("digitaçao") && versoes[0].includes("corrigido"), "editada: abre o original (" + versoes.length + " versões)");
  await pb.screenshot({ path: "saida/apagar-historico.png" });
  await pb.keyboard.press("Escape");
} else {
  await pa.waitForTimeout(1500);
  const t = await pa.locator(".toast, #toast").allTextContents().catch(() => []);
  ok(t.join(" ").includes("regras novas"), "regras do ar: editar avisa que falta publicar → " + t.join(" | ").slice(0, 120));
}

// 2) Apagar para todos
await menu(pa, "Esta vai ser apagada", "Apagar");
await pa.locator(".hf-ma-op", { hasText: "Apagar para todos" }).click();
if (modo === "novas") {
  await pa.waitForFunction(() => [...document.querySelectorAll(".bolha.apagada")].some((b) => b.textContent.includes("Você apagou esta mensagem")), null, { timeout: 10000 }).catch(() => {});
  ok(await pa.locator(".bolha.apagada", { hasText: "Você apagou esta mensagem" }).count() === 1, "apagada: quem apagou vê \"Você apagou esta mensagem · hora\"");
  await pb.waitForFunction(() => [...document.querySelectorAll(".bolha.apagada")].some((b) => /Ana apagou esta mensagem · \d\d:\d\d/.test(b.textContent)), null, { timeout: 10000 }).catch(() => {});
  ok(await pb.locator(".bolha.apagada", { hasText: "apagou esta mensagem" }).count() === 1, "apagada: a outra pessoa vê \"Ana apagou esta mensagem · hora\"");
  ok(!(await pb.locator(".linha-msg", { hasText: "Esta vai ser apagada" }).count()), "apagada: o texto não aparece mais na conversa");
  await pb.locator(".bolha.apagada .ver-apagada").last().click();
  await pb.waitForSelector(".hf-ma", { timeout: 8000 });
  const corpo = await pb.locator(".hf-ma").textContent();
  ok(corpo.includes("Esta vai ser apagada") && corpo.includes("Some de vez em"), "ver mensagem apagada: mostra o conteúdo e o prazo");
  ok(await pb.locator(".hf-ma-acoes button", { hasText: "Denunciar" }).count() === 1, "ver mensagem apagada: quem recebeu pode denunciar");
  await pb.waitForTimeout(400); await pb.screenshot({ path: "saida/apagar-ver.png" });
  await pb.locator(".hf-ma-acoes button", { hasText: "Fechar" }).click();
  // quem apagou também abre (sem denunciar)
  await pa.locator(".bolha.apagada .ver-apagada").last().click();
  await pa.waitForSelector(".hf-ma", { timeout: 8000 });
  ok(await pa.locator(".hf-ma-acoes button", { hasText: "Denunciar" }).count() === 0 && (await pa.locator(".hf-ma").textContent()).includes("Esta vai ser apagada"), "ver mensagem apagada: quem apagou também vê (sem denunciar)");
  await pa.keyboard.press("Escape");
  // a lista de conversas mostra "Mensagem apagada"? (só quando era a última — aqui não era)
} else {
  await pa.waitForTimeout(2000);
  ok(!(await pa.locator(".linha-msg", { hasText: "Esta vai ser apagada" }).count()), "regras do ar: apagar para todos apaga de vez (jeito antigo)");
}

// 3) Apagar para mim (Bruno apaga uma mensagem da Ana só para ele)
await menu(pb, "Esta some só para o Bruno", "Apagar");
ok(await pb.locator(".hf-ma-op", { hasText: "Apagar para todos" }).count() === 0, "apagar mensagem de outra pessoa: só \"Apagar para mim\"");
await pb.locator(".hf-ma-op", { hasText: "Apagar para mim" }).click();
await pb.waitForTimeout(800);
ok(!(await pb.locator(".linha-msg", { hasText: "Esta some só para o Bruno" }).count()), "apagar para mim: some da tela do Bruno");
ok(await pa.locator(".linha-msg", { hasText: "Esta some só para o Bruno" }).count() === 1, "apagar para mim: a Ana continua vendo");
await pb.reload(); await pb.waitForSelector(".linha-msg", { timeout: 20000 }); await pb.waitForTimeout(1500);
ok(!(await pb.locator(".linha-msg", { hasText: "Esta some só para o Bruno" }).count()), "apagar para mim: continua apagada depois de recarregar");
if (modo === "novas") ok(await pb.locator(".bolha.apagada").count() >= 1, "depois de recarregar: o aviso de apagada continua");
await pb.screenshot({ path: "saida/apagar-cel.png" });
await pa.screenshot({ path: "saida/apagar-pc.png" });
await A.browser.close(); await B.browser.close();
