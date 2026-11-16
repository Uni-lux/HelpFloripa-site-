// Social completo (16/11/2026): "+" e Configurar abrem gavetas na própria página, cartão do duo refeito (frase, data em que se
// conheceram, tempo juntos e retrato), pets ao lado do dono, Cuidado e proteção (SOS, pets, presentes), pedido recebido com
// Aceitar e visitante vendo a memória do duo.
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node dados-perfil.mjs && node t-social-completo.mjs
import { navegador, entrar } from "./nav.mjs";
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const par = (a, b) => [a, b].sort().join("_");
// pet do Bruno (visível) e um da Ana escondido das buscas; pedido da Fabi para a Ana
await db.doc("pets/pet_bruno").set({ donoId: ids.bruno, donoNome: "Bruno", nome: "Thor", especie: "cao", status: "casa", visivel: true, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
await db.doc("pets/pet_ana").set({ donoId: ids.ana, donoNome: "Ana", nome: "Mia", especie: "gato", status: "casa", visivel: false, criadoEm: Timestamp.now(), atualizadoEm: Timestamp.now() });
const pf = [ids.ana, ids.fabi].sort();
await db.doc(`vinculos/${pf.join("_")}`).set({ participantes: pf, de: ids.fabi, para: ids.ana, tipoDe: "primo", tipoPara: "primo", status: "pendente", criadoEm: Timestamp.now() });
await db.doc(`vinculos/${par(ids.ana, ids.gui)}`).delete().catch(() => {});
await db.doc(`vinculos/${par(ids.ana, ids.bruno)}`).update({ conheceram: "", frase: "", retrato: false }).catch(() => {});
await db.doc(`vinculos_retrato/${par(ids.ana, ids.bruno)}`).delete().catch(() => {});

const erros = [];
const A = await navegador({ mobile: true });
const p = await entrar(A.ctx, "ana", "social.html");
p.on("pageerror", (e) => erros.push(e.message));
await p.waitForSelector("#duo:not([hidden]) .ak-linha", { timeout: 25000 }); await p.waitForTimeout(2500);
await p.screenshot({ path: "saida/social-completo.png", fullPage: true });

const topo = await p.evaluate(() => { const r = document.querySelector("#btnAdd").getBoundingClientRect(); return { dentro: r.right <= innerWidth && r.left >= 0, tag: document.querySelector("#btnAdd").tagName, sw: document.documentElement.scrollWidth, vw: innerWidth }; });
ok(topo.dentro && topo.tag === "BUTTON", "\"+\" do topo dentro da tela e é um botão (não sai da página)");
ok(topo.sw <= topo.vw, "sem passar da largura");
ok(!(await p.locator("text=Conectados pelo fio vermelho").count()), "sem a frase \"Conectados pelo fio vermelho\"");
ok(await p.locator("#duo .ak-tx small").count() === 1, "linha do duo com uma frase");
ok(await p.locator("#rede .pessoa .pet-bol").count() >= 1 && await p.locator("#hsAvw .pet-bol").count() === 1, "pets ao lado das pessoas (Thor do Bruno na lista, Mia da Ana no topo)");
ok(await p.locator("#hsAvw .pet-bol").count() === 1, "seu pet (mesmo fora das buscas) ao lado da sua foto");
ok(await p.locator("#cuidado .hlp").count() === 1 && await p.locator("#cuidado .cd2").count() === 2, "Cuidado e proteção: Help, Pets e Presentes");
await p.locator("#abaConexoes").click(); await p.waitForTimeout(300);
ok(await p.locator(`#rede .pessoa[data-id="${pf.join("_")}"] .aceitar`).count() === 1, "pedido recebido com Aceitar no cartão (aba Conexões)");
await p.locator("#abaSalao").click(); await p.waitForTimeout(300);

// Configurar abre a gaveta (não rola a página)
const y0 = await p.evaluate(() => scrollY);
await p.locator("#btnConfig").click(); await p.waitForTimeout(600);
ok(await p.locator(".folha.aberta .cfg-row").count() >= 6 && await p.locator(".folha.aberta #cfgPrivacidade").count() === 1, "Configurar abre a lista de ajustes");
ok(await p.locator(".folha.aberta #cfgPresentes").count() === 1 && await p.locator(".folha.aberta #cfgSos").count() === 1 && await p.locator(".folha.aberta #cfgPets").count() === 1, "lista com presentes, Help e pets");
ok(await p.evaluate(() => scrollY) === y0, "a página não rolou");
await p.locator(".folha.aberta").screenshot({ path: "saida/social-config.png" });
await p.locator("#cfgPrivacidade").click(); await p.waitForTimeout(400);
await p.locator(".folha-fundo.empilhada .cfg-op[data-v=amigos]").click(); await p.waitForTimeout(1200);
const vis = (await db.doc(`perfis_publicos/${ids.ana}`).get()).data().socialVisibilidade;
ok(vis === "amigos" && (await p.locator("#cfgPrivacidade .cfg-val").textContent()) === "Amigos", "privacidade salva (" + vis + ") e mostrada na linha");
await p.locator("#cfgPrivacidade").click(); await p.waitForTimeout(400);
await p.locator(".folha-fundo.empilhada .cfg-op[data-v=todos]").click(); await p.waitForTimeout(800);
await p.locator("#duoModos").click(); await p.waitForSelector("#dmGrade .dm-op");
await p.locator("#dmGrade .dm-op[data-estilo=bolinha]").click(); await p.waitForTimeout(1200);
ok(await p.locator("#dmGrade .dm-op.on[data-estilo=bolinha]").count() === 1, "modelo do duo muda na folha");
await p.locator("#dmGrade .dm-op[data-estilo=gaveta]").click(); await p.waitForTimeout(800);
await p.locator(".folha-fundo.empilhada [data-fechar]").click(); await p.waitForTimeout(300);
await p.goBack(); await p.waitForTimeout(600);
ok(await p.locator(".folha.aberta").count() === 0, "voltar do celular fecha a gaveta");

// Memória do duo: data, frase e retrato
await p.locator("#akEditar").click(); await p.waitForTimeout(500);
await p.locator("#memArquivo").setInputFiles("saida/retrato.jpg"); await p.waitForTimeout(1200);
ok(await p.locator("#memRetrato img").count() === 1, "retrato escolhido aparece na prévia");
await p.evaluate(() => { const d = document.querySelector("#memData"); d.value = "2023-02-14"; d.dispatchEvent(new Event("input", { bubbles: true })); });
await p.locator("#memFrase").fill("Desde aquele café na Lagoa.");
await p.locator(".folha.aberta").screenshot({ path: "saida/social-memoria.png" });
await p.locator("#memSalvar").click(); await p.waitForTimeout(2000);
const v = (await db.doc(`vinculos/${par(ids.ana, ids.bruno)}`).get()).data();
const r = await db.doc(`vinculos_retrato/${par(ids.ana, ids.bruno)}`).get();
ok(v.conheceram === "2023-02-14" && v.frase === "Desde aquele café na Lagoa." && v.retrato === true, "memória gravada no vínculo");
ok(r.exists && r.data().foto.startsWith("data:image/jpeg") && r.data().foto.length <= 240000, "retrato gravado (" + (r.data()?.foto.length || 0) + " letras)");
await p.waitForTimeout(800);
await p.locator("#akAbrir").click(); ok(await p.waitForSelector(".dc-hero.com-retrato", { timeout: 8000 }).then(() => true).catch(() => false), "retrato no cartão do duo");
ok((await p.locator(".dc-desde").textContent()).includes("Juntos desde"), "data em que se conheceram + tempo juntos");
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
ok((await p.locator("#duo .ak-tx small").textContent()).includes("Lagoa"), "frase de vocês na linha do duo");
ok(await p.locator("#duo .ak-todo").count() === 0 && (await p.locator("#duo .ak-rot2").textContent()).includes("desde"), "memória completa: sem os lembretes e com o \"desde\"");
await p.locator("#duo").screenshot({ path: "saida/social-duo.png" });

// Adicionar pessoa sem sair da página
await p.locator("#abaConexoes").click(); await p.waitForTimeout(300);
await p.locator("#btnAdd").click(); await p.waitForTimeout(500);
ok(p.url().includes("social.html") && await p.locator(".folha.aberta #addBusca").count() === 1, "\"+\" abre a gaveta Adicionar na própria página");
await p.locator("#addBusca").fill("Gui"); await p.waitForTimeout(1800);
await p.locator("#addRes .linha").first().click(); await p.waitForTimeout(300);
ok(await p.locator('#addTipos button[data-tipo="duo"][disabled]').count() === 1, "duo bloqueado (ela já tem um)");
await p.locator('#addTipos button[data-tipo="amigo"]').click();
await p.locator("#addEnviar").click(); await p.waitForTimeout(1500);
const g = await db.doc(`vinculos/${par(ids.ana, ids.gui)}`).get();
ok(g.exists && g.data().status === "pendente" && g.data().tipoDe === "amigo", "pedido enviado (amigo)");

// Aceitar o pedido da Fabi
await p.locator(`#rede .pessoa[data-id="${pf.join("_")}"] .aceitar`).click(); await p.waitForTimeout(1500);
ok((await db.doc(`vinculos/${pf.join("_")}`).get()).data().status === "aceito", "pedido aceito pelo cartão");
await p.screenshot({ path: "saida/social-completo2.png", fullPage: true });
ok(!erros.length, "sem erro na página " + erros.join(" | "));
await A.browser.close();

// Visitante (Bruno no social da Ana) vê a memória, sem botão de editar
const B = await navegador({ mobile: true });
const q = await entrar(B.ctx, "bruno", `social.html?uid=${ids.ana}`);
await q.waitForSelector("#duo:not([hidden]) .ak-linha", { timeout: 25000 }); await q.waitForTimeout(2500);
ok((await q.locator("#duo .ak-tx small").textContent()).includes("Lagoa"), "visitante vê a frase");
await q.locator("#akAbrir").click(); ok(await q.waitForSelector(".dc-hero.com-retrato", { timeout: 8000 }).then(() => true).catch(() => false), "visitante vê o retrato no cartão do duo"); await q.keyboard.press("Escape"); await q.waitForTimeout(400);
ok(await q.locator("#akEditar, #btnConfig, #secCuidado:not([hidden])").count() === 0, "visitante não tem Editar, Configurar nem Cuidado");
ok(await q.locator("#hsAcoes button[aria-label='Enviar um presente']").count() === 1, "visitante pode mandar um presente");
await q.screenshot({ path: "saida/social-visitante.png", fullPage: true });
await B.browser.close();
await db.doc(`vinculos/${pf.join("_")}`).delete();
await db.doc(`vinculos/${par(ids.ana, ids.gui)}`).delete();
