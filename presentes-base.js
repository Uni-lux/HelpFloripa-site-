// =====================================================
// Presentes — base sem dependências (presentes.js, Mensagens e testes).
// Tipos: mimo (virtual), pix (dinheiro: quem recebe manda a chave e quem deu paga direto), produto (lanche, roupa,
// produto de um negócio do Help Floripa: quem recebe escolhe o endereço e o pedido vai para a loja), corrida e
// entrega (quem recebe usa em Entregas e corridas e quem deu paga direto para quem leva).
// O Help Floripa não cobra nem recebe: só conecta e organiza.
// =====================================================
export const TIPOS_PRESENTE = {
  mimo: { nome: "Mimo", desc: "Um carinho virtual com a sua mensagem", cor: "#e5487f" },
  produto: { nome: "Lanche ou produto", desc: "Algo de um delivery ou loja do Help Floripa", cor: "#ff7a1a" },
  vale: { nome: "Vale-presente", desc: "Um valor para usar em qualquer negócio: serviço, consulta, oficina, loja...", cor: "#b066ff" },
  pix: { nome: "Dinheiro", desc: "Você paga por Pix direto para a pessoa", cor: "#32bcad" },
  corrida: { nome: "Corrida", desc: "Uma viagem de carro ou moto, paga por você", cor: "#00adee" },
  entrega: { nome: "Entrega", desc: "Para a pessoa mandar algo, paga por você", cor: "#f5b301" }
};
// Mimos virtuais (desenhados com emoji grande dentro do cartão).
export const MIMOS = {
  rosa: ["🌹", "Uma rosa"], buque: ["💐", "Um buquê"], cafe: ["☕", "Um café"], chocolate: ["🍫", "Um chocolate"],
  bolo: ["🎂", "Um bolo"], ursinho: ["🧸", "Um ursinho"], estrela: ["⭐", "Uma estrela"], abraco: ["🤗", "Um abraço"],
  festa: ["🎉", "Parabéns"], coracao: ["💙", "Um coração"], trofeu: ["🏆", "Um troféu"], sorvete: ["🍦", "Um sorvete"]
};
export const QUEM_PODE = {
  todos: ["Todo mundo", "Qualquer pessoa com conta no Help Floripa"],
  seguindo: ["Quem eu sigo e meus vínculos", "Pessoas que você segue e as do seu Social (padrão)"],
  vinculos: ["Só meus vínculos do Social", "Família, amigos, duo e quem você aceitou no Social"],
  ninguem: ["Ninguém", "Você não recebe presentes (gorjeta de entrega continua valendo)"]
};
export const STATUS_PRESENTE = {
  pendente: ["Esperando resposta", "amarelo"], aceito: ["Aceito", "verde"], recusado: ["Recusado", "vermelho"],
  cancelado: ["Cancelado", "vermelho"], usado: ["Usado", "ciano"], concluido: ["Concluído", "verde"]
};
export const reaisP = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const VALOR_MAX_PRESENTE = 2000;
// Texto curto do presente ("Um café", "R$ 50,00 em dinheiro", "2 itens de Pizzaria X", "Corrida de até R$ 30,00").
export function resumoPresente(p) {
  if (!p) return "Presente";
  if (p.tipo === "mimo") return (MIMOS[p.mimo] || MIMOS.coracao)[1];
  if (p.tipo === "pix") return `${reaisP(p.valor)} em dinheiro`;
  if (p.tipo === "produto") {
    const n = (p.itens || []).reduce((s, i) => s + (Number(i.qtd) || 1), 0);
    return `${n} ${n === 1 ? "item" : "itens"}${p.negocioNome ? ` de ${p.negocioNome}` : ""}`;
  }
  if (p.tipo === "vale") return `Vale de ${reaisP(p.valor)}${p.negocioNome ? ` em ${p.negocioNome}` : ""}`;
  return `${p.tipo === "corrida" ? "Corrida" : "Entrega"} de até ${reaisP(p.valor)}`;
}
export function emojiPresente(p) {
  if (p?.tipo === "mimo") return (MIMOS[p.mimo] || MIMOS.coracao)[0];
  return { pix: "💸", produto: "🛍️", vale: "🎟️", corrida: "🚗", entrega: "📦" }[p?.tipo] || "🎁";
}
// O que a pessoa faz depois de aceitar (texto do próximo passo).
export function proximoPasso(p, souQuemRecebe) {
  if (!p) return "";
  if (p.status === "pendente") return souQuemRecebe ? "Aceite ou recuse o presente." : "Esperando a pessoa aceitar.";
  if (p.status === "aceito") {
    if (p.tipo === "mimo") return souQuemRecebe ? "Presente guardado na sua lista." : "A pessoa aceitou o seu mimo.";
    if (p.tipo === "pix") return souQuemRecebe ? "Mande a sua chave Pix para receber." : "Quando a pessoa mandar a chave Pix, pague pelo app do banco.";
    if (p.tipo === "produto") return souQuemRecebe ? "Escolha onde receber: o pedido vai para a loja." : "A pessoa vai escolher onde receber.";
    if (p.tipo === "vale") return souQuemRecebe ? `Toque em “Usar o vale” para combinar com ${p.negocioNome || "o negócio"}.` : `Quando a pessoa usar, você paga ${p.negocioNome || "o negócio"} direto (até o valor do vale).`;
    return souQuemRecebe ? `Use quando quiser em Entregas e corridas.` : `A pessoa vai pedir a ${p.tipo} quando quiser.`;
  }
  if (p.status === "usado") {
    if (p.tipo === "produto") return souQuemRecebe ? "Pedido enviado para a loja." : "Pedido feito na loja: combine o pagamento com ela.";
    if (p.tipo === "vale") return souQuemRecebe ? `Vale apresentado a ${p.negocioNome || "o negócio"} no Mensagens.` : `A pessoa usou o vale: combine o pagamento com ${p.negocioNome || "o negócio"}.`;
    return souQuemRecebe ? "Pedido feito." : "A pessoa pediu: o pagamento é com você, direto para quem leva.";
  }
  return STATUS_PRESENTE[p.status]?.[0] || "";
}
