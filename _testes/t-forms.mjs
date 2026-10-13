// Formulários com o endereço novo: cadastro, editar perfil, endereço (CEP), negócio, anúncio.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
import { navegador, entrar, USUARIOS, BASE } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
initializeApp({ projectId: "demo-hf" });
const db = getFirestore();
const so = (d, ks) => Object.fromEntries(ks.map((k) => [k, d?.[k]]));
const L = ["cidade", "uf", "cidadeIbge"];
const mobile = process.argv[2] !== "pc";
const tag = process.argv[3] || "";
async function ctxNovo() { const { browser, ctx } = await navegador({ mobile }); await ctx.route("https://viacep.com.br/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ cep: "88015-100", logradouro: "Rua Bocaiúva", complemento: "", bairro: "Centro", localidade: "Florianópolis", uf: "SC", ibge: "4205407" }) })); return { browser, ctx }; }
const escolherCidade = async (p, raiz, uf, digitar) => { await p.selectOption(`${raiz} select`, uf); await p.waitForTimeout(400); await p.locator(`${raiz} input[role=combobox]`).fill(digitar); await p.waitForTimeout(200); await p.locator(`${raiz} .hf-end-lista li`).first().click(); };

// 1) cadastro
{
  const { browser, ctx } = await ctxNovo();
  const p = await ctx.newPage(); p.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await p.goto(BASE + "cadastre-se.html");
  await p.waitForSelector("#cadLocal select");
  await p.fill("#nome", "Igor Novo"); await p.fill("#nick", "igornovo" + tag); await p.dispatchEvent("#nick", "input");
  await p.fill("#email", `igor${tag}@teste.com`); await p.fill("#telefone", "48999990000"); await p.fill("#nascimento", "1990-05-01");
  await p.fill("#senha", "teste123"); await p.fill("#confirmar", "teste123");
  await p.check("#aceite");
  await p.waitForTimeout(1200);
  await p.click("#criar"); await p.waitForTimeout(800);
  console.log("cadastro sem cidade ->", (await p.textContent("#avisoCadastro")).trim());
  await escolherCidade(p, "#cadLocal", "PR", "curit");
  await p.screenshot({ path: `saida/cadastro-${mobile ? "cel" : "pc"}.png`, fullPage: true });
  await p.click("#criar");
  await p.waitForTimeout(4000);
  const uid = (await getAuth().getUserByEmail(`igor${tag}@teste.com`).catch(() => null))?.uid;
  console.log("cadastro ->", uid ? JSON.stringify({ conta: so((await db.doc(`usuarios/${uid}`).get()).data(), L), publico: so((await db.doc(`perfis_publicos/${uid}`).get()).data(), L) }) : "(conta não criada) " + (await p.textContent("#avisoCadastro")));
  await browser.close();
}
// 2) editar perfil
{
  const { browser, ctx } = await ctxNovo();
  const p = await entrar(ctx, "ana", "usuarios.html?acao=editar");
  await p.waitForSelector("#edLocal select", { timeout: 20000 }); await p.waitForTimeout(1200);
  console.log("perfil: valor inicial ->", await p.inputValue("#edLocal select"), "/", await p.inputValue("#edLocal input[role=combobox]"));
  await escolherCidade(p, "#edLocal", "SC", "sao jo");
  await p.click("#edSalvar"); await p.waitForTimeout(2500);
  console.log("perfil salvo ->", JSON.stringify(so((await db.doc(`perfis_publicos/${USUARIOS.ana}`).get()).data(), L)));
  await browser.close();
}
// 3) endereço nas configurações (CEP preenche)
{
  const { browser, ctx } = await ctxNovo();
  const p = await entrar(ctx, "bruno", "configuracoes.html");
  await p.waitForSelector("#cfgEndereco", { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.click("#cfgEndereco"); await p.waitForTimeout(1500);
  await p.locator("#endCampos input[autocomplete=postal-code]").fill("");
  await p.locator("#endCampos input[autocomplete=postal-code]").pressSequentially("88015100", { delay: 20 });
  await p.waitForTimeout(1500);
  const vals = await p.evaluate(() => [...document.querySelectorAll("#endCampos input, #endCampos select")].map((i) => i.value));
  console.log("CEP preencheu ->", JSON.stringify(vals));
  await p.locator("#endCampos input[placeholder^='Ex.: 120']").fill("77");
  await p.screenshot({ path: `saida/endereco-${mobile ? "cel" : "pc"}.png` });
  await p.click("#endSalvar"); await p.waitForTimeout(2000);
  const u = (await db.doc(`usuarios/${USUARIOS.bruno}`).get()).data();
  console.log("endereço salvo ->", JSON.stringify(u.endereco && so(u.endereco, ["cep", "uf", "cidade", "cidadeIbge", "bairro", "rua", "numero"])), "| perfil:", JSON.stringify(so((await db.doc(`perfis_publicos/${USUARIOS.bruno}`).get()).data(), L)));
  await browser.close();
}
// 4) negócio e anúncio
{
  const { browser, ctx } = await ctxNovo();
  const p = await entrar(ctx, "bruno", "negocios.html?tipo=servicos");
  await p.waitForSelector("#negLocal select", { timeout: 20000 }); await p.waitForTimeout(1500);
  console.log("negócio: valor inicial ->", await p.inputValue("#negLocal select"), "/", await p.inputValue("#negLocal input[role=combobox]"));
  await p.locator("#negLocal input[autocomplete=address-level3]").fill("Trindade");
  await p.screenshot({ path: `saida/negocio-${mobile ? "cel" : "pc"}.png` });
  await p.click("#negSalvar"); await p.waitForTimeout(2500);
  console.log("negócio salvo ->", JSON.stringify(so((await db.doc(`negocios/${USUARIOS.bruno}_servicos`).get()).data(), [...L, "bairro"])));
  await p.goto(BASE + "negocios.html?tipo=imoveis"); await p.waitForTimeout(3000);
  await p.locator(".neg-anuncio").first().click(); await p.waitForTimeout(1500);
  console.log("anúncio: valor inicial ->", await p.inputValue(".neg-local select >> nth=-1"), "/", await p.locator(".neg-local input[role=combobox]").last().inputValue());
  await p.locator(".neg-local input[autocomplete=address-line1]").last().fill("Rua Lauro Linhares");
  await p.click("#anSalvar"); await p.waitForTimeout(2500);
  console.log("anúncio salvo ->", JSON.stringify(so((await db.doc("anuncios/an1").get()).data(), [...L, "bairro", "rua"])));
  await browser.close();
}
process.exit(0);
