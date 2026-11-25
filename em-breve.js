// Funções guardadas para a próxima atualização (25/11/2026): o Firebase recusa regras com mais de 256.000 bytes compilados,
// então as regras de corridas/entregas, roubos/veículos e desaparecidos ficaram em _regras/proxima-atualizacao.rules.
// Enquanto true, as páginas escondem as entradas e mostram "Em breve". Para voltar: pôr as regras de volta e virar false.
export const EM_BREVE = { corridas: false, roubos: true, desaparecidos: true };

// Troca a página inteira por um aviso "Em breve" e nunca resolve (quem chama com await para ali).
export function pararComEmBreve(titulo, texto) {
  const css = document.createElement("style");
  css.textContent = `.hf-em-breve{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:24px;
    background:var(--bg,#000);color:var(--text,#fff);font:15px/1.5 system-ui,sans-serif;text-align:center}
    .hf-em-breve div{max-width:380px}.hf-em-breve b{display:block;font-size:22px;margin:10px 0 6px}
    .hf-em-breve .sel{display:inline-block;padding:3px 10px;border-radius:99px;background:rgba(0,173,238,.15);color:#00adee;
    font-size:12px;font-weight:700;letter-spacing:.04em}.hf-em-breve p{opacity:.8;margin:0 0 18px}
    .hf-em-breve a{display:inline-block;padding:11px 18px;border-radius:12px;background:#00adee;color:#001018;font-weight:700;
    text-decoration:none}`;
  const tela = document.createElement("div");
  tela.className = "hf-em-breve";
  tela.innerHTML = `<div><span class="sel">EM BREVE</span><b></b><p></p><a href="index.html">Voltar ao início</a></div>`;
  tela.querySelector("b").textContent = titulo;
  tela.querySelector("p").textContent = texto;
  document.head.appendChild(css);
  document.body.appendChild(tela);
  try { document.documentElement.style.visibility = ""; document.body.style.visibility = ""; } catch {}
  return new Promise(() => {});
}
