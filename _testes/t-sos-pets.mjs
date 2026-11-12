// SOS e alertas: a Ana pede ajuda (o Bruno é do Social dela; a Fabi está perto), a Fabi aceita, o Bruno vê que já tem
// alguém indo; RG do pet (a Ana cadastra e marca como perdido, a Fabi publica um animal encontrado parecido e a Ana é
// avisada no Mensagens); ocorrência anônima com IMEI, consulta da Fabi e pista anônima automática; faixa no Mural.
// Uso: node seed.mjs && node t-sos-pets.mjs   (precisa das regras do main)
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
let falhas = 0;
const ok = (c, m) => { if (!c) falhas++; console.log(c ? "  ✔" : "  ✘", m); };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const par = [U.ana, U.bruno].sort();
await db.doc(`vinculos/${par[0]}_${par[1]}`).set({ participantes: par, de: U.ana, para: U.bruno, tipoDe: "amigo", tipoPara: "amigo", status: "aceito", criadoEm: Timestamp.now() });
for (const c of ["sos", "pets", "pets_achados", "ocorrencias"]) for (const d of (await db.collection(c).get()).docs) await db.recursiveDelete(d.ref);

async function abrir(quem, lat, lng, pagina) {
  const n = await navegador({ mobile: true });
  await n.ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ body: PNG, contentType: "image/png" }));
  await n.ctx.grantPermissions(["geolocation"]); await n.ctx.setGeolocation({ latitude: lat, longitude: lng });
  await n.ctx.addInitScript(([la, lo]) => { try { localStorage.setItem("hf-perto", JSON.stringify({ lat: la, lng: lo, em: Date.now() })); } catch {} }, [lat, lng]);
  const p = await entrar(n.ctx, quem, pagina);
  return { ...n, p };
}
const A = await abrir("ana", -27.595, -48.548, "alertas.html");
const pa = A.p;
await pa.waitForSelector("#alSos", { timeout: 20000 });
ok(await pa.locator("#alEmerg .al-tel").count() >= 3, "telefones de emergência à mostra");
await pa.click("#alSos");
await pa.waitForSelector('.al-tipo[data-tipo="saude"]');
await pa.waitForFunction(() => /1 pessoa recebe/.test(document.querySelector(".ent-folha")?.textContent || ""), null, { timeout: 10000 });
ok(true, "o Social da Ana (Bruno) será avisado");
await pa.click('.al-tipo[data-tipo="saude"]'); await pa.fill("#alSosTexto", "Tontura na praça");
await pa.click('[data-perto="agora"]'); // este teste: quem está perto avisado na hora (o SOS em etapas está em t-sos-etapas.mjs)
await pa.click("#alSosEnviar"); await pa.waitForTimeout(3000);
const sos = (await db.collection("sos").get()).docs[0];
ok(sos && sos.data().status === "aberto" && sos.data().avisados.includes(U.bruno) && sos.data().publico === true, "SOS criado (aberto, Social e área)");
const msgB = (await db.collection(`conversas/${U.conv}/mensagens`).get()).docs.map((d) => d.data()).find((m) => m.cartao?.tipo === "sos");
ok(!!msgB, "cartão SOS no Mensagens do Bruno");
await pa.screenshot({ path: "saida/sos-meu.png" });

// Fabi, perto, vê e aceita
const F = await abrir("fabi", -27.597, -48.546, "alertas.html?aba=sos");
const pf = F.p;
await pf.waitForSelector(`[data-sos="${sos.id}"]`, { timeout: 20000 });
ok(true, "Fabi (perto) vê o pedido de ajuda");
await pf.click(`[data-sos="${sos.id}"]`); await pf.waitForSelector("#alVouAjudar", { timeout: 10000 });
await pf.click("#alVouAjudar"); await pf.waitForTimeout(2500);
ok((await db.doc(`sos/${sos.id}`).get()).data().ajudanteId === U.fabi, "Fabi aceitou ajudar");
await pa.waitForFunction(() => /já está ajudando|está ajudando/.test(document.querySelector("#alSosEstado")?.textContent || ""), null, { timeout: 10000 }).catch(() => {});
ok(/ajudando/.test(await pa.textContent("#alSosEstado")), "Ana vê quem está indo: " + await pa.textContent("#alSosEstado"));

