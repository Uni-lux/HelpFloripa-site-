// Corretor de texto (12/11/2026): bateria de frases com erros reais (acento, digitação, som, abreviação, concordância,
// crase, mal/mau, traz/trás, pontuação, maiúsculas) e frases CERTAS que não podem ser mexidas.
// Uso: node t-corretor.mjs   (não precisa do emulador; lê ../corretor/lexico.txt)
import fs from "node:fs";
const C = await import("../corretor.js");
C.definirLexico(fs.readFileSync(new URL("../corretor/lexico.txt", import.meta.url), "utf8"));
C.definirContexto(fs.readFileSync(new URL("../corretor/contexto.json", import.meta.url), "utf8"));
let ok = 0, ruins = 0;
const conferir = (cond, t) => { console.log(cond ? "  ✔" : "  ✘", t); cond ? ok++ : ruins++; if (!cond) process.exitCode = 1; };
const corrigir = (t, modo = "pub", tudo = false) => {
  const r = C.corrigirTexto(t, { modo });
  if (!tudo) return r;
  return C.corrigirTexto(t, { modo, aceitar: new Set(r.mudancas.filter((m) => m.conf === "media").map((m) => m.chave)) });
};
// [entrada, esperado (texto exato) ou função, modo]
const CASOS = [
  // acentos e palavras que não existem
  ["voce viu o onibus que passou agora", "Você viu o ônibus que passou agora.", "pub"],
  ["a reuniao de amanha vai ser otima", "A reunião de amanhã vai ser ótima.", "pub"],
  ["ate logo, obrigado pela atencao", "Até logo, obrigado pela atenção.", "pub"],
  // digitação (letra trocada, faltando, sobrando, invertida)
  ["eu quero comprar uma caisa nova", (r) => /caixa|casa|coisa/.test(r), "chat", true],
  ["o restaurante estava muito cheio hoje", "O restaurante estava muito cheio hoje", "chat"],
  ["obrigado pela ajdua de vcs", "Obrigado pela ajuda de vocês", "chat"],
  ["preciso de um eletricista urgnete", (r) => /urgente/.test(r), "chat"],
  ["ele chegou atrsado na reunião", (r) => /atrasado/.test(r), "chat"],
  ["vamos amrcar um horário", (r) => /marcar/.test(r), "chat"],
  ["qual o vlaor do serviço?", (r) => /valor/.test(r), "chat"],
  // erros pelo som
  ["eu ezitei muito antes de decidir", (r) => /hesitei/.test(r), "chat"],
  ["a esperiencia foi incrivel", (r) => /experiência/.test(r) && /incrível/.test(r), "chat"],
  ["ele nao conseguiu enxergar nada", (r) => /não/.test(r), "chat"],
  ["meu irmão é muito previlegiado", (r) => /privilegiado/.test(r), "chat"],
  ["isso e uma excessão", (r) => /exceção/.test(r), "chat"],
  ["vou fazer uma pesquiza sobre isso", (r) => /pesquisa/.test(r), "chat"],
  ["tem que ter muita paciençia", (r) => /paciência/.test(r), "chat"],
  ["não quero mecher nisso", (r) => /mexer/.test(r), "chat"],
  ["o almosso tava bom", (r) => /almoço/.test(r), "chat"],
  ["a gente se ve depois", (r) => /vê/.test(r), "chat"],
  // abreviações
  ["vc sabe se tbm tem hj?", "Você sabe se também tem hoje?", "chat"],
  ["blz, vlw msm", "Beleza, valeu mesmo", "chat"],
  // concordância
  ["a gente vamos sair cedo", "A gente vai sair cedo", "chat"],
  ["eu vai chegar tarde", "Eu vou chegar tarde", "chat"],
  ["vocês vai gostar", "Vocês vão gostar", "chat"],
  ["eles foi embora cedo", "Eles foram embora cedo", "chat"],
  ["fazem 10 anos que eu moro aqui", "Faz 10 anos que eu moro aqui", "chat"],
  ["houveram muitos problemas", "Houve muitos problemas", "chat"],
  ["é para mim fazer isso?", "É para eu fazer isso?", "chat"],
  ["as coisa estão difíceis", (r) => /as coisas/i.test(r), "chat", true],
  // crase, a/há, mal/mau, traz/trás, por/pôr
  ["chego as 10h amanhã", (r) => /às 10h/.test(r), "chat"],
  ["as vezes eu esqueço", "Às vezes eu esqueço", "chat"],
  ["fique a vontade", "Fique à vontade", "chat"],
  ["vou a praia no domingo", "Vou à praia no domingo", "chat"],
  ["moro aqui a 5 anos que gosto", (r) => /há 5 anos/.test(r), "chat"],
  ["ele está de mau humor", "Ele está de mau humor", "chat"],
  ["estou me sentindo muito mau", "Estou me sentindo muito mal", "chat"],
  ["ele sempre trás o almoço", (r) => /traz o almoço/.test(r), "chat"],
  ["olha para traz", (r) => /para trás/.test(r), "chat"],
  ["vou por o carro na garagem", (r) => /pôr o carro/.test(r), "chat"],
  ["eles vem amanhã", "Eles vêm amanhã", "chat"],
  ["eles tem razão", "Eles têm razão", "chat"],
  // pontuação e formatação
  ["oi gente tudo bem?", "Oi, gente, tudo bem?", "chat"],
  ["bom dia Ana, tudo certo?", "Bom dia, Ana, tudo certo?", "chat"],
  ["chego 10hrs e pago R$50", (r) => /10h /.test(r) && /R\$ 50/.test(r), "chat"],
  ["eu fui mas não gostei", "Eu fui, mas não gostei", "chat"],
  ["que legal !!!!!!", "Que legal!!!", "chat"],
  ["como faço pra pedir", "Como faço pra pedir?", "chat"],
  ["terminei.agora vou dormir", "Terminei. Agora vou dormir", "chat"],
  ["afim de ajudar", "A fim de ajudar", "chat"],
  ["concerteza vou derrepente", (r) => /Com certeza/.test(r) && /de repente/.test(r), "chat"],
  // concordância de verdade (2ª etapa, texto do dono)
  ["nos vai no mercado ontem e compra varias coisa", "Nós fomos ao mercado ontem e compramos várias coisas", "chat"],
  ["as pessoas tava tudo olhando", "As pessoas estavam tudo olhando", "chat"],
  ["como se nois fosse uns estranho", "Como se nós fôssemos uns estranhos", "chat"],
  ["eu falei que agente precisava ir embora", "Eu falei que a gente precisava ir embora", "chat"],
  ["estava procurando as coisa que tinha perdido", "Estava procurando as coisas que tinha perdido", "chat"],
  ["depois nois foi embora sem compra nada", "Depois nós fomos embora sem comprar nada", "chat"],
  ["os ônibus não passava mais", "Os ônibus não passavam mais", "chat"],
  ["foi umas situação muito complicado", "Foi uma situação muito complicada", "chat"],
  ["ninguém não sabia oque fazer", "Ninguém sabia o que fazer", "chat"],
  ["eu precisava, mais quando cheguei já era tarde", "Eu precisava, mas quando cheguei já era tarde", "chat"],
  ["a casa é muito bonito", "A casa é muito bonita", "chat"],
  ["eu fui no médico e compra o remédio", "Eu fui ao médico e comprei o remédio", "chat"],
  ["eles chegou cedo e pega o carro", "Eles chegaram cedo e pegaram o carro", "chat"],
  ["nós fomos lá, mas quando chegou estava fechado", (r) => /chegou/.test(r), "chat"], // sugestão: não muda sozinho
  ["nós fomos lá, mas quando chegou estava fechado", (r) => /chegamos/.test(r), "chat", true],
  // corretor que aprende: escolhe pelas palavras em volta (contexto.json) + regras de chat
  ["quero mas cafe", (r) => /mais café/.test(r), "chat", true],
  ["o carro e azul", "O carro é azul", "chat"],
  ["ontem ele nao pode vir", "Ontem ele não pôde vir", "chat"],
  ["da pra fazer hoje", "Dá pra fazer hoje?", "chat"],
  ["ele nao me da atencao", "Ele não me dá atenção", "chat"],
  ["ele e mau educado", "Ele é mal-educado", "chat"],
  ["ele esta aqui e voce esta la", "Ele está aqui e você está lá", "chat"],
  ["o pais esta em crise", "O país está em crise", "chat"],
  ["Pedro e Maria foram juntos.", "Pedro e Maria foram juntos.", "pub"],
  ["A casa nova e bonita.", "A casa nova e bonita.", "pub"],
  // NÃO mexer: frases certas, nomes, links, @, #, números
  ["Amanhã vou ao mercado com a Juliana.", "Amanhã vou ao mercado com a Juliana.", "pub"],
  ["Meu site é helpfloripa.com.br e o @maria.silva_22 tem #promoção hoje!", "Meu site é helpfloripa.com.br e o @maria.silva_22 tem #promoção hoje!", "pub"],
  ["Paguei R$ 1.500,00 às 14:30.", "Paguei R$ 1.500,00 às 14:30.", "pub"],
  ["O Douglas e a Bianca foram ao Mercado Público.", "O Douglas e a Bianca foram ao Mercado Público.", "pub"],
  ["Eu e ele vamos sair.", "Eu e ele vamos sair.", "pub"],
  ["Pra mim tanto faz.", "Pra mim tanto faz.", "pub"],
  ["Esta casa é linda e está à venda.", "Esta casa é linda e está à venda.", "pub"],
  ["Nós vamos à praia de manhã.", "Nós vamos à praia de manhã.", "pub"],
  ["kkkkk que engraçado", "Kkkkk que engraçado", "chat"],
  ...["Nós fomos ao mercado e compramos pão.", "Eu vi as pessoas saindo do prédio.", "As coisas que ele comprou estão aqui.",
    "Nós vamos amanhã e voltamos domingo.", "Os meninos jogam bola e a menina corre.", "Os dele são melhores.", "Eu as vejo todo dia.",
    "Mas quando ela chegou, já era tarde.", "Depois que nós saímos, ele chegou.", "Ele comprou as camisas e saiu.",
    "Sem você nada faz sentido.", "A foto ficou linda.", "O sistema é muito rápido.", "Cada caso é analisado pela equipe.",
    "Usar a Comunidade é gratuito.", "O pedido chega pelo chat.", "Cada publicação ganha uma nota."].map((f) => [f, f, "pub"]),
];
for (const [ent, esp, modo, tudo] of CASOS) {
  const r = corrigir(ent, modo, tudo);
  const passou = typeof esp === "function" ? esp(r.texto) : r.texto === esp;
  conferir(passou, `${ent}  →  ${r.texto}${passou || typeof esp === "function" ? "" : `   (esperado: ${esp})`}`);
}
// palavra inventada sem sugestão vai para "não encontradas"
const d = C.corrigirTexto("o xyzqwk chegou", { modo: "chat" });
conferir(d.desconhecidas.includes("xyzqwk"), "palavra que não existe aparece em “não encontradas”");
C.adicionarAoDicionario("xyzqwk");
conferir(!C.corrigirTexto("o xyzqwk chegou", { modo: "chat" }).desconhecidas.length, "adicionada ao dicionário pessoal: não aparece mais");
// aprende com a pessoa: desligou 2 vezes → vem desligada; 4 vezes → some; sugestão ligada 2 vezes → vem ligada
{
  const ch = (t, de) => C.corrigirTexto(t, { modo: "chat" }).mudancas.find((m) => m.de.toLowerCase() === de);
  const a = ch("vou ate la", "ate");
  conferir(a && a.ligada, "“ate → até” vem ligada");
  C.aprenderEscolhas([[a.chave, false]]); C.aprenderEscolhas([[a.chave, false]]);
  conferir(!ch("vou ate la", "ate").ligada, "desligada 2 vezes: passa a vir desligada");
  C.aprenderEscolhas([[a.chave, false]]); C.aprenderEscolhas([[a.chave, false]]);
  conferir(!ch("vou ate la", "ate"), "desligada 4 vezes: não aparece mais");
  const s = C.corrigirTexto("nós fomos lá, mas quando chegou estava fechado", { modo: "chat" }).mudancas.find((m) => m.conf === "media");
  conferir(s && !s.ligada, "sugestão vem desligada");
  C.aprenderEscolhas([[s.chave, true]]); C.aprenderEscolhas([[s.chave, true]]);
  conferir(C.corrigirTexto("nós fomos lá, mas quando chegou estava fechado", { modo: "chat" }).mudancas.find((m) => m.chave === s.chave)?.ligada, "ligada 2 vezes: passa a vir ligada");
  C.esquecerEscolhas();
}
// tempo
let t0 = Date.now(); C.corrigirTexto("primeira vez constroi os mapas: voce esperiencia caisa", { modo: "chat" });
const t1 = Date.now() - t0; t0 = Date.now();
const longo = CASOS.map((c) => c[0]).join(". ");
for (let i = 0; i < 5; i++) C.corrigirTexto(longo, { modo: "pub" });
const t2 = (Date.now() - t0) / 5;
conferir(t2 < 400, `rápido: ${Math.round(t1)} ms na 1ª vez (monta os mapas), ${Math.round(t2)} ms num texto de ${longo.length} letras`);
console.log(`\n${ok} certos, ${ruins} errados`);
