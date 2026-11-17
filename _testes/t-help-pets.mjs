// Prévia do duo na rosinha (gavetinha), Configurações do Social em lista, cadastro do pet no Social,
// Rede de Help (contatos de fora, Help rápido) e presentes com datas (17/11/2026).
// Uso: node seed.mjs | tail -1 > saida/seed-ids.json && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node dados-perfil.mjs && FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-help-pets.mjs
import { navegador, entrar, BASE } from "./nav.mjs";
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const ids = JSON.parse(readFileSync("saida/seed-ids.json", "utf8"));
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
await db.doc(`usuarios/${ids.ana}`).set({ duoCapa: null, help: null }, { merge: true });
await db.doc(`perfis_publicos/${ids.ana}`).set({ duoCapa: null }, { merge: true });
const erros = [];
const A = await navegador({ mobile: true });
await A.ctx.grantPermissions(["geolocation"]); await A.ctx.setGeolocation({ latitude: -27.5954, longitude: -48.548 });
const p = await entrar(A.ctx, "ana", "usuarios.html");
p.on("pageerror", (e) => erros.push(e.message));

// 1) gavetinha do duo
await p.waitForSelector("#meuPerfil .pf-rosa", { timeout: 25000 }); await p.waitForTimeout(1200);
await p.locator("#meuPerfil .pf-rosa").tap();
await p.waitForSelector(".dp.aberta", { timeout: 8000 }).catch(() => {});
ok(await p.locator(".dp-fundo .dp").count() === 1 && await p.locator(".dc .dc-hero").count() === 0, "rosinha abre a gavetinha (não a gaveta grande)");
await p.waitForTimeout(1200);
const g = await p.evaluate(() => { const d = document.querySelector(".dp").getBoundingClientRect(), c = document.querySelector("#meuPerfil .pf-capa")?.getBoundingClientRect(), av = document.querySelector("#meuPerfil .pf-avatar-wrap").getBoundingClientRect(); return { d: { l: d.left, t: d.top, r: d.right, b: d.bottom }, capaTop: c?.top, avR: av.right, vw: innerWidth }; });
ok(g.d.r <= g.vw && g.d.l >= g.avR - 30 && Math.abs(g.d.t - (g.capaTop ?? g.d.t)) < 40, `gavetinha ao lado da foto, sobre a capa (${JSON.stringify(g.d)})`);
ok((await p.locator(".dp-nome").textContent()).includes("Bruno") && (await p.locator(".dp-fio").textContent()).includes("Juntos há"), "nome do duo e Juntos há");
await p.screenshot({ path: "saida/duo-gavetinha.png" });
// toque fora: fecha e NÃO cai na página
const url0 = p.url();
await p.mouse.click(30, 700); await p.waitForTimeout(500);
ok(await p.locator(".dp-fundo").count() === 0 && p.url() === url0 && await p.locator(".foto-grande, .folha.aberta").count() === 0, "toque fora fecha sem abrir nada embaixo");
// 2 toques rápidos na rosinha não abrem outra coisa
await p.locator("#meuPerfil .pf-rosa").tap(); await p.locator("#meuPerfil .pf-rosa").tap({ force: true }).catch(() => {}); await p.waitForTimeout(700);
ok(await p.locator(".dp-fundo").count() <= 1 && p.url() === url0 && await p.locator(".foto-grande").count() === 0, "toque duplo na rosinha não leva a outro lugar");
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
await p.locator("#meuPerfil .pf-rosa").tap(); await p.waitForSelector(".dp.aberta");
await p.locator(".dp-fio").tap(); await p.waitForTimeout(900);
ok(await p.locator(".dc .dc-hero").count() === 1, "seta da gavetinha abre o cartão completo");
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
await p.locator("#meuPerfil .pf-rosa").tap(); await p.waitForSelector(".dp.aberta");
await p.locator(".dp-av").tap();
await p.waitForSelector("#folhaPerfil.aberta", { timeout: 10000 }).catch(() => {});
ok((await p.locator("#ppCabecalho .pf-nome").textContent()).includes("Bruno"), "Ver perfil abre o perfil do duo");