// Bruno (Social) vê que já tem alguém
const B = await abrir("bruno", -27.6, -48.55, `alertas.html?sos=${sos.id}`);
const pb = B.p;
await pb.waitForSelector("#alSosEstado", { timeout: 20000 });
await pb.waitForFunction(() => /ajudando/.test(document.querySelector("#alSosEstado")?.textContent || ""), null, { timeout: 10000 }).catch(() => {});
ok(/Fabi.*ajudando/.test(await pb.textContent("#alSosEstado")) && await pb.locator("#alVouAjudar").count() === 0, "Bruno vê que a Fabi já está ajudando (sem botão Vou ajudar)");
await pb.goto(BASE + `mensagens.html?conversa=${U.conv}`);
await pb.waitForSelector(".sos-msg", { timeout: 20000 }); await pb.waitForTimeout(1500);
ok(/ajudando/.test(await pb.textContent(".sos-msg")), "cartão SOS no chat mostra quem está ajudando");
await pb.screenshot({ path: "saida/sos-chat.png" });
await pa.click("text=Já estou bem (resolvido)"); await pa.waitForTimeout(1500);
ok((await db.doc(`sos/${sos.id}`).get()).data().status === "resolvido", "Ana encerrou: resolvido");

// ---------- RG do pet ----------
await pa.goto(BASE + "alertas.html?aba=pets"); await pa.waitForSelector("text=Cadastrar meu pet (RG)", { timeout: 15000 });
await pa.click("text=Cadastrar meu pet (RG)");
await pa.fill("#alPetNome", "Pipoca");
await pa.click('.ent-folha [data-cor="caramelo"]'); await pa.click('.ent-folha [data-cor="branco"]');
await pa.selectOption("#alPetPorte", "M"); await pa.selectOption("#alPetSexo", "f");
await pa.fill("#alPetRaca", "SRD"); await pa.fill("#alPetSinais", "Coleira vermelha e mancha na orelha");
await pa.click("#alPetSalvar"); await pa.waitForTimeout(2000);
const pet = (await db.collection("pets").where("donoId", "==", U.ana).get()).docs[0];
ok(pet?.data().nome === "Pipoca" && pet.data().cores.length === 2, "RG do pet salvo");
await pa.click(`[data-pet="${pet.id}"]`); await pa.waitForSelector(".al-rg", { timeout: 8000 });
ok(/HF-PET-/.test(await pa.textContent(".al-rg-cab")), "cartão do RG com o número: " + await pa.textContent(".al-rg-cab"));
await pa.waitForSelector(".al-rg-qr svg", { timeout: 8000 }).catch(() => {});
ok(await pa.locator(".al-rg-qr svg").count() === 1, "QR Code do RG");
await pa.screenshot({ path: "saida/pet-rg.png" });
await pa.click("text=Pipoca sumiu: avisar que está perdido");
await pa.fill("#alPerdidoOnde", "Praça XV"); await pa.click("#alPerdidoOk"); await pa.waitForTimeout(3000);
ok((await db.doc(`pets/${pet.id}`).get()).data().status === "perdido", "Pipoca marcada como perdida");

