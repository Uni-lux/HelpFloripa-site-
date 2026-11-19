// Banco de erros comuns, complexos e específicos do português do Brasil (19/11/2026), por categoria.
// Cada caso: [com erro, como deve ficar]. Frases CERTAS (que não podem mudar) ficam em CERTAS.
// Mede: corrigido sozinho, corrigido aceitando as sugestões, e frases certas mexidas.
// Uso: node corretor-banco.mjs          → placar por categoria
//      VER=1 node corretor-banco.mjs    → mostra o que falhou
//      MIN=90 node corretor-banco.mjs   → falha se pegar menos de 90% (aceitando sugestões) ou mexer em frase certa
import fs from "node:fs";
const raiz = new URL("../", import.meta.url).pathname;
const C = await import(raiz + "corretor.js");
C.definirLexico(fs.readFileSync(raiz + "corretor/lexico2.txt", "utf8"));
C.definirContexto(fs.readFileSync(raiz + "corretor/contexto3.json", "utf8"), fs.readFileSync(raiz + "corretor/pesos3.bin"));

export const BANCO = {
  "Palavras escritas errado": [
    ["Ele tem uma excessão", "Ele tem uma exceção"], ["Fui no cabelereiro", "Fui no cabeleireiro"], ["Comprei salchicha", "Comprei salsicha"],
    ["Tem um impecilho", "Tem um empecilho"], ["Quero iorgute", "Quero iogurte"], ["É gratuíto", "É gratuito"], ["Seje feliz", "Seja feliz"],
    ["Espero que esteje bem", "Espero que esteja bem"], ["Tive um poblema", "Tive um problema"], ["Tenho que advinhar", "Tenho que adivinhar"],
    ["É uma entidade beneficiente", "É uma entidade beneficente"], ["Ele é um previlegiado", "Ele é um privilegiado"],
    ["Coloque um asterístico", "Coloque um asterisco"], ["Use bicabornato", "Use bicarbonato"], ["Falei com o adevogado", "Falei com o advogado"],
    ["Mendingo na rua", "Mendigo na rua"], ["Ele bateu o récorde", "Ele bateu o recorde"], ["Fiz a rúbrica", "Fiz a rubrica"],
    ["Comprei mortandela", "Comprei mortadela"], ["Ela é muito ezigente", "Ela é muito exigente"], ["Vou concertar o carro", "Vou consertar o carro"],
    ["Ele pediu concerteza", "Ele pediu com certeza"], ["Paguei a mais menas", "Paguei a mais menos"], ["Tem que ter disciplina e auto-estima", "Tem que ter disciplina e autoestima"],
  ],
  "Acordo ortográfico": [
    ["Tive uma idéia", "Tive uma ideia"], ["O vôo atrasou", "O voo atrasou"], ["Eles lêem muito", "Eles leem muito"], ["É freqüente", "É frequente"],
    ["Foi um ato heróico", "Foi um ato heroico"], ["A assembléia começou", "A assembleia começou"], ["Eles vêem tudo", "Eles veem tudo"],
    ["Espero que eles dêem certo", "Espero que eles deem certo"], ["Está na platéia", "Está na plateia"], ["Ele tem uma jóia", "Ele tem uma joia"],
    ["Foi tranqüilo", "Foi tranquilo"], ["É o enjôo", "É o enjoo"], ["Comprei um microondas", "Comprei um micro-ondas"],
    ["Ele é ex presidente", "Ele é ex-presidente"], ["Faço pós graduação", "Faço pós-graduação"], ["Vou na auto-escola", "Vou na autoescola"],
    ["Usei um anti-rugas", "Usei um antirrugas"], ["Tirei um auto-retrato", "Tirei um autorretrato"], ["Vi a mini-série", "Vi a minissérie"],
    ["Fiz um ultra-som", "Fiz um ultrassom"], ["Comprei um carro semi-novo", "Comprei um carro seminovo"], ["Seja bem vindo", "Seja bem-vindo"],
    ["Deixo as boas vindas", "Deixo as boas-vindas"], ["Foi um mal entendido", "Foi um mal-entendido"], ["No dia-a-dia é assim", "No dia a dia é assim"],
    ["Vou viajar no fim-de-semana", "Vou viajar no fim de semana"],
  ],
  "Por que, porque, por quê, porquê": [
    ["porque você não veio?", "Por que você não veio?"], ["Não sei o porque", "Não sei o porquê"], ["Você não veio por que?", "Você não veio por quê?"],
    ["Você não veio porque?", "Você não veio por quê?"], ["Por que você saiu?", "Por que você saiu?"], ["Saí porque estava cansado", "Saí porque estava cansado"],
    ["Me diga porque você saiu", "Me diga por que você saiu"], ["Não entendi porque ele fez isso", "Não entendi por que ele fez isso"],
  ],
  "Crase": [
    ["Vou à pé", "Vou a pé"], ["A partir de amanhã", "A partir de amanhã"], ["À partir de amanhã", "A partir de amanhã"],
    ["Comprei à prazo", "Comprei a prazo"], ["Entregamos à domicílio", "Entregamos a domicílio"], ["Dei o livro à ela", "Dei o livro a ela"],
    ["Mandei para você à mensagem", "Mandei para você a mensagem"], ["Disse à você", "Disse a você"], ["Tenho muito à fazer", "Tenho muito a fazer"],
    ["Começou à chover", "Começou a chover"], ["Fui a farmácia", "Fui à farmácia"], ["Chego as 8h", "Chego às 8h"], ["Atendemos das 8h as 18h", "Atendemos das 8h às 18h"],
    ["Fico a disposição", "Fico à disposição"], ["Pagamento a vista", "Pagamento à vista"], ["Saímos a noite", "Saímos à noite"],
    ["Liguei a tarde", "Liguei à tarde"], ["Ele chegou a uma hora", "Ele chegou à uma hora"], ["Estou a procura de um emprego", "Estou à procura de um emprego"],
    ["Ele fez a mão", "Ele fez à mão"], ["Peixe a milanesa", "Peixe à milanesa"], ["Fiquei a espera", "Fiquei à espera"],
  ],
  "Concordância": [
    ["Fazem dois anos que moro aqui", "Faz dois anos que moro aqui"], ["Haviam muitas pessoas", "Havia muitas pessoas"],
    ["Houveram problemas", "Houve problemas"], ["Existe muitas opções", "Existem muitas opções"], ["Falta três dias", "Faltam três dias"],
    ["Vende-se casas", "Vendem-se casas"], ["Aluga-se apartamentos", "Alugam-se apartamentos"], ["Ela ficou meia preocupada", "Ela ficou meio preocupada"],
    ["Ela está meia cansada", "Ela está meio cansada"], ["Deve fazer uns dez anos", "Deve fazer uns dez anos"], ["Devem haver erros", "Deve haver erros"],
    ["A gente vamos", "A gente vai"], ["Nós vai sair", "Nós vamos sair"], ["Eles vai voltar", "Eles vão voltar"], ["As coisa ficou difícil", "As coisas ficaram difíceis"],
    ["Os menino chegou", "Os meninos chegaram"], ["É proibido a entrada", "É proibida a entrada"], ["Segue anexo as fotos", "Seguem anexas as fotos"],
    ["Elas mesmo fizeram", "Elas mesmas fizeram"], ["Muito obrigado, disse ela", "Muito obrigado, disse ela"],
  ],
  "Verbos": [
    ["Se eu ver ele, aviso", "Se eu vir ele, aviso"], ["Quando eu poder, vou", "Quando eu puder, vou"], ["Se eu ter tempo, faço", "Se eu tiver tempo, faço"],
    ["Se eu fazer isso, ganho", "Se eu fizer isso, ganho"], ["Quando eu saber, conto", "Quando eu souber, conto"], ["Se ele propor algo, aceito", "Se ele propuser algo, aceito"],
    ["Se você querer, vamos", "Se você quiser, vamos"], ["Quando ele trazer, guardo", "Quando ele trouxer, guardo"], ["Se eu dizer a verdade", "Se eu disser a verdade"],
    ["Ele interviu na briga", "Ele interveio na briga"], ["Ele manteu a calma", "Ele manteve a calma"], ["Ele deteu o ladrão", "Ele deteve o ladrão"],
    ["Eu tinha chego cedo", "Eu tinha chegado cedo"], ["Ele tinha trago o bolo", "Ele tinha trazido o bolo"], ["Eu ponhei ali", "Eu pus ali"],
    ["Eu fazerei amanhã", "Eu farei amanhã"], ["Eu trazerei amanhã", "Eu trarei amanhã"], ["Eu dizerei a ela", "Eu direi a ela"],
    ["Ele trusse o livro", "Ele trouxe o livro"], ["Eu di o presente", "Eu dei o presente"], ["Ele tinha fazido tudo", "Ele tinha feito tudo"],
    ["Eu não cabo aí", "Eu não caibo aí"], ["Vou estar enviando o arquivo", "Vou enviar o arquivo"], ["Vamos estar verificando", "Vamos verificar"],
    ["Ele requiz o documento", "Ele requereu o documento"], ["Se eles verem isso", "Se eles virem isso"],
  ],
  "Verbo na forma errada": [
    ["Hoje de manhã eu acordei tarde e não conseguir toma café, depois sair correndo pra faculdade mais esqueci meus materiais em casa e tive que volta tudo de novo.",
     "Hoje de manhã eu acordei tarde e não consegui tomar café, depois saí correndo pra faculdade, mas esqueci meus materiais em casa e tive que voltar tudo de novo."],
    ["Eu não conseguir terminar a tempo", "Eu não consegui terminar a tempo"], ["Ontem eu sair cedo do trabalho", "Ontem eu saí cedo do trabalho"],
    ["Eu decidir ficar em casa", "Eu decidi ficar em casa"], ["Tenho que estuda mais", "Tenho que estudar mais"], ["Vamos come fora hoje", "Vamos comer fora hoje"],
    ["Ela quer viaja nas férias", "Ela quer viajar nas férias"], ["Não posso esquece disso", "Não posso esquecer disso"], ["Comecei a trabalha cedo", "Comecei a trabalhar cedo"],
    ["Fui ao mercado mais estava fechado", "Fui ao mercado, mas estava fechado"], ["Tentei ligar mais não consegui", "Tentei ligar, mas não consegui"],
  ],
  "Pronomes": [
    ["É para mim fazer", "É para eu fazer"], ["Ele trouxe para mim ler", "Ele trouxe para eu ler"], ["Entre eu e você", "Entre mim e você"],
    ["Venha com nós", "Venha conosco"], ["Ele foi com eu", "Ele foi comigo"], ["Isso fica entre eu e ela", "Isso fica entre mim e ela"],
    ["Vamos com nós dois", "Vamos com nós dois"], ["Ele falou com nós todos", "Ele falou com nós todos"],
  ],
  "Expressões e confusões": [
    ["Não tem nada haver", "Não tem nada a ver"], ["Isso tem haver com você", "Isso tem a ver com você"], ["Ao meu ver, está certo", "A meu ver, está certo"],
    ["Haja visto o problema", "Haja vista o problema"], ["Foi feito sobre medida", "Foi feito sob medida"], ["Sobre o ponto de vista dele", "Sob o ponto de vista dele"],
    ["Corremos perigo eminente", "Corremos perigo iminente"], ["Há risco eminente", "Há risco iminente"], ["Ele infligiu a lei", "Ele infringiu a lei"],
    ["Ganhou uma quantia vultuosa", "Ganhou uma quantia vultosa"], ["Passou desapercebido", "Passou despercebido"], ["Ao invés de sair, fiquei", "Em vez de sair, fiquei"],
    ["Vamos falar a cerca do projeto", "Vamos falar acerca do projeto"], ["Moro aqui a cerca de dez anos", "Moro aqui há cerca de dez anos"],
    ["Prefiro café do que chá", "Prefiro café a chá"], ["Prefiro sair do que ficar", "Prefiro sair a ficar"], ["Foi a nível de empresa", "Foi em nível de empresa"],
    ["Fiz isso afim de ajudar", "Fiz isso a fim de ajudar"], ["Encontrei derrepente", "Encontrei de repente"], ["Fui embora, se não perco o ônibus", "Fui embora, senão perco o ônibus"],
    ["Ele é de menor", "Ele é menor de idade"], ["Ele estava mau humorado", "Ele estava mal-humorado"], ["Ele é muito mal educado", "Ele é muito mal-educado"],
  ],
  "Redundâncias": [
    ["Vou subir pra cima", "Vou subir"], ["Desce lá pra baixo", "Desce lá"], ["Entra pra dentro", "Entra"], ["Sai pra fora", "Sai"],
    ["Vou repetir de novo", "Vou repetir"], ["Há anos atrás", "Há anos"], ["Foi uma surpresa inesperada", "Foi uma surpresa"], ["É o elo de ligação", "É o elo"],
    ["Tenho planos para o futuro", "Tenho planos"], ["Vamos encarar de frente", "Vamos encarar"], ["Ganhe grátis um brinde", "Ganhe um brinde"],
    ["Foi o consenso geral", "Foi o consenso"], ["Precisamos criar novos empregos", "Precisamos criar empregos"], ["Não há outra alternativa", "Não há alternativa"],
  ],
  "Pontuação": [
    ["Porém não deu", "Porém, não deu"], ["Fui embora pois estava cansado", "Fui embora, pois estava cansado"], ["Comprei pão, leite, e etc", "Comprei pão, leite etc."],
    ["Comprei pão, leite etc...", "Comprei pão, leite etc."], ["Que legal!!!!!!", "Que legal!!!"], ["Oi Maria tudo bem?", "Oi, Maria, tudo bem?"],
    ["Bom dia pessoal", "Bom dia, pessoal"], ["Obrigado João", "Obrigado, João"], ["Eu fui mas não gostei", "Eu fui, mas não gostei"],
    ["Chego às 10:00h", "Chego às 10h"], ["A reunião é 14:30hs", "A reunião é 14h30"], ["Custa R$10,00", "Custa R$ 10,00"],
    ["Até logo...........", "Até logo..."], ["Sim eu vou", "Sim, eu vou"],
  ],
  "Maiúsculas": [
    ["Nos vemos na Segunda-Feira", "Nos vemos na segunda-feira"], ["Viajo em Janeiro", "Viajo em janeiro"], ["Vou na Sexta", "Vou na sexta"],
    ["Moro em florianópolis", "Moro em Florianópolis"], ["Nasci no brasil", "Nasci no Brasil"],
  ],
};

