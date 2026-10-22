// Chat da equipe em nível nacional: canais por setor (Geral, Avisos, Segurança, Moderação...), entrar/sair/silenciar,
// Avisos só dos donos, "#PROTOCOLO" vira cartão do chamado, situação (Disponível / Em pausa / Fora do turno),
// encerrar o turno (devolve os chamados e avisa no Geral), transferir avisa o canal do setor.
// Também: logo nova no topo do painel e a busca do celular (lupa que abre o campo na largura toda).
// Uso: node t-equipe-canais.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
let falhas = 0;
const ok = (c, t) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", t); };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const H = (h) => Timestamp.fromMillis(Date.now() - h * 3600e3);
const continuar = async (pg) => { await pg.waitForTimeout(600); const b = pg.locator(".hf-confirma-fundo button", { hasText: "Continuar" }); if (await b.count()) await b.click(); };
const prot = (id) => "#" + id.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();

// Limpa o que testes anteriores deixaram.
for (const c of ["avisos", "seguranca", "moderacao", "pagamentos", "negocios", "conta", "comercial"]) {
  for (const d of (await db.collection(`equipe_canais/${c}/mensagens`).get()).docs) await d.ref.delete();
  await db.doc(`equipe_canais/${c}`).delete();
}
for (const uid of [U.admin, U.dani]) { await db.doc(`usuarios/${uid}`).set({ equipeCanais: {} }, { merge: true }); await db.doc(`equipe_presenca/${uid}`).delete(); }
for (const d of (await db.collection("suporte").where("uid", "==", U.edu).get()).docs) if (["Pix adiantado para limpeza", "Plano não ativou"].includes(d.data().assunto)) await d.ref.delete();
const golpe = await db.collection("suporte").add({ uid: U.edu, nome: "Eduardo Lima", assunto: "Pix adiantado para limpeza", categoria: "golpe", status: "aberto", prioridade: "urgente", criadoEm: H(1), atualizadoEm: H(1), ultimaDe: "usuario" });
const comigo = await db.collection("suporte").add({ uid: U.edu, nome: "Eduardo Lima", assunto: "Plano não ativou", categoria: "outro", status: "aberto", prioridade: "normal", criadoEm: H(3), atualizadoEm: H(3), ultimaDe: "usuario", responsavel: U.admin, responsavelNome: "Carla Equipe" });

