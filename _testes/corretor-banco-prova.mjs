// Prova do banco de erros (19/11/2026): frases DIFERENTES das do corretor-banco.mjs, escritas ANTES das regras novas
// e nunca usadas para ajustar o corretor. Mede se as regras valem para frases novas (e não só para as do banco).
// Uso: node corretor-banco-prova.mjs   (VER=1 mostra as falhas)
import fs from "node:fs";
const raiz = new URL("../", import.meta.url).pathname;
const C = await import(raiz + "corretor.js");
C.definirLexico(fs.readFileSync(raiz + "corretor/lexico2.txt", "utf8"));
C.definirContexto(fs.readFileSync(raiz + "corretor/contexto3.json", "utf8"), fs.readFileSync(raiz + "corretor/pesos3.bin"));

const PROVA = [
  ["A cliente pediu uma excessão na regra", "A cliente pediu uma exceção na regra"], ["Marquei horário no cabelereiro amanhã", "Marquei horário no cabeleireiro amanhã"],
  ["O frete é gratuíto para todo o Brasil", "O frete é gratuito para todo o Brasil"], ["Espero que você esteje melhor", "Espero que você esteja melhor"],
  ["Deu um poblema no sistema", "Deu um problema no sistema"], ["Achei uma idéia ótima", "Achei uma ideia ótima"], ["O vôo para São Paulo saiu cedo", "O voo para São Paulo saiu cedo"],
  ["Eles crêem que vai dar certo", "Eles creem que vai dar certo"], ["É uma coisa freqüente aqui", "É uma coisa frequente aqui"], ["Esquentei no microondas", "Esquentei no micro-ondas"],
  ["Sejam bem vindos ao grupo", "Sejam bem-vindos ao grupo"], ["Ela é ex mulher dele", "Ela é ex-mulher dele"], ["Melhorou minha auto-estima", "Melhorou minha autoestima"],
  ["O dia-a-dia da loja é corrido", "O dia a dia da loja é corrido"], ["porque ele não respondeu?", "Por que ele não respondeu?"], ["Ele sumiu e ninguém sabe por que", "Ele sumiu e ninguém sabe por quê"],
  ["Explica porque o preço subiu", "Explica por que o preço subiu"], ["Vamos à pé até a praça", "Vamos a pé até a praça"], ["Vendemos à prazo no cartão", "Vendemos a prazo no cartão"],
  ["Entrega à domicílio grátis", "Entrega a domicílio grátis"], ["Contei tudo à ele", "Contei tudo a ele"], ["Ainda tenho muito à aprender", "Ainda tenho muito a aprender"],
  ["Começou à trabalhar ontem", "Começou a trabalhar ontem"], ["Fui a padaria cedo", "Fui à padaria cedo"], ["Estamos a disposição para dúvidas", "Estamos à disposição para dúvidas"],
  ["Pagando a vista tem desconto", "Pagando à vista tem desconto"], ["Abrimos das 9h as 17h", "Abrimos das 9h às 17h"], ["Ela saiu a tarde", "Ela saiu à tarde"],
  ["Estamos a procura de uma casa", "Estamos à procura de uma casa"], ["Fazem três meses que espero", "Faz três meses que espero"], ["Haviam vários carros na rua", "Havia vários carros na rua"],
  ["Existe vários motivos", "Existem vários motivos"], ["Vende-se terrenos", "Vendem-se terrenos"], ["Conserta-se celulares", "Consertam-se celulares"],
  ["Fiquei meia confusa", "Fiquei meio confusa"], ["Se eu ver o recado, respondo", "Se eu vir o recado, respondo"], ["Quando você poder, me liga", "Quando você puder, me liga"],
  ["Se a gente ter tempo, passamos lá", "Se a gente tiver tempo, passamos lá"], ["Se eu saber de algo, te aviso", "Se eu souber de algo, te aviso"], ["Ele manteu o preço", "Ele manteve o preço"],
  ["Eu tinha chego atrasado", "Eu tinha chegado atrasado"], ["Eu fazerei o pedido", "Eu farei o pedido"], ["Vou estar enviando o orçamento", "Vou enviar o orçamento"],
  ["Ele deixou para mim resolver", "Ele deixou para eu resolver"], ["Isso é entre eu e ele", "Isso é entre mim e ele"], ["Ela vai com nós amanhã", "Ela vai conosco amanhã"],
  ["Isso não tem nada haver com o assunto", "Isso não tem nada a ver com o assunto"], ["Ao meu ver, o preço está bom", "A meu ver, o preço está bom"],
  ["Roupa feita sobre medida", "Roupa feita sob medida"], ["Há um perigo eminente", "Há um perigo iminente"], ["Ele infligiu as regras do condomínio", "Ele infringiu as regras do condomínio"],
  ["Ao invés de ligar, mande mensagem", "Em vez de ligar, mande mensagem"], ["Prefiro pizza do que hambúrguer", "Prefiro pizza a hambúrguer"],
  ["Ela é de menor", "Ela é menor de idade"], ["Pode subir pra cima", "Pode subir"], ["Não precisa repetir de novo", "Não precisa repetir"],
  ["Isso foi há dois anos atrás", "Isso foi há dois anos"], ["Ganhe grátis uma sobremesa", "Ganhe uma sobremesa"], ["Contudo não consegui", "Contudo, não consegui"],
  ["Trouxe arroz, feijão, e etc", "Trouxe arroz, feijão etc."], ["Abrimos às 9:00h", "Abrimos às 9h"], ["Oi Carlos tudo certo?", "Oi, Carlos, tudo certo?"],
  ["A festa é no Sábado", "A festa é no sábado"], ["Começa em Março", "Começa em março"], ["Eles vêem a novela", "Eles veem a novela"],
];
const CERTAS = [
  "Vamos a pé.", "A reunião foi a partir das 9h.", "Ela ficou meio confusa.", "Prefiro pizza.", "Por que você ligou?", "Ninguém sabe por quê.",
  "Ele foi conosco.", "Faltou meia hora para acabar.", "Há cerca de três anos moro aqui.", "Março tem 31 dias.", "Ela chegou a uma decisão.",
  "Comprei meia dúzia de pães.", "Vou estar no escritório às 9h.", "Vende-se um carro.", "Ela mesma resolveu.",
];
const corr = (t) => { const r = C.corrigirTexto(t, { modo: "chat" }); return C.corrigirTexto(t, { modo: "chat", aceitar: new Set(r.mudancas.map((m) => m.chave)) }).texto; };
const auto = (t) => C.corrigirTexto(t, { modo: "chat" }).texto;
const norm = (s) => s.replace(/\s+/g, " ").trim().replace(/[.]$/, "");
let a = 0, s = 0;
for (const [e, c] of PROVA) { if (norm(auto(e)) === norm(c)) a++; if (norm(corr(e)) === norm(c)) s++; else if (process.env.VER) console.log("   ", e, "→", corr(e), "  (esperado:", c + ")"); }
let mex = 0; for (const t of CERTAS) if (norm(auto(t)) !== norm(t)) { mex++; if (process.env.VER) console.log("   CERTA MEXIDA:", t, "→", auto(t)); }
console.log(`Prova do banco: ${PROVA.length} erros · sozinho ${((a / PROVA.length) * 100).toFixed(1)}% · com sugestões ${((s / PROVA.length) * 100).toFixed(1)}% · frases certas mexidas: ${mex} de ${CERTAS.length}`);