export const CERTAS = [
  "A partir de amanhã, tudo muda.", "Ele chegou a uma conclusão.", "Vou à praia e depois a pé para casa.", "Prefiro café.", "Ele fez isso por que motivo?",
  "Não sei por que ele foi.", "Fui porque quis.", "Comprei uma meia azul e meia dúzia de ovos.", "Faltou meia hora.", "Ela estava meio triste.",
  "Passamos a noite toda conversando.", "Vamos com nós dois.", "Ele falou com nós todos.", "Ele é menor de idade.", "Moro a cerca de dez quilômetros daqui.",
  "Isso foi há cerca de dez anos.", "Quero sair mais cedo.", "Ela vai sair agora.", "Antes de dormir, leio.", "Eu vou partir amanhã.", "Fiquei mais feliz.", "Comi mais do que devia.",
  "Ele quer a volta do time.", "Vou à feira para a compra da semana.", "Preciso de ajuda.", "Eu prefiro sair.", "Eu adoro dormir.", "Vende-se uma casa.", "Precisa-se de vendedor.", "A cerca da casa caiu.", "O porquê da demora não foi explicado.",
  "Por quê?", "Ele subiu e desceu a escada.", "Ela saiu para fora da cidade? Não, saiu de casa.", "Em vez de sair, fiquei.", "Ao contrário, ele ficou.",
  "Segunda-feira tem reunião.", "Janeiro é o mês mais quente.", "Sexta é o melhor dia.", "Meu nome é Maria Janeiro.", "A Rua Sete de Setembro fica no centro.",
  "Fico à disposição.", "Ele deu o presente a ela.", "Começou a chover às 8h.", "A reunião é às 14h30.", "O impacto foi iminente.",
  "Ela mesma fez.", "Elas mesmas fizeram.", "Ganhe um brinde.", "Não há alternativa.", "Vou estar em casa amanhã.", "Vou estar lá às 8h.",
];