// ---------- 1) Moderação (celular): canais do papel, escrever, cartão do chamado, Avisos, entrar e silenciar ----------
const M = await navegador({ mobile: true });
const p = await entrar(M.ctx, "dani", "admin.html#equipe");
const erros = []; p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector(".eq-chat", { timeout: 30000 }); await p.waitForTimeout(2000);
const logo = await p.evaluate(() => { const i = document.querySelector(".ad-logo"); return { src: i.getAttribute("src"), w: i.naturalWidth }; });
ok(logo.src === "logo-app-96.png" && logo.w === 96, "topo do painel com a logo nova (" + logo.src + ")");
ok(!(await p.locator(".ad-busca").isVisible()) && await p.locator("#btBuscaCel").isVisible(), "celular: só a lupa no topo (sem o campo espremido)");
await p.locator("#btBuscaCel").tap(); await p.waitForTimeout(300);
const larg = (await p.locator("#buscaGlobal").boundingBox())?.width || 0;
ok(larg > 300, `lupa abre o campo na largura toda (${Math.round(larg)} px)`);
await p.screenshot({ path: "saida/eqc-busca-cel.png" });
await p.locator("#btBuscaFechar").tap(); await p.waitForTimeout(300);
ok(!(await p.locator(".ad-busca").isVisible()), "× fecha a busca");
await p.locator(".eq-modos [data-modo=equipe]").tap(); await p.waitForTimeout(400);
ok((await p.locator(".eq-modos [data-modo=equipe]").innerText()).includes("Canais"), "abas: Individual | Canais");
const nomes = await p.locator(".eq-item .l1 strong").allTextContents();
ok(["Geral", "Avisos", "Segurança", "Moderação", "Conta e acesso"].every((n) => nomes.includes(n)), "moderação vê Geral, Avisos, Segurança, Moderação e Conta → " + nomes.join(", "));
const outros = await p.locator(".eq-lista-sec ~ .eq-item .l1 strong").allTextContents();
ok(outros.includes("Negócios") && outros.includes("Comercial") && !outros.includes("Segurança"), "\"Outros canais\": " + outros.join(", "));
await p.screenshot({ path: "saida/eqc-lista-cel.png" });
await p.locator(".eq-item", { hasText: "Segurança" }).tap(); await p.waitForTimeout(1200);
await p.locator(".eq-caixa textarea").fill(`Golpe novo do Pix adiantado, alguém pega? ${prot(golpe.id)}`);
await p.dispatchEvent(".eq-caixa textarea", "input");
await p.locator(".eq-compor .eq-principal").tap(); await p.waitForTimeout(1800);
const msgs = (await db.collection("equipe_canais/seguranca/mensagens").get()).docs.map((d) => d.data());
const resumo = (await db.doc("equipe_canais/seguranca").get()).data();
ok(msgs.length === 1 && msgs[0].autorId === U.dani && resumo?.ultimoAutor === U.dani, "mensagem gravada no canal Segurança (com o resumo do canal)");
await p.waitForSelector(".eq-chamado", { timeout: 8000 }).catch(() => {});
ok((await p.locator(".eq-chamado").first().innerText().catch(() => "")).includes("Pix adiantado"), "#PROTOCOLO vira cartão do chamado (assunto, prioridade, prazo)");
await p.screenshot({ path: "saida/eqc-canal-cel.png" });
await p.locator(".eq-voltar").tap(); await p.waitForTimeout(300);
await p.locator(".eq-item", { hasText: "Avisos" }).tap(); await p.waitForTimeout(800);
ok(await p.locator(".eq-bloqueio").isVisible() && (await p.locator(".eq-bloqueio").innerText()).includes("Só os donos") && !(await p.locator(".eq-rodape").isVisible()), "Avisos: só os donos escrevem (sem campo para a moderação)");
await p.locator(".eq-voltar").tap(); await p.waitForTimeout(300);
await p.locator(".eq-item", { hasText: "Negócios" }).tap(); await p.waitForTimeout(800);
ok((await p.locator(".eq-bloqueio").innerText()).includes("Entrar"), "canal em que não está: botão Entrar no canal");
await p.locator(".eq-bloqueio button").tap(); await p.waitForTimeout(1200);
let pref = (await db.doc(`usuarios/${U.dani}`).get()).data().equipeCanais || {};
ok((pref.entrou || []).includes("negocios") && await p.locator(".eq-rodape").isVisible(), "entrou em Negócios (fica na conta) e o campo aparece");
await p.locator(".eq-topo [aria-label='Mais opções']").tap(); await p.waitForTimeout(300);
await p.locator(".eq-menu-item", { hasText: "Silenciar canal" }).tap(); await p.waitForTimeout(1200);
pref = (await db.doc(`usuarios/${U.dani}`).get()).data().equipeCanais || {};
ok((pref.silenciados || []).includes("negocios"), "silenciar canal (só avisa com menção)");
// Situação: Em pausa
await p.locator(".eq-voltar").tap(); await p.waitForTimeout(300);
await p.locator(".eq-status").tap(); await p.waitForTimeout(300);
await p.screenshot({ path: "saida/eqc-status-cel.png" });
await p.locator(".eq-menu-item", { hasText: "Em pausa" }).tap(); await p.waitForTimeout(1500);
ok((await db.doc(`equipe_presenca/${U.dani}`).get()).data()?.status === "pausa" && (await p.locator(".eq-status").innerText()).includes("Em pausa"), "situação \"Em pausa\" gravada na presença");
// Tocar no cartão abre o chamado no Suporte
await p.locator(".eq-item", { hasText: "Segurança" }).tap(); await p.waitForTimeout(1000);
await p.locator(".eq-chamado").first().tap();
await p.waitForSelector(".hf-confirma-fundo button, .ad-modal .ad-sup-notas", { timeout: 10000 }).catch(() => {});
if (await p.locator(".hf-confirma-fundo button", { hasText: "Continuar" }).count()) await p.locator(".hf-confirma-fundo button", { hasText: "Continuar" }).tap();
await p.waitForSelector(".ad-modal .ad-sup-notas", { timeout: 10000 }).catch(() => {});
ok((await p.locator(".ad-modal h3").first().innerText().catch(() => "")).includes("Pix adiantado"), "tocar no cartão abre o chamado no Suporte");
ok(!erros.length, "sem erro na página " + erros.join(" | "));
await M.browser.close();

