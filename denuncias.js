// =====================================================
// Denúncias: perfil, publicação, comentário, mensagem ou perfil de negócio.
// denuncias/{tipo}_{item}_{quemDenunciou}: uma denúncia por pessoa em cada item.
// A pessoa denunciada não é avisada. A equipe do Help Floripa analisa pelo
// console do Firebase. As regras conferem que o item é mesmo de quem foi denunciado.
// =====================================================

export const MOTIVOS_DENUNCIA = [
  ["golpe", "Golpe ou fraude", "Pediu pagamento adiantado, cobrou e sumiu, link suspeito"],
  ["falso", "Perfil falso", "Se passa por outra pessoa ou empresa"],
  ["assedio", "Assédio ou ofensa", "Ameaças, xingamentos, perseguição"],
  ["odio", "Discurso de ódio", "Preconceito por raça, religião, gênero, orientação..."],
  ["improprio", "Conteúdo impróprio", "Nudez, violência ou conteúdo chocante"],
  ["spam", "Spam", "Propaganda repetida, mensagens em massa"],
  ["menor", "Menor de idade", "Parece ter menos de 16 anos, ou menor vendendo/anunciando"],
  ["outro", "Outro motivo", "Conte no campo abaixo"]
];
const ROTULO = { perfil: "este perfil", publicacao: "esta publicação", comentario: "este comentário", mensagem: "esta mensagem", negocio: "este negócio" };

let cssPronto = false;
function css() {
  if (cssPronto) return; cssPronto = true;
  const s = document.createElement("style");
  s.textContent = `
  .hf-den-fundo{position:fixed;inset:0;z-index:9650;display:grid;place-items:center;padding:16px;background:rgba(2,6,9,.78);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
  .hf-den{width:min(480px,100%);max-height:92vh;overflow-y:auto;background:var(--panel,#10181d);color:var(--text,#eef3f5);border:1px solid var(--line,#22313a);border-radius:22px;padding:20px;display:grid;gap:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6)}
  .hf-den h3{margin:0;font-size:19px}.hf-den>p{margin:0;font-size:13.5px;color:var(--muted,#8fa0ab);line-height:1.45}
  .hf-den .topo{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
  .hf-den .x{border:0;background:rgba(140,160,171,.15);color:inherit;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:17px;flex:none}
  .hf-den .ops{display:grid;gap:6px}
  .hf-den .op{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;border:1px solid var(--line,#22313a);cursor:pointer;font-size:14px}
  .hf-den .op:has(input:checked){border-color:#ef4444;background:rgba(239,68,68,.1)}
  .hf-den .op input{margin-top:3px;accent-color:#ef4444;flex:none}
  .hf-den .op span{display:grid;gap:1px}.hf-den .op b{font-weight:700}.hf-den .op small{color:var(--muted,#8fa0ab);font-size:12px}
  .hf-den textarea{width:100%;box-sizing:border-box;min-height:70px;resize:vertical;padding:10px 12px;border-radius:12px;border:1px solid var(--line,#22313a);background:var(--panel-2,#162128);color:inherit;font:inherit;font-size:14px}
  .hf-den .bloq{display:flex;gap:10px;align-items:center;font-size:14px;font-weight:600;cursor:pointer}
  .hf-den .bloq input{accent-color:#ef4444;width:18px;height:18px}
  .hf-den .acoes{display:flex;gap:8px}.hf-den .acoes button{flex:1;min-height:44px;border:0;border-radius:12px;font:inherit;font-weight:800;font-size:14px;cursor:pointer}
  .hf-den .env{background:#ef4444;color:#fff}.hf-den .env:disabled{opacity:.5;cursor:default}.hf-den .can{background:rgba(140,160,171,.15);color:inherit}
  .hf-den .ok{display:grid;gap:10px;text-align:center;padding:10px 0}.hf-den .ok .ic{font-size:40px}`;
  document.head.appendChild(s);
}

