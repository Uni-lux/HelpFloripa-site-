// Atendimento: escolher dias, salvar, recarregar e conferir (tela e Firestore).
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar, USUARIOS, BASE } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const { browser, ctx } = await navegador({ mobile: true });
const p = await entrar(ctx, "bruno", "mensagens.html");
const dias = async () => p.evaluate(() => [...document.querySelectorAll("#atendDias button")].map((b, i) => (b.classList.contains("on") ? i : null)).filter((x) => x != null));
const abrir = async () => { await p.waitForSelector("#btnConfig", { state: "visible", timeout: 20000 }); await p.waitForFunction(() => document.getElementById("carregandoApp").hidden); await p.tap("#btnConfig"); await p.waitForSelector("#secaoAtend:not([hidden])", { timeout: 10000 }); await p.waitForTimeout(300); };
await abrir();
console.log("antes:", await dias(), "ligado:", await p.isChecked("#atendHorarioLig"));
if (!(await p.isChecked("#atendHorarioLig"))) await p.locator("#atendHorarioLig + span").tap();
await p.locator("#atendDias button").nth(1).tap(); // tira segunda
await p.locator("#atendDias button").nth(6).tap(); // põe sábado
await p.locator("#atendDias button").nth(0).tap(); // põe domingo
console.log("escolhidos:", await dias());
await p.tap("#atendSalvar");
await p.waitForTimeout(1500);
console.log("toast:", await p.locator(".toast").allTextContents());
console.log("firestore:", JSON.stringify((await db.doc(`perfis_publicos/${USUARIOS.bruno}`).get()).data().atendimento));
// fecha e abre de novo na mesma página
await p.locator("#painelConfig [data-fechar-painel]").first().tap(); await p.waitForTimeout(400);
await p.tap("#btnConfig"); await p.waitForTimeout(500);
console.log("reaberto (mesma página):", await dias());
// recarrega a página
await p.reload(); await abrir();
console.log("depois de recarregar:", await dias());
// abre em outra página do site e volta (cache do aparelho)
await p.goto(BASE + "index.html"); await p.waitForTimeout(1500);
await p.goto(BASE + "mensagens.html"); await abrir();
console.log("depois de navegar:", await dias());
await p.locator("#painelConfig [data-fechar-painel]").first().tap(); await p.waitForTimeout(300);
await db.doc(`perfis_publicos/${USUARIOS.bruno}`).set({ atendimento: { horario: { dias: [1, 3], inicio: "10:00", fim: "16:00" } } }, { merge: true });
await p.tap("#btnConfig"); await p.waitForTimeout(1500);
console.log("mudou em outro aparelho:", await dias(), await p.inputValue("#atendInicio"));
await browser.close();