// ---------- 2) Dono (computador): não lida, escreve em Avisos, vê a pausa do Daniel, transfere e encerra o turno ----------
const D = await navegador({ mobile: false });
const pa = await entrar(D.ctx, "admin", "admin.html#equipe");
const errosA = []; pa.on("pageerror", (e) => errosA.push(e.message));
await pa.waitForSelector(".eq-chat", { timeout: 30000 }); await pa.waitForTimeout(2000);
await pa.locator(".eq-modos [data-modo=equipe]").click(); await pa.waitForTimeout(400);
ok(await pa.locator(".eq-item.nao-lida", { hasText: "Segurança" }).count() === 1, "dono: Segurança marcado como não lido");
ok(Number((await pa.locator(".eq-modos [data-modo=equipe] .eq-modo-n").innerText().catch(() => "0")) || 0) >= 1, "número de não lidas na aba Canais");
await pa.locator(".eq-item", { hasText: "Avisos" }).click(); await pa.waitForTimeout(800);
ok(await pa.locator(".eq-rodape").isVisible(), "dono escreve em Avisos");
await pa.locator(".eq-caixa textarea").fill("Reunião geral sexta às 10h");
await pa.dispatchEvent(".eq-caixa textarea", "input");
await pa.locator(".eq-compor .eq-principal").click(); await pa.waitForTimeout(1500);
ok((await db.collection("equipe_canais/avisos/mensagens").get()).size === 1, "aviso gravado em Avisos");
await pa.locator(".eq-modos [data-modo=individual]").click(); await pa.waitForTimeout(400);
ok(await pa.locator(".eq-item", { hasText: "Daniel" }).locator(".ad-ponto.pausa").count() === 1, "Daniel aparece \"Em pausa\" (bolinha amarela)");
await pa.screenshot({ path: "saida/eqc-pc.png" });
// Transferir um chamado avisa o canal do novo setor
await pa.goto(BASE + "admin.html#suporte"); await pa.waitForSelector(".ad-sup-proximo", { timeout: 30000 }); await pa.waitForTimeout(1000);
ok((await pa.locator(".ad-sup-disp").innerText()).includes("disponíve"), "Suporte: quantas pessoas estão disponíveis agora → " + (await pa.locator(".ad-sup-disp").innerText()));
await pa.locator(".ad-item", { hasText: "Pix adiantado" }).locator("strong").first().click(); await continuar(pa); // o Daniel abriu este chamado agora há pouco
await pa.waitForSelector(".ad-modal .ad-sup-fila-acoes", { timeout: 10000 });
await pa.locator(".ad-sup-fila-acoes .ad-bt", { hasText: "Transferir" }).click(); await pa.waitForTimeout(300);
await pa.locator(".ad-modal").last().locator("select").first().selectOption("pagamento");
await pa.locator(".ad-modal").last().locator("select").nth(1).selectOption("alta");
await pa.locator(".ad-modal").last().locator("button[type=submit]").click(); await pa.waitForTimeout(2000);
const pg = (await db.collection("equipe_canais/pagamentos/mensagens").get()).docs.map((d) => d.data().texto);
ok(pg.some((t) => t.includes("transferiu") && t.includes(prot(golpe.id))), "transferir avisa o canal Pagamentos com o cartão: " + pg.join(" | "));
// Enviar um chamado para alguém da equipe (cartão na conversa individual)
await pa.locator(".ad-item", { hasText: "Plano não ativou" }).locator("strong").first().click(); await continuar(pa);
await pa.waitForSelector(".ad-modal .ad-sup-fila-acoes", { timeout: 10000 });
await pa.locator(".ad-sup-fila-acoes .ad-bt", { hasText: "Enviar para a equipe" }).click(); await pa.waitForTimeout(300);
const par = [U.admin, U.dani].sort().join("_");
await pa.locator(".ad-modal").last().locator("select").selectOption(par);
await pa.locator(".ad-modal").last().locator("textarea").fill("Pode olhar este?");
await pa.locator(".ad-modal").last().locator("button[type=submit]").click(); await pa.waitForTimeout(1500);
const dm = (await db.collection(`equipe_dm/${par}/mensagens`).get()).docs.map((d) => d.data().texto);
ok(dm.some((t) => t.includes("Pode olhar este?") && t.includes(prot(comigo.id))), "Enviar para a equipe: chamado na conversa com o Daniel");
await pa.locator(".ad-modal .ad-bt", { hasText: /^Sair$/ }).click(); await pa.waitForTimeout(300);
await pa.goto(BASE + "admin.html#equipe"); await pa.waitForSelector(".eq-chat", { timeout: 30000 }); await pa.waitForTimeout(1500);
// Encerrar o turno: devolve o chamado e avisa no Geral
await pa.locator(".eq-status").click(); await pa.waitForTimeout(300);
await pa.locator(".eq-menu-item", { hasText: "Encerrar meu turno" }).click(); await pa.waitForTimeout(400);
ok((await pa.locator(".ad-modal").last().innerText()).includes("1 chamado"), "encerrar turno: mostra o que está com você");
await pa.screenshot({ path: "saida/eqc-turno.png" });
await pa.locator(".ad-modal").last().locator("button[type=submit]").click(); await pa.waitForTimeout(2500);
ok(!(await comigo.get()).data().responsavel, "chamado devolvido para a fila");
const geral = (await db.collection("equipe_chat").orderBy("em", "desc").limit(3).get()).docs.map((d) => d.data().texto);
ok(geral.some((t) => t.includes("Encerrei meu turno") && t.includes(prot(comigo.id))), "resumo do turno no Geral: " + geral[0]);
ok((await db.doc(`equipe_presenca/${U.admin}`).get()).data()?.status === "fora" && (await pa.locator(".eq-status").innerText()).includes("Fora"), "fica \"Fora do turno\"");
ok(!errosA.length, "painel sem erro " + errosA.join(" | "));
await D.browser.close();

await golpe.delete(); await comigo.delete();
for (const uid of [U.admin, U.dani]) await db.doc(`equipe_presenca/${uid}`).delete();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