// 2) Configurações do Social em lista
await p.goto(BASE + "social.html?aba=conexoes"); await p.waitForSelector("#btnConfig", { timeout: 25000 }); await p.waitForTimeout(1500);
await p.locator("#btnConfig").tap(); await p.waitForTimeout(500);
ok(await p.locator(".folha.aberta .cfg-row").count() >= 6 && await p.locator(".folha.aberta .dm-grade").count() === 0, "configurações em lista (sem os modelos grandes no meio)");
await p.screenshot({ path: "saida/social-config.png" });
await p.locator("#cfgPrivacidade").tap(); await p.waitForTimeout(300);
ok(await p.locator(".folha-fundo.empilhada .cfg-op").count() === 4 && await p.locator(".folha-fundo.empilhada .cfg-op.on").count() === 1, "privacidade abre as 4 opções curtas com a atual marcada");
await p.locator(".folha-fundo.empilhada [data-fechar]").tap(); await p.waitForTimeout(300);
await p.locator("#duoModos").tap(); await p.waitForSelector("#dmGrade .dm-op");
ok(await p.locator("#dmGrade .dm-op").count() === 4 && await p.locator("#dmCliqueIn").count() === 1, "rosinha no perfil: os 4 modelos numa folha própria");
await p.locator(".folha-fundo.empilhada [data-fechar]").tap(); await p.waitForTimeout(300);
await p.locator(".folha.aberta [data-fechar]").first().tap(); await p.waitForTimeout(300);

// 3) cuidado: Help + pets
ok(await p.locator("#cdSos .hlp-pedir").count() === 1 && await p.locator("#cdPets").count() === 1 && await p.locator("#cdPresentes").count() === 1, "Help + Pets + Presentes no Social");
await p.locator("#cdPets").tap(); await p.waitForTimeout(400);
await p.locator("#petsNovo").tap(); await p.waitForSelector(".pc-fundo #pcNome");
await p.locator("#pcNome").fill("Thor"); await p.locator("#pcIdade").fill("3 anos");
await p.locator('.pc-esp[data-especie="cao"]').tap(); await p.locator('#pcSexo [data-v="m"]').tap(); await p.locator('#pcPorte [data-v="M"]').tap();
await p.locator(".pc-sug button").nth(1).tap(); await p.locator('.pc-cor[data-cor="caramelo"]').tap();
await p.screenshot({ path: "saida/pet-cadastro.png" });
await p.locator("#pcSalvar").tap(); await p.waitForTimeout(1500);
const pets = (await db.collection("pets").where("donoId", "==", ids.ana).get()).docs.map((d) => d.data());
const thor = pets.find((x) => x.nome === "Thor");
ok(thor && thor.idade === "3 anos" && thor.raca === "Shih-tzu" && thor.cores.includes("caramelo") && thor.porte === "M", "pet gravado com idade, raça, cor e porte");
ok((await p.locator("#cdPets small").textContent()).includes("com RG"), "Social mostra o pet");
await p.locator("#cdPets").tap(); await p.waitForTimeout(400);
ok(await p.locator('.pet-card').count() >= 1 && (await p.locator(".pet-card .pet-rg").first().textContent()).startsWith("HF-PET-"), "lista dos pets com o RG");
await p.locator(".folha.aberta [data-fechar]").first().tap(); await p.waitForTimeout(300);

