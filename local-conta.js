// =====================================================
// Cidade da conta no padrão novo (estado + cidade do IBGE)
// Roda uma vez por sessão, logo depois de entrar (firebase.js):
// 1) conta antiga com a cidade em texto ("Florianópolis", "Florianópolis/SC", "florianopolis")
//    é convertida sozinha para { cidade, uf, cidadeIbge } na conta, no perfil público e nos
//    negócios/anúncios da pessoa;
// 2) quem está sem cidade (ou com uma que não deu para reconhecer) vê uma janela pedindo
//    para completar (com "Agora não", que volta a perguntar em 3 dias).
// =====================================================
import { doc, setDoc, getDocs, query, collection, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { resolverCidade, camposEndereco, gravarComLocal, NOVOS, textoCidade, servidorComRegrasAntigas } from "./endereco.js?v=1";

const ADIAR_DIAS = 3;
const chaveAdiar = (uid) => "hf-local-adiado-" + uid;

// Marca no aparelho que o perfil público já recebeu estado + código IBGE (não regrava toda vez).
const chavePublico = (uid) => "hf-local-publico-" + uid;
async function gravarLocal(db, uid, local) {
  const { cidade, uf, cidadeIbge } = local;
  await setDoc(doc(db, "usuarios", uid), { cidade, uf, cidadeIbge }, { merge: true });
  const completo = await gravarComLocal((d) => setDoc(doc(db, "perfis_publicos", uid), d, { merge: true }), { uid, cidade, uf, cidadeIbge }, NOVOS.perfil);
  // Com as regras antigas no servidor: tenta de novo só no dia seguinte (sem gravar a cada visita).
  try { localStorage.setItem(chavePublico(uid), completo ? String(cidadeIbge) : "antigas:" + Date.now()); } catch {}
  return completo;
}

// Negócios e anúncios da pessoa com a cidade antiga em texto.
async function converterConteudo(db, uid) {
  for (const [col, campos] of [["negocios", NOVOS.negocio], ["anuncios", NOVOS.anuncio]]) {
    const s = await getDocs(query(collection(db, col), where("donoId", "==", uid))).catch(() => null);
    for (const d of s?.docs || []) {
      const x = d.data();
      if ((x.cidadeIbge && x.uf) || !x.cidade) continue;
      const r = await resolverCidade(x.cidade, x.uf).catch(() => null);
      if (!r) continue;
      // Com as regras antigas só daria para regravar o nome: se ele já está certo, não grava nada.
      if (r.cidade === x.cidade && servidorComRegrasAntigas()) continue;
      // Sem mexer em atualizadoEm (a vitrine ordena por ele: a conversão não "sobe" o anúncio).
      await gravarComLocal((dados) => setDoc(d.ref, dados, { merge: true }), { cidade: r.cidade, uf: r.uf, cidadeIbge: r.cidadeIbge }, campos)
        .catch((e) => console.warn("[Local] Não converteu", col, d.id, e?.code || e?.message));
    }
  }
}

export async function conferirLocal(db, usuario, dados) {
  const uid = usuario.uid;
  if (dados.cidadeIbge && dados.uf) {
    // Conta já no padrão novo. Se o perfil público ainda ficou só com o nome da cidade
    // (regras antigas no servidor na época), completa agora, uma vez.
    let feito = null; try { feito = localStorage.getItem(chavePublico(uid)); } catch {}
    if (feito === String(dados.cidadeIbge)) return;
    if (String(feito || "").startsWith("antigas:") && Date.now() - Number(feito.slice(8)) < 864e5) return;
    try { if (await gravarLocal(db, uid, { cidade: dados.cidade, uf: dados.uf, cidadeIbge: dados.cidadeIbge })) await converterConteudo(db, uid); }
    catch (e) { console.warn("[Local] Perfil público não completado:", e?.code || e?.message); }
    return;
  }
  let local = null;
  if (dados.cidade || dados.cidadeNome) local = await resolverCidade(dados.cidade || dados.cidadeNome, dados.uf).catch(() => null);
  if (local) {
    try {
      await gravarLocal(db, uid, local);
      await converterConteudo(db, uid); // negócios e anúncios: pelo menos a cidade fica no nome certo
      console.info("[Local] Cidade convertida:", textoCidade(local));
    } catch (e) { console.warn("[Local] Conversão não salva:", e?.code || e?.message); }
    return;
  }
  // Sem cidade (ou não reconhecida): pede para completar, sem insistir a cada página.
  try { if (Date.now() - Number(localStorage.getItem(chaveAdiar(uid)) || 0) < ADIAR_DIAS * 864e5) return; } catch {}
  if (window.top !== window.self) return; // dentro da gaveta de mensagens não abre janela
  pedirCidade(db, uid, dados);
}

function pedirCidade(db, uid, dados) {
  if (document.getElementById("hfLocalJanela")) return;
  const css = document.createElement("style");
  css.textContent = `
.hf-local-fundo { position: fixed; inset: 0; z-index: 9700; display: grid; place-items: center; padding: 16px; background: rgba(2, 6, 9, .72); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; animation: hfLocalFundo .2s ease-out; }
.hf-local-caixa { width: min(460px, 100%); max-height: calc(100dvh - 32px); overflow: auto; background: var(--panel, #0f161b); color: var(--text, #eaf0f3); border: 1px solid var(--line, #213038); border-radius: 20px; padding: 22px 20px 18px; box-shadow: 0 30px 80px rgba(0,0,0,.55); animation: hfLocalCaixa .22s cubic-bezier(.2,.8,.2,1); }
.hf-local-caixa .ic { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; margin-bottom: 12px; color: #00adee; background: color-mix(in srgb, #00adee 16%, transparent); }
.hf-local-caixa h2 { margin: 0 0 6px; font-size: 19px; }
.hf-local-caixa p { margin: 0 0 16px; color: var(--muted, #8c9ca7); font-size: 14px; line-height: 1.5; }
.hf-local-caixa .campo { display: grid; gap: 6px; }
.hf-local-caixa .campo label { font-size: 13.5px; font-weight: 700; }
.hf-local-caixa .campo input, .hf-local-caixa .campo select { height: 46px; border-radius: 12px; border: 1px solid var(--line, #213038); background: var(--input, #121b21); color: var(--text, #eaf0f3); padding: 0 12px; font: inherit; font-size: 15px; }
.hf-local-caixa .campo input:focus, .hf-local-caixa .campo select:focus { outline: 0; border-color: #00adee; box-shadow: 0 0 0 3px color-mix(in srgb, #00adee 25%, transparent); }
.hf-local-caixa .campo input:disabled { opacity: .55; }
.hf-local-caixa .ajuda { font-size: 12.5px; color: var(--muted, #8c9ca7); }
.hf-local-acoes { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; margin-top: 18px; }
.hf-local-acoes button { min-height: 46px; border-radius: 12px; font: inherit; font-weight: 800; font-size: 15px; cursor: pointer; }
.hf-local-acoes .nao { border: 1px solid var(--line, #213038); background: transparent; color: var(--text, #eaf0f3); }
.hf-local-acoes .sim { border: 0; background: #00adee; color: #001a24; }
.hf-local-acoes .sim:disabled { opacity: .6; cursor: default; }
.hf-local-erro { margin-top: 10px; color: #e5484d; font-size: 13px; min-height: 1em; }
@keyframes hfLocalFundo { from { opacity: 0; } }
@keyframes hfLocalCaixa { from { opacity: 0; transform: translateY(14px) scale(.98); } }
@media (prefers-reduced-motion: reduce) { .hf-local-fundo, .hf-local-caixa { animation: none; } }`;
  const fundo = document.createElement("div"); fundo.className = "hf-local-fundo"; fundo.id = "hfLocalJanela";
  fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-labelledby", "hfLocalTitulo");
  const cx = document.createElement("div"); cx.className = "hf-local-caixa";
  cx.innerHTML = `<div class="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.3-7-11.5A7 7 0 0119 9.5C19 14.7 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg></div>`;
  const h = document.createElement("h2"); h.id = "hfLocalTitulo"; h.textContent = "Em qual cidade você está?";
  const p = document.createElement("p");
  p.textContent = dados.cidade ? `Não reconhecemos a cidade "${dados.cidade}" do seu cadastro. Escolha na lista para aparecer certinho no seu perfil e nas buscas.` : "Complete seu cadastro: sua cidade aparece no perfil e ajuda a achar quem atende perto de você.";
  const campos = document.createElement("div");
  const erro = document.createElement("div"); erro.className = "hf-local-erro"; erro.setAttribute("role", "alert");
  const acoes = document.createElement("div"); acoes.className = "hf-local-acoes";
  const nao = document.createElement("button"); nao.type = "button"; nao.className = "nao"; nao.textContent = "Agora não";
  const sim = document.createElement("button"); sim.type = "button"; sim.className = "sim"; sim.textContent = "Salvar cidade";
  acoes.append(nao, sim);
  cx.append(h, p, campos, erro, acoes); fundo.appendChild(cx);
  document.head.appendChild(css);
  const montar = () => document.body.appendChild(fundo);
  if (document.body) montar(); else document.addEventListener("DOMContentLoaded", montar);
  const local = camposEndereco(campos, { campos: ["uf", "cidade"], valor: { cidade: dados.cidade || "", uf: dados.uf || "" } });
  setTimeout(() => campos.querySelector("select")?.focus(), 60);
  const fechar = () => { fundo.remove(); css.remove(); document.removeEventListener("keydown", tecla); };
  const adiar = () => { try { localStorage.setItem(chaveAdiar(uid), String(Date.now())); } catch {} fechar(); };
  const tecla = (e) => { if (e.key === "Escape") adiar(); };
  document.addEventListener("keydown", tecla);
  nao.addEventListener("click", adiar);
  sim.addEventListener("click", async () => {
    const msg = local.validar();
    if (msg) { erro.textContent = msg; return; }
    erro.textContent = "";
    sim.disabled = true; sim.textContent = "Salvando...";
    try {
      await gravarLocal(db, uid, local.ler());
      try { localStorage.removeItem(chaveAdiar(uid)); } catch {}
      fechar();
    } catch (e) {
      console.error(e);
      erro.textContent = "Não foi possível salvar agora. Confira sua internet e tente de novo.";
      sim.disabled = false; sim.textContent = "Salvar cidade";
    }
  });
}