const corr = (t, tudo) => { const r = C.corrigirTexto(t, { modo: "chat" }); return tudo ? C.corrigirTexto(t, { modo: "chat", aceitar: new Set(r.mudancas.map((m) => m.chave)) }).texto : r.texto; };
const norm = (s) => s.replace(/\s+/g, " ").trim().replace(/[.]$/, "");
if (import.meta.url === `file://${process.argv[1]}`) {
  let tA = 0, tS = 0, tN = 0;
  for (const [cat, casos] of Object.entries(BANCO)) {
    let a = 0, s = 0; const falhas = [];
    for (const [errado, certo] of casos) {
      const ra = corr(errado, false), rs = corr(errado, true);
      if (norm(ra) === norm(certo)) a++;
      if (norm(rs) === norm(certo)) s++; else falhas.push(`      ${errado}  →  ${rs}   (esperado: ${certo})`);
    }
    tA += a; tS += s; tN += casos.length;
    console.log(`${cat.padEnd(34)} ${String(casos.length).padStart(3)} · sozinho ${String(Math.round((a / casos.length) * 100)).padStart(3)}% · com sugestões ${String(Math.round((s / casos.length) * 100)).padStart(3)}%`);
    if (process.env.VER) falhas.forEach((f) => console.log(f));
  }
  let mexidas = 0;
  for (const t of CERTAS) { const r = corr(t, false); if (norm(r) !== norm(t)) { mexidas++; if (process.env.VER) console.log("   CERTA MEXIDA:", t, "→", r); } }
  let sugCertas = 0;
  for (const t of CERTAS) { const r = corr(t, true); if (norm(r) !== norm(t)) { sugCertas++; if (process.env.VER) console.log("   SUGESTÃO EM CERTA:", t, "→", r); } }
  console.log(`\nTOTAL ${tN} erros · sozinho ${((tA / tN) * 100).toFixed(1)}% · com sugestões ${((tS / tN) * 100).toFixed(1)}%`);
  console.log(`Frases certas: ${CERTAS.length} · mexidas sozinho: ${mexidas} · com sugestão errada: ${sugCertas}`);
  if (process.env.MIN && ((tS / tN) * 100 < +process.env.MIN || mexidas > 0)) process.exitCode = 1;
}