// 4) Rede de Help
await p.locator("#cdHelpRede").tap(); await p.waitForSelector(".hp-fundo #hpNovoContato");
ok(await p.locator(".hp-fundo select").count() === 0, "Rede de Help sem listas do celular");
ok((await p.locator(".hp-anel b").textContent()).includes("/4"), "situação da rede com o que falta");
ok(await p.locator(".hp-l.sel").count() >= 2, "Social na lista da rede");
await p.locator(".hp-l.sel").first().tap();
await p.locator("#hpNovoContato").tap(); await p.locator("#hpNome").fill("Mãe"); await p.locator('.hp-novo .hp-chips button', { hasText: "Mãe" }).tap(); await p.locator("#hpTel").fill("48999990000"); await p.locator("#hpAdd").tap();
ok((await p.locator('.hp-l[data-contato="0"]').textContent()).includes("(48) 99999-0000") && (await p.locator('.hp-l[data-contato="0"]').textContent()).includes("Mãe ·"), "contato de fora com parentesco e telefone formatado");
await p.locator('#hpSangue [data-v="O+"]').tap(); await p.locator("#hpAlergias").fill("dipirona");
await p.locator('#hpLigar [data-v="190"]').click(); await p.locator("#hpMsg").fill("Tenho asma.");
ok((await p.locator("#hpPrevia").textContent()).includes("maps.google.com") && (await p.locator("#hpPrevia").textContent()).includes("Tenho asma"), "prévia da mensagem com mapa e recado");
ok((await p.locator("#hpPrevia").textContent()).includes("Tipo sanguíneo O+"), "ficha de emergência entra na mensagem");
await p.screenshot({ path: "saida/help-rede.png" });
await p.locator("#hpSalvar").tap(); await p.waitForTimeout(1200);
const conta = (await db.doc(`usuarios/${ids.ana}`).get()).data();
ok(conta.help?.contatos?.[0]?.tel === "48999990000" && conta.help.ligar === "190" && Array.isArray(conta.help.social) && conta.help.msg === "Tenho asma." && conta.help.contatos[0].rel === "Mãe" && conta.help.ficha?.sangue === "O+" && conta.help.ficha?.alergias === "dipirona", "rede salva na conta (contatos, ligar, social escolhido, recado)");
ok((await p.locator("#cdSos small").textContent()).includes("1 contato"), "resumo da rede no Social");

// 5) Help rápido
await p.goto(BASE + "alertas.html?sos=rapido"); await p.waitForSelector(".al-rapido", { timeout: 25000 });
ok((await p.locator(".al-rapido-n").textContent()) !== "", "Help rápido: contagem para cancelar");
await p.locator("#alRapidoCancelar").tap(); await p.waitForTimeout(400);
ok(await p.locator(".al-rapido").count() === 0, "cancelar fecha sem enviar");
const antes = (await db.collection("sos").where("uid", "==", ids.ana).get()).size;
await p.goto(BASE + "alertas.html?sos=rapido"); await p.waitForSelector("#alRapidoAgora", { timeout: 25000 });
await p.locator("#alRapidoAgora").tap();
await p.waitForSelector(".hp-fora-b", { timeout: 15000 }).catch(() => {});
const sos = (await db.collection("sos").where("uid", "==", ids.ana).get()).docs.map((d) => d.data());
ok(sos.length === antes + 1 && sos.some((x) => x.tipo === "seguranca" && x.texto === "Tenho asma." && x.avisados.length === conta.help.social.length), "Help rápido grava com o tipo, recado e só o Social escolhido");
const links = await p.locator(".hp-fora-b").evaluateAll((l) => l.map((a) => a.getAttribute("href")));
ok(links.some((h) => h.startsWith("https://wa.me/5548999990000?text=")) && links.some((h) => h.startsWith("sms:")) && links.includes("tel:190"), "depois de enviar: WhatsApp, SMS e ligar 190");
ok(await p.evaluate(() => document.querySelector("#alSos b").textContent) === "HELP", "botão HELP na página");
await p.screenshot({ path: "saida/help-enviado.png" });

// 6) presentes
await p.goto(BASE + "social.html?aba=conexoes"); await p.waitForSelector("#cdPresentes", { timeout: 25000 }); await p.waitForTimeout(1000);
await p.locator("#cdPresentes").tap(); await p.waitForTimeout(1200);
ok(await p.locator(".folha.aberta .pr-p").count() >= 1, "presentes: enviar para alguém do social");
await p.goto(BASE + `presentes.html?para=${ids.bruno}&ocasiao=aniversario`); await p.waitForSelector("#prMensagem", { timeout: 25000 }); await p.waitForTimeout(1500);
ok((await p.locator("#prMensagem").inputValue()).includes("aniversário") && await p.locator('.pr-ocasioes [data-ocasiao="aniversario"][aria-pressed="true"]').count() === 1, "ocasião preenche o recado");

const larg = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
ok(larg, "sem rolagem para o lado");
ok(!erros.length, "sem erros na página " + erros.join(" | "));
await A.browser.close();
