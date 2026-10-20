// Editor da foto de capa: a moldura tem o formato da capa do perfil nesta tela, com a foto de perfil
// e o nome marcados onde ficam; a capa salva sai nesse formato.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { navegador, entrar } from "./nav.mjs";
let falhas = 0;
const ok = (c, t) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", t); };
const B = await navegador({ mobile: true });
const p = await entrar(B.ctx, "ana", "usuarios.html");
await p.waitForSelector(".pf2 .pf-capa", { timeout: 20000 }); await p.waitForTimeout(1200);
const capa = await p.locator(".pf2 .pf-capa").first().boundingBox();
await p.setInputFiles("#edArquivoCapa", "saida/capa-teste.jpg");
await p.waitForSelector(".hfe-moldura", { timeout: 10000 }); await p.waitForTimeout(800);
const m = await p.locator(".hfe-moldura").boundingBox();
const prop = m.width / m.height, real = capa.width / capa.height;
ok(Math.abs(prop - real) < 0.05, `moldura no formato da capa do perfil (${prop.toFixed(2)} × ${real.toFixed(2)})`);
ok(await p.locator(".hfe-marca.circulo").count() === 1 && await p.locator(".hfe-marca.texto").count() === 1, "marcas: Sua foto e Nome e bio");
const c = await p.locator(".hfe-marca.circulo").boundingBox();
ok(c.x - m.x < m.width * 0.25 && c.y + c.height > m.y + m.height * 0.6, "a foto de perfil marcada embaixo à esquerda, como no perfil");
await p.screenshot({ path: "saida/editor-capa.png" });
await B.browser.close();
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