// fb: { ...firestore, db } · eu: usuário logado
// tipo: perfil | publicacao | comentario | mensagem | negocio
// alvoId: uid de quem é o item · itemId: id do item (perfil: o próprio uid)
// conversaId: só para mensagem · trecho: o texto do item (guardado como prova)
// podeBloquear: mostra "Bloquear também" · aoBloquear(): a página faz o bloqueio
export async function abrirDenuncia({ fb, eu, tipo, alvoId, itemId, conversaId = "", trecho = "", nomeAlvo = "", podeBloquear = true, aoBloquear } = {}) {
  if (!eu || !alvoId || alvoId === eu.uid) return;
  css();
  const id = `${tipo}_${itemId}_${eu.uid}`.replace(/\//g, "-").slice(0, 400);
  const ref = fb.doc(fb.db, "denuncias", id);
  let ja = false;
  try { ja = (await fb.getDoc(ref)).exists(); } catch {}
  const fundo = document.createElement("div"); fundo.className = "hf-den-fundo";
  const caixa = document.createElement("div"); caixa.className = "hf-den"; caixa.setAttribute("role", "dialog"); caixa.setAttribute("aria-modal", "true");
  fundo.appendChild(caixa);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla, true); };
  const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); fechar(); } };
  document.addEventListener("keydown", tecla, true);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  const topo = document.createElement("div"); topo.className = "topo";
  const h = document.createElement("h3"); h.textContent = `Denunciar ${ROTULO[tipo] || ""}`;
  const x = document.createElement("button"); x.type = "button"; x.className = "x"; x.textContent = "✕"; x.setAttribute("aria-label", "Fechar"); x.addEventListener("click", fechar);
  topo.append(h, x);
  caixa.appendChild(topo);
  document.body.appendChild(fundo);

  if (ja) {
    const p = document.createElement("p"); p.textContent = "Você já denunciou isso. Nossa equipe vai analisar. Obrigado por ajudar a manter o Help Floripa seguro.";
    const ok = document.createElement("div"); ok.className = "acoes";
    const b = document.createElement("button"); b.type = "button"; b.className = "can"; b.textContent = "Fechar"; b.addEventListener("click", fechar);
    ok.appendChild(b); caixa.append(p, ok);
    return;
  }

  const intro = document.createElement("p");
  intro.textContent = `${nomeAlvo ? nomeAlvo + " não" : "A pessoa não"} será avisada. Nossa equipe analisa cada denúncia e pode remover o conteúdo ou suspender a conta.`;
  const ops = document.createElement("div"); ops.className = "ops";
  let motivo = "";
  MOTIVOS_DENUNCIA.forEach(([v, titulo, dica]) => {
    const l = document.createElement("label"); l.className = "op";
    const r = document.createElement("input"); r.type = "radio"; r.name = "hfDenMotivo"; r.value = v;
    r.addEventListener("change", () => { motivo = v; atualizar(); });
    const t = document.createElement("span"); const b = document.createElement("b"); b.textContent = titulo; const s = document.createElement("small"); s.textContent = dica;
    t.append(b, s); l.append(r, t); ops.appendChild(l);
  });
  const txt = document.createElement("textarea"); txt.maxLength = 500; txt.placeholder = "Conte o que aconteceu (opcional, ajuda na análise)";
  txt.addEventListener("input", () => atualizar());
  const bloq = document.createElement("label"); bloq.className = "bloq"; bloq.hidden = !podeBloquear || !aoBloquear;
  const cb = document.createElement("input"); cb.type = "checkbox";
  bloq.append(cb, document.createTextNode(`Bloquear ${nomeAlvo || "esta pessoa"} também`));
  const acoes = document.createElement("div"); acoes.className = "acoes";
  const can = document.createElement("button"); can.type = "button"; can.className = "can"; can.textContent = "Cancelar"; can.addEventListener("click", fechar);
  const env = document.createElement("button"); env.type = "button"; env.className = "env"; env.textContent = "Enviar denúncia"; env.disabled = true;
  acoes.append(can, env);
  const atualizar = () => { env.disabled = !motivo || (motivo === "outro" && txt.value.trim().length < 5); };
  caixa.append(intro, ops, txt, bloq, acoes);

  env.addEventListener("click", async () => {
    env.disabled = true; env.textContent = "Enviando...";
    try {
      const dados = { tipo, alvoId, itemId: String(itemId), autorId: eu.uid, motivo, detalhe: txt.value.trim().slice(0, 500), trecho: String(trecho || "").slice(0, 300), status: "nova", criadoEm: fb.serverTimestamp() };
      if (conversaId) dados.conversaId = conversaId;
      await fb.setDoc(ref, dados);
      if (cb.checked && aoBloquear) await aoBloquear();
      caixa.replaceChildren(topo);
      const ok = document.createElement("div"); ok.className = "ok";
      const ic = document.createElement("div"); ic.className = "ic"; ic.textContent = "✓";
      const t = document.createElement("strong"); t.textContent = "Denúncia enviada";
      const p = document.createElement("p"); p.style.margin = "0"; p.style.color = "var(--muted,#8fa0ab)"; p.style.fontSize = "14px";
      p.textContent = "Obrigado. Nossa equipe vai analisar. Se for golpe ou ameaça, não continue a conversa e não faça pagamentos.";
      const b = document.createElement("button"); b.type = "button"; b.className = "can"; b.textContent = "Fechar"; b.style.minHeight = "44px"; b.style.border = "0"; b.style.borderRadius = "12px"; b.style.fontWeight = "800"; b.style.cursor = "pointer"; b.style.color = "inherit";
      b.addEventListener("click", fechar);
      ok.append(ic, t, p, b); caixa.appendChild(ok);
    } catch (e) {
      console.error(e);
      env.disabled = false; env.textContent = "Enviar denúncia";
      alert(e?.code === "permission-denied" ? "Não foi possível enviar. Confirme seu e-mail e tente de novo." : "Não foi possível enviar agora. Tente de novo.");
    }
  });
}
