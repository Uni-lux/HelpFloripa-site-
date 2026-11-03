// =====================================================
// Conferências do chat feitas no servidor (decidido pelo dono em 28/10/2026, junto com o Blaze).
// 1) "Responde rápido": o tempo médio de resposta do negócio é calculado aqui, a cada mensagem, e gravado em
//    perfis_publicos/{uid}.respostaServ {media, n, em}. As regras de perfis_publicos já não deixam o dono gravar esse
//    campo (não está em camposPerfil), então não dá para forjar. O site prefere ele ao valor do aparelho.
// 2) Pedido do chat: o cartão é montado no aparelho de quem pede. Aqui os itens, preços, entrega e cupom são
//    conferidos com o negócio de agora e o resultado vai na própria mensagem: conferencia {ok, avisos, total, em}.
//    O cartão do pedido mostra "Valores conferidos" ou o alerta com o que não bate.
// Aqui só a CONTA (sem Firebase), para dar para testar sozinha.
// =====================================================

// Média das últimas ~50 respostas, em minutos (máx. 1 dia), igual à conta que o aparelho fazia.
export function novaMedia(atual, minutos) {
  const r = atual && Number.isFinite(Number(atual.media)) ? atual : { media: 0, n: 0 };
  const min = Math.min(1440, Math.max(0, minutos));
  const peso = Math.min(Number(r.n) || 0, 49);
  return { media: Math.round(((r.media * peso + min) / (peso + 1)) * 10) / 10, n: Math.min((Number(r.n) || 0) + 1, 1000) };
}

// O que fazer com a espera da conversa quando chega uma mensagem de `de`.
// espera: { de, desde } (quem está esperando resposta e desde quando) ou null. ehNegocio: `de` tem negócio.
// Devolve { espera (nova), resposta: minutos | null }.
export function passoEspera(espera, de, ehNegocio, quando) {
  if (espera?.de && espera.de !== de) {
    // A outra pessoa respondeu. Só conta se quem respondeu é o negócio.
    return { espera: null, resposta: ehNegocio ? (quando - espera.desde) / 60000 : null };
  }
  if (espera?.de === de) return { espera, resposta: null }; // mandou mais uma: a espera continua desde a 1ª
  // Ninguém esperando: quem escreveu (cliente) passa a esperar. O negócio escrevendo primeiro não abre espera.
  return { espera: ehNegocio ? null : { de, desde: quando }, resposta: null };
}

const reais = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
const ms = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : t instanceof Date ? t.getTime() : 0);

// Promoção que vale agora (mesma ideia do promoAtiva do site: o plano é conferido por quem chama).
export function promocaoValendo(n, agora, temPlano) {
  const p = n?.promocao;
  if (!p || !temPlano || n.tipo === "saude") return null;
  const ate = ms(p.ate);
  if (ate && ate < agora) return null;
  return p;
}

// Confere o pedido com o negócio. pedido = cartao.pedido; n = negocios/{id}.
export function conferirPedidoChat(pedido, n, { agora = Date.now(), temPlano = false } = {}) {
  const avisos = [];
  const itens = Array.isArray(pedido?.itens) ? pedido.itens : [];
  const lista = (Array.isArray(n?.itens) ? n.itens : []).filter((i) => i?.nome);
  let soma = 0;
  const precoDiferente = [], naoExiste = [];
  itens.forEach((it) => {
    const nome = String(it?.nome || ""), qtd = Math.max(0, parseInt(it?.qtd, 10) || 0), preco = Number(it?.preco) || 0;
    const x = lista.find((i) => nome === String(i.nome).slice(0, 60) || nome.startsWith(String(i.nome).slice(0, 60) + " ("));
    if (!x) { naoExiste.push(nome.slice(0, 40)); soma += qtd * preco; return; }
    const certo = Number(x.preco) > 0 ? Number(x.preco) : 0;
    if (certo && Math.abs(certo - preco) > 0.009) precoDiferente.push(`${nome.slice(0, 40)} (${reais(preco)}, no cardápio ${reais(certo)})`);
    soma += qtd * (certo || preco);
  });
  if (naoExiste.length) avisos.push(`Não está no cardápio de agora: ${naoExiste.slice(0, 3).join(", ")}${naoExiste.length > 3 ? "…" : ""}.`);
  if (precoDiferente.length) avisos.push(`Preço diferente do cardápio: ${precoDiferente.slice(0, 3).join(", ")}${precoDiferente.length > 3 ? "…" : ""}.`);
  // Entrega: a taxa do negócio (só delivery com entrega).
  const taxaCerta = n?.tipo === "delivery" && pedido?.modo !== "retirada" && Number(n.taxaEntrega) > 0 ? Number(n.taxaEntrega) : 0;
  const taxa = Number(pedido?.taxa) > 0 ? Number(pedido.taxa) : 0;
  if (Math.abs(taxa - taxaCerta) > 0.009) avisos.push(`Taxa de entrega ${reais(taxa)}, a do negócio é ${reais(taxaCerta)}.`);
  // Cupom: precisa ser o da promoção que vale agora.
  const cod = pedido?.cupom && typeof pedido.cupom === "object" ? String(pedido.cupom.codigo || "") : "";
  if (pedido?.cupom) {
    const promo = promocaoValendo(n, agora, temPlano);
    if (!promo) avisos.push("O negócio não tem promoção valendo agora.");
    else if (cod && String(promo.codigo || "") !== cod) avisos.push(`O cupom ${cod.slice(0, 20)} não é o da promoção atual.`);
  }
  const total = Math.round((soma + taxaCerta) * 100) / 100;
  if (Math.abs(total - (Number(pedido?.total) || 0)) > 0.009) avisos.push(`Total do pedido ${reais(pedido?.total)}, pelos preços de agora ${reais(total)}.`);
  return { ok: !avisos.length, avisos: avisos.slice(0, 5), total };
}