await pf.goto(BASE + "alertas.html?aba=pets"); await pf.waitForSelector(`[data-pet="${pet.id}"]`, { timeout: 15000 });
ok(true, "Fabi vê a Pipoca em Perdidos perto");
await pf.click("text=Encontrei um animal");
await pf.click('.ent-folha [data-cor="caramelo"]'); await pf.selectOption("#alPetPorte", "M");
await pf.fill("#alPetSinais", "coleira vermelha"); await pf.fill("#alAchouOnde", "Perto da Praça XV");
await pf.click("#alAchouOk"); await pf.waitForTimeout(4000);
ok(/Muito parecido|Parecido/.test(await pf.textContent(".ent-folha")), "possíveis tutores com a semelhança: " + ((await pf.textContent(".ent-folha")).match(/(Muito parecido|Parecido)[^·]*· \d+%/) || [""])[0]);
const convAF = [U.ana, U.fabi].sort().join("_");
await pf.waitForTimeout(1500);
const msgPet = (await db.collection(`conversas/${convAF}/mensagens`).get()).docs.map((d) => d.data()).find((m) => m.cartao?.tipo === "pet");
ok(msgPet?.cartao.petId === pet.id && msgPet.cartao.nota >= 70, "Ana avisada no Mensagens (cartão do pet, nota " + msgPet?.cartao.nota + "%)");
await pf.screenshot({ path: "saida/pet-tutores.png" });

// ---------- roubo anônimo + consulta ----------
await pb.goto(BASE + "alertas.html?aba=roubos"); await pb.waitForSelector("text=Registrar ocorrência", { timeout: 15000 });
await pb.click("text=Registrar ocorrência");
await pb.fill("#alOcId", "35678901234567"); await pb.fill("#alOcDesc", "Levaram meu celular azul no ponto de ônibus");
await pb.click("#alOcOk"); await pb.waitForTimeout(800);
ok(/15\snúmeros/.test(await pb.locator(".toast").textContent().catch(() => "")), "IMEI incompleto é recusado");
await pb.fill("#alOcId", "356789012345678");
await pb.click("#alOcOk"); await pb.waitForTimeout(3000);
const oc = (await db.collection("ocorrencias").get()).docs[0];
ok(oc && oc.data().anonimo === true && oc.data().autorId === "" && !("autorNome" in oc.data()), "ocorrência anônima (sem nome)");
ok((await db.doc(`ocorrencias_autoria/${oc.id}`).get()).data()?.uid === U.bruno, "autoria guardada só para a moderação");
await pf.goto(BASE + "alertas.html?consultar=356789012345678"); await pf.waitForSelector(".al-estado", { timeout: 15000 });
ok(/Atenção/.test(await pf.textContent(".al-estado")), "consulta do IMEI: " + await pf.textContent(".al-estado"));
await pf.waitForTimeout(2000);
const pistas = (await db.collection(`ocorrencias/${oc.id}/pistas`).get()).docs.map((d) => d.data());
ok(pistas.length === 1 && pistas[0].anonimo && !pistas[0].uid, "pista anônima automática para quem registrou");
await pb.goto(BASE + `alertas.html?ocorrencia=${oc.id}`); await pb.waitForSelector("text=Pistas recebidas", { timeout: 15000 }); await pb.waitForTimeout(1500);
ok(/Pista anônima/.test(await pb.textContent(".ent-folha")), "Bruno vê a pista anônima");

// ---------- faixa no Mural ----------
await pf.goto(BASE + "mural.html"); await pf.waitForSelector("#muAlertas", { timeout: 15000 }); await pf.waitForTimeout(4000);
ok((await pf.textContent("#muAlertas .pets b")) !== "0", "Mural: faixa com pets perdidos perto: " + (await pf.textContent("#muAlertas")).replace(/\s+/g, " "));
// Chat: Anexar tem SOS
await pa.goto(BASE + `mensagens.html?conversa=${U.conv}`); await pa.waitForTimeout(3000);
await pa.click("#btnAnexar"); await pa.waitForTimeout(800);
ok(/SOS/.test(await pa.textContent(".ax-grade")), "Anexar do chat tem SOS");

await A.browser.close(); await B.browser.close(); await F.browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
process.exit(falhas ? 1 : 0);
