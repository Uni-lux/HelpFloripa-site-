// =====================================================
// Corretor de texto em português (12/11/2026, pedido do dono): acentos, abreviações, erros comuns de escrita,
// concordância nos casos mais frequentes, pontuação e maiúsculas. Funciona NO APARELHO, sem servidor e sem mandar
// o texto para ninguém. É um corretor por regras (dicionário + padrões com contexto): pega os erros mais comuns do dia a
// dia, mas não entende o sentido da frase como um revisor humano — por isso cada correção aparece para a pessoa aceitar
// ou não (corretor-tela.js).
//   corrigirTexto(texto, { modo: "pub" | "chat", pular: Set("de→para") })
//     → { texto, mudancas: [{ de, para, tipo, motivo, chave }], porTipo: { acento: 2, ... } }
// Tipos: acento, abreviacao, ortografia, concordancia, pontuacao, maiuscula, repeticao.
// Sem dependências (usado no formulário do Diário, na edição da publicação, no Mensagens e nos testes).
// =====================================================

export const TIPOS_CORRECAO = {
  acento: "Acentos",
  ortografia: "Escrita",
  abreviacao: "Abreviações",
  concordancia: "Concordância",
  regencia: "Regência",
  estilo: "Estilo",
  crase: "Crase",
  pontuacao: "Pontuação",
  maiuscula: "Maiúsculas",
  repeticao: "Repetições"
};

// ---------- Dicionários ----------
// Palavras escritas sem acento (só as que NÃO têm outro sentido sem o acento; as ambíguas têm regra com contexto).
const ACENTOS = {
  voce: "você", voces: "vocês", tambem: "também", entao: "então", nao: "não", ja: "já", ate: "até", so: "só", la: "lá",
  ca: "cá", pe: "pé", ne: "né", cafe: "café", mes: "mês", tres: "três", porem: "porém", alem: "além", atras: "atrás",
  apos: "após", alguem: "alguém", ninguem: "ninguém", ingles: "inglês", portugues: "português",
  frances: "francês", onibus: "ônibus", numero: "número", numeros: "números", musica: "música", musicas: "músicas", unico: "único", unica: "única", otimo: "ótimo", otima: "ótima", pessimo: "péssimo",
  pessima: "péssima", proximo: "próximo", proxima: "próxima", ultimo: "último", ultima: "última", rapido: "rápido",
  rapida: "rápida", facil: "fácil", dificil: "difícil", util: "útil", uteis: "úteis", possivel: "possível",
  impossivel: "impossível", incrivel: "incrível", horario: "horário", horarios: "horários", salario: "salário",
  comentario: "comentário", comentarios: "comentários", usuario: "usuário", usuarios: "usuários", necessario: "necessário",
  necessaria: "necessária", inicio: "início", negocio: "negócio", negocios: "negócios", servico: "serviço",
  servicos: "serviços", preco: "preço", precos: "preços", comeco: "começo", cabeca: "cabeça", almoco: "almoço",
  forca: "força", esforco: "esforço", espaco: "espaço", agua: "água", historia: "história", historias: "histórias",
  familia: "família", ferias: "férias", pagina: "página", paginas: "páginas", video: "vídeo", videos: "vídeos",
  audio: "áudio", audios: "áudios", area: "área", areas: "áreas", codigo: "código", medico: "médico", medica: "médica",
  proprio: "próprio", propria: "própria", saude: "saúde", parabens: "parabéns", sabado: "sábado", terca: "terça",
  amanha: "amanhã", manha: "manhã", irma: "irmã", irmao: "irmão", mae: "mãe", pao: "pão", sao: "são", mao: "mão",
  maos: "mãos", chao: "chão", cao: "cão", alemao: "alemão", policia: "polícia",
  farmacia: "farmácia", veiculo: "veículo", veiculos: "veículos", endereco: "endereço",
  enderecos: "endereços", orcamento: "orçamento", orcamentos: "orçamentos", grafico: "gráfico", basico: "básico",
  otimos: "ótimos", tecnico: "técnico", tecnica: "técnica", eletrico: "elétrico", eletrica: "elétrica", mecanico: "mecânico",
  mecanica: "mecânica", logica: "lógica", obvio: "óbvio", obvia: "óbvia", serio: "sério",
  media: "média", exercicio: "exercício", exercicios: "exercícios", remedio: "remédio", remedios: "remédios",
  predio: "prédio", predios: "prédios", silencio: "silêncio", ciencia: "ciência", consciencia: "consciência",
  experiencia: "experiência", paciencia: "paciência", emergencia: "emergência", urgencia: "urgência", ola: "olá", alias: "aliás", ta: "tá", automatico: "automático", automatica: "automática",
  pratico: "prático", simpatico: "simpático", simpatica: "simpática", unicos: "únicos", varios: "vários",
  varias: "várias", cartao: "cartão", cartoes: "cartões",
  feijao: "feijão", limao: "limão", melao: "melão", avioes: "aviões", aviao: "avião", questao: "questão",
  questoes: "questões", opiniao: "opinião", opinioes: "opiniões", regiao: "região", regioes: "regiões", reuniao: "reunião", paises: "países", saida: "saída", saidas: "saídas", conteudo: "conteúdo",
  conteudos: "conteúdos", miudo: "miúdo", ruido: "ruído", vovo: "vovó",
  cardapio: "cardápio", cardapios: "cardápios", duvida: "dúvida", duvidas: "dúvidas", credito: "crédito", debito: "débito",
  deposito: "depósito", analise: "análise", especifico: "específico", especifica: "específica", taxi: "táxi", oculos: "óculos",
  cerebro: "cérebro", metodo: "método", periodo: "período", historico: "histórico", basica: "básica", agil: "ágil",
  papeis: "papéis", hoteis: "hotéis", pasteis: "pastéis", aneis: "anéis", heroi: "herói", chapeu: "chapéu", ceu: "céu",
  trofeu: "troféu", anuncio: "anúncio", anuncios: "anúncios", comercio: "comércio", email: "e-mail", lampada: "lâmpada",
  japones: "japonês", chines: "chinês", sitio: "sítio", relogio: "relógio",
  ultimos: "últimos", ultimas: "últimas", proximos: "próximos", proximas: "próximas", rapidos: "rápidos", graficos: "gráficos",
  economico: "econômico", economica: "econômica", eletronico: "eletrônico", eletronica: "eletrônica", telefonico: "telefônico",
  unidade: "unidade", farmacias: "farmácias", clinica: "clínica", clinicas: "clínicas", pediatra: "pediatra", odontologico: "odontológico",
  bonus: "bônus", onus: "ônus", virus: "vírus", lapis: "lápis", tenis: "tênis", jovem: "jovem", jovens: "jovens", hifen: "hífen",
  florianopolis: "Florianópolis", brasilia: "Brasília", goiania: "Goiânia", belem: "Belém",
  vitoria: "vitória", maceio: "Maceió", parana: "Paraná", ceara: "Ceará", amapa: "Amapá", piaui: "Piauí",
  maranhao: "Maranhão", jose: "José", joao: "João", sebastiao: "Sebastião", antonio: "Antônio", lucia: "Lúcia",
  monica: "Mônica", patricia: "Patrícia", marcia: "Márcia", vinicius: "Vinícius", cassio: "Cássio", fabio: "Fábio"
};
// Palavras que viram nome próprio (cidades, país).
const NOMES = { brasil: "Brasil", floripa: "Floripa", florianopolis: "Florianópolis", brasilia: "Brasília", goiania: "Goiânia",
  belem: "Belém", maceio: "Maceió", parana: "Paraná", ceara: "Ceará", amapa: "Amapá", piaui: "Piauí", maranhao: "Maranhão",
  jose: "José", joao: "João", sebastiao: "Sebastião", antonio: "Antônio", lucia: "Lúcia", monica: "Mônica",
  patricia: "Patrícia", marcia: "Márcia", vinicius: "Vinícius", cassio: "Cássio", fabio: "Fábio", palhoca: "Palhoça",
  biguacu: "Biguaçu", itajai: "Itajaí", balneario: "Balneário", criciuma: "Criciúma", jaragua: "Jaraguá" };

// Abreviações de internet → palavra inteira.
const ABREVIACOES = {
  vc: "você", vcs: "vocês", tb: "também", tbm: "também", tmb: "também", pq: "porque", q: "que", qq: "qualquer",
  td: "tudo", tds: "todos", hj: "hoje", msg: "mensagem", msgs: "mensagens", blz: "beleza", mto: "muito", mt: "muito",
  mta: "muita", mtos: "muitos", mtas: "muitas", cmg: "comigo", ctg: "contigo", dps: "depois", agr: "agora", qnd: "quando",
  qdo: "quando", qnto: "quanto", qto: "quanto", n: "não", nn: "não", ss: "sim", kd: "cadê", obg: "obrigado", obgd: "obrigado",
  obgda: "obrigada", vlw: "valeu", flw: "falou", msm: "mesmo", nd: "nada", ngm: "ninguém", aq: "aqui", tlg: "tá ligado",
  pfv: "por favor", pfvr: "por favor", pf: "por favor", sdds: "saudades", bjs: "beijos", bj: "beijo", abs: "abraços",
  fds: "fim de semana", dnv: "de novo", tmj: "tamo junto", vdd: "verdade", eh: "é", oq: "o que", sla: "sei lá",
  cm: "como", tlgd: "tá ligado", fzr: "fazer", pdc: "pode crer", gnt: "gente",
  hrs: "horas", hr: "hora", qndo: "quando", entt: "então", tava: "estava",
};

// Erros comuns de escrita.
const ORTOGRAFIA = {
  // verbos com forma inventada e palavras juntas/separadas (19/11/2026)
  fazerei: "farei", fazeremos: "faremos", fazeria: "faria", fazeriam: "fariam", fazerá: "fará", trazerei: "trarei", trazeremos: "traremos",
  trazeria: "traria", trazerá: "trará", dizerei: "direi", dizeremos: "diremos", dizeria: "diria", dizerá: "dirá", fazido: "feito", fazida: "feita",
  abrido: "aberto", escrevido: "escrito", dizido: "dito", ponhei: "pus", ponhou: "pôs", ponharam: "puseram", trusse: "trouxe",
  manteu: "manteve", deteu: "deteve", conteu: "conteve", obteu: "obteve", reteu: "reteve", interviu: "interveio", interviram: "intervieram",
  requiz: "requereu", requis: "requereu", requizeram: "requereram", microondas: "micro-ondas", "antiinflamatório": "anti-inflamatório",
  antiinflamatorio: "anti-inflamatório", "dia-a-dia": "dia a dia", "fim-de-semana": "fim de semana", "fins-de-semana": "fins de semana",
  "mão-de-obra": "mão de obra", "cara-de-pau": "cara de pau", "à-toa": "à toa", "dia-dia": "dia a dia",
  nois: "nós", noiz: "nós", muié: "mulher", trabaio: "trabalho", oque: "o que", doque: "do que", noque: "no que", praque: "pra que", porisso: "por isso", encima: "em cima", atoa: "à toa",
  denovo: "de novo", porfavor: "por favor", nadaver: "nada a ver", derrepente: "de repente", apartir: "a partir",
  concerteza: "com certeza", derrepente: "de repente", porisso: "por isso", apartir: "a partir", atravez: "através",
  seje: "seja", esteje: "esteja", menas: "menos", excessao: "exceção", excesao: "exceção", exeção: "exceção", excessão: "exceção",
  exessao: "exceção", previlegio: "privilégio", previlégio: "privilégio", beneficiente: "beneficente",
  cabeleleiro: "cabeleireiro", cabelereiro: "cabeleireiro", asterístico: "asterisco", asteristico: "asterisco",
  impecilho: "empecilho", mendingo: "mendigo", poblema: "problema", pobrema: "problema", probrema: "problema",
  iorgute: "iogurte", enchergar: "enxergar", chingar: "xingar", mecher: "mexer", mecheu: "mexeu", quizer: "quiser",
  quizesse: "quisesse", pesquizar: "pesquisar", pesquiza: "pesquisa", analizar: "analisar", analize: "análise",
  paralizar: "paralisar", sombrancelha: "sobrancelha", advinhar: "adivinhar", advinha: "adivinha",
  bicabornato: "bicarbonato", cidadões: "cidadãos", gratuíto: "gratuito", ruím: "ruim", nescessario: "necessário",
  nessesario: "necessário", necesario: "necessário", nescessária: "necessária", trousse: "trouxe", trouce: "trouxe",
  trusse: "trouxe", mortandela: "mortadela", mussarela: "muçarela",
  encomodar: "incomodar", encomodo: "incômodo", imcomodo: "incômodo", disperdício: "desperdício", desperdicio: "desperdício",
  disperdicio: "desperdício", previnir: "prevenir", meteriologia: "meteorologia",
  metereologia: "meteorologia", estrupo: "estupro", cincoenta: "cinquenta",
  ancioso: "ansioso", anciosa: "ansiosa", ecelente: "excelente",
  exelente: "excelente", esceção: "exceção", esperiencia: "experiência", esperiência: "experiência",
  experiençia: "experiência", susseso: "sucesso", sucesu: "sucesso", ezemplo: "exemplo", ezame: "exame", izento: "isento", izenção: "isenção", rasão: "razão", rasao: "razão", visinho: "vizinho", visinha: "vizinha", belesa: "beleza", certesa: "certeza",
  tristesa: "tristeza", fraquesa: "fraqueza", naturesa: "natureza",
  empreza: "empresa", tambén: "também", tambêm: "também", hà: "há", êle: "ele", idéia: "ideia", assembléia: "assembleia", heróico: "heroico", jibóia: "jiboia", européia: "europeia",
  vôo: "voo", enjôo: "enjoo", lêem: "leem", vêem: "veem", crêem: "creem", dêem: "deem",
  freqüência: "frequência", tranqüilo: "tranquilo", lingüiça: "linguiça", agüentar: "aguentar", cinqüenta: "cinquenta", conseqüência: "consequência", pingüim: "pinguim"
};

// ---------- Regras com contexto (concordância e palavras ambíguas) ----------
// Cada uma: [regex no texto (com a palavra completa), substituição, tipo, motivo]. As regex usam \b próprio de letras.
const L = "\\p{L}";
const P = (s) => new RegExp(`(?<![${L}])${s}(?![${L}])`, "giu");
const REGRAS = [
  // "e" → "é" (verbo ser) quando claramente é verbo
  [P(`(isso|isto|aquilo|ele|ela|n[aã]o|qual|quem|onde|como|quando|aqui|a[ií]|tudo|ningu[eé]m|voc[eê]|ela|ele|que)\\s+e\\s+(mal-educad[oa]s?|mau|mal\\s+educad[oa]s?|grande|legal|car[oa]|barat[oa]|chat[oa]|lind[oa]|feio|feia|bonit[oa]|um|uma|muito|muita|bom|boa|ruim|verdade|certo|certa|assim|isso|melhor|pior|s[oó]|mesmo|poss[ií]vel|importante|dif[ií]cil|f[aá]cil|lindo|linda|top|demais|o\\s+melhor|a\\s+melhor|meu|minha|seu|sua|nosso|nossa)`), "$1 é $2", "acento", "“é” do verbo ser leva acento"],
  [P(`(^|[.!?]\\s+)e\\s+(verdade|isso|assim|s[oó]|muito|bom|boa|claro|poss[ií]vel)`), "$1é $2", "acento", "“é” do verbo ser leva acento"],
  // "esta" → "está" (verbo) antes de palavras que pedem o verbo
  [P(`esta\\s+(bem|aqui|a[ií]|l[aá]|certo|certa|tudo|ok|com|sendo|indo|fazendo|vindo|chegando|chovendo|aberto|aberta|fechado|fechada|pronto|pronta|dispon[ií]vel|funcionando|precisando|esperando|tranquilo|tranquila|na|no|em|muito|bom|boa|ruim|caro|cara|barato|barata|legal|livre|ocupado|ocupada|online|atrasado|atrasada)`), "está $1", "acento", "“está” do verbo estar leva acento"],
  [P(`(voc[eê]|ele|ela|isso|tudo|onde|como|quem|n[aã]o)\\s+esta(?=\\s*[?!.,]|\\s*$)`), (m, a) => `${a} está`, "acento", "“está” do verbo estar leva acento"],
  // "ai" → "aí" (lugar/então); "ai" sozinho como gemido continua
  [P(`(t[aá]|est[aá]|fica|ficou|vou|vai|vem|deixa|chego|chegou|e|a[ií]\\s+)\\s+ai(?=[\\s?!.,]|$)`), "$1 aí", "acento", "“aí” (lugar ou então) leva acento"],
  [P(`ai\\s+(sim|n[aã]o|ent[aã]o|vou|vai|eu|ele|ela|a gente|depois|que)`), "aí $1", "acento", "“aí” (lugar ou então) leva acento"],
  // "nos" → "nós" como sujeito
  [P(`nos\\s+(vamos|somos|estamos|temos|podemos|fomos|fizemos|queremos|precisamos|sabemos|ficamos|vimos|chegamos)`), "nós $1", "acento", "“nós” (sujeito) leva acento"],
  // "tem" → "têm" com sujeito no plural
  [P(`(eles|elas|voc[eê]s)\\s+tem(?![${L}])`), "$1 têm", "acento", "“têm” no plural leva acento"],
  // "pais" → "país" com artigo/adjetivo de país
  [P(`(o|nosso|esse|este|todo\\s+o|do|no|pelo)\\s+pais(?=[\\s?!.,]|$)`), "$1 país", "acento", "“país” (nação) leva acento"],
  // concordância comum
  [P(`a\\s+gente\\s+(vamos|somos|estamos|temos|podemos|fomos|fizemos|queremos|precisamos|ficamos)`), (m, v) => "a gente " + ({ vamos: "vai", somos: "é", estamos: "está", temos: "tem", podemos: "pode", fomos: "foi", fizemos: "fez", queremos: "quer", precisamos: "precisa", ficamos: "ficou" })[v.toLowerCase()], "concordancia", "“a gente” combina com o verbo no singular"],
  [P(`(?<!(?:com|entre|de|para|pra|por|sem|contra|sobre|a|em|que)\\s)(?:n[oó]s\\s+(vai|est[aá]|foi|precisa|ficou)|nós\\s+(é|tem|pode|fez|quer|sabe))(?![${L}])`), (m, v1, v2) => { const v = v1 || v2; return "nós " + ({ vai: "vamos", "é": "somos", "está": "estamos", esta: "estamos", tem: "temos", pode: "podemos", foi: "fomos", fez: "fizemos", quer: "queremos", precisa: "precisamos", ficou: "ficamos", sabe: "sabemos" })[v.toLowerCase()]; }, "concordancia", "“nós” combina com o verbo no plural"],
  [P(`agente\\s+(vai|vamos|foi|pode|tem|t[aá]|est[aá]|precisa|se\\s+v[eê]|quer|fica|faz|sempre)`), "a gente $1", "ortografia", "“a gente” (nós) se escreve separado; “agente” é profissão"],
  [P(`fazem\\s+((?:\\d+|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|muitos|muitas|v[aá]rios|v[aá]rias|alguns|algumas)\\s+(?:anos|meses|dias|semanas|horas|minutos|d[eé]cadas)|anos|meses|dias|semanas|horas)(?![${L}])`), "faz $1", "concordancia", "“faz” indicando tempo fica no singular"],
  [P(`houveram`), "houve", "concordancia", "“haver” no sentido de existir fica no singular"],
  [P(`haviam\\s+(muitos|muitas|v[aá]rios|v[aá]rias|poucos|poucas|dois|duas|tr[eê]s|alguns|algumas)`), "havia $1", "concordancia", "“haver” no sentido de existir fica no singular"],
  [P(`para\\s+mim\\s+(fazer|ir|ver|saber|comprar|pagar|ligar|falar|levar|buscar|mandar|entender|usar|pegar|ficar|sair|chegar|trabalhar)`), "para eu $1", "concordancia", "antes de verbo é “para eu” (eu faço), não “para mim”"],
  [P(`pra\\s+mim\\s+(fazer|ir|ver|saber|comprar|pagar|ligar|falar|levar|buscar|mandar|entender|usar|pegar|ficar|sair|chegar|trabalhar)`), "pra eu $1", "concordancia", "antes de verbo é “pra eu” (eu faço), não “pra mim”"],
  [P(`entre\\s+eu\\s+e`), "entre mim e", "concordancia", "depois de “entre” usa-se “mim”"],
  [P(`meio-dia\\s+e\\s+meio`), "meio-dia e meia", "concordancia", "meio-dia e meia (hora)"],
  [P(`a\\s+muito\\s+tempo`), "há muito tempo", "ortografia", "tempo passado: “há muito tempo”"],
  [P(`a\\s+(\\d+|dois|duas|tr[eê]s|alguns|algumas|poucos|poucas|muitos|muitas)\\s+(anos|meses|dias|semanas|horas|minutos)\\s+atr[aá]s`), "há $1 $2", "ortografia", "com “atrás”, o tempo passado é “há” (sem repetir: “há 2 dias”)"],
  [P(`mais\\s+(ele|ela|eu|voc[eê]|a gente|n[oó]s)\\s+(n[aã]o|nunca)`), "mas $1 $2", "ortografia", "“mas” (porém) é diferente de “mais” (quantidade)"],
  [P(`(^|[.!?]\\s+)porque\\s+(?=[^.!?]*\\?)`), "$1Por que ", "ortografia", "em pergunta, “por que” é separado"],
  [P(`porque\\s*\\?`), "por quê?", "ortografia", "no fim da pergunta: “por quê?”"],
  [P(`a\\s+onde\\s+(fica|est[aá]|[eé]|mora)`), "onde $1", "ortografia", "com “ficar/estar/morar” é “onde” (“aonde” é para onde se vai)"],
  // senão × se não (19/11/2026): "se não" = caso não (condição); "senão" = do contrário, a não ser
  [P(`sen[aã]o\\s+(chover|der|for|puder|tiver|quiser|conseguir|estiver|houver|fizer|vier|souber|pagar|chegar|responder|gostar|funcionar|resolver|aparecer|ligar|vierem|forem|puderem|tiverem|quiserem|conseguirem|estiverem|derem|fizerem|me\\s+engano|me\\s+falha|se\\s+importar)(?![${L}])`), "se não $1", "ortografia", "condição (caso não) é “se não”, separado; “senão” = do contrário"],
  [P(`(?<=,)\\s*se\\s+n[aã]o\\s+((?:voc[eê]|vc|a\\s+gente|eu|ele|ela|eles|elas)\\s+)?(vai|vou|vamos|v[aã]o|perde|perdemos|fica|ficamos|atrasa|esfria|queima|estraga|acaba|d[aá]\\s+ruim)`), (m, s1, v) => ` senão ${s1 || ""}${v}`, "ortografia", "“senão” = do contrário (corre, senão perde o ônibus)", "media"],
  // demais × de mais: "demais" = muito/os outros; "de mais" = o contrário de "de menos"
  [P(`nada\\s+demais`), "nada de mais", "ortografia", "“nada de mais” (o contrário de “de menos”)"],
  [P(`demais\\s+ou\\s+de\\s+menos`), "de mais ou de menos", "ortografia", "“de mais” é o contrário de “de menos”"],
  [P(`(os|as|aos|[aà]s|dos|das|nos|nas|pelos|pelas)\\s+de\\s+mais(?=\\s+(pessoas|clientes|alunos|participantes|casos|itens|produtos|colegas|amigos|convidados|membros|funcion[aá]rios|\\p{L}+(?:ram|am|em|ão))(?![${L}])|\\s*[.,;!?]|\\s*$)`), "$1 demais", "ortografia", "“os demais” (os outros) é junto"],
  [P(`(lind[oa]s?|bo[am]s?|bons|legal|legais|car[oa]s?|bonit[oa]s?|gostos[oa]s?|chat[oa]s?|grandes?|pequen[oa]s?|longe|cedo|tarde|r[aá]pido|f[aá]cil|dif[ií]cil|forte|fofo|fofa|top|incr[ií]vel|perfeit[oa]|cansad[oa]|feliz|triste|gostei|amei|adorei|comi|bebi|trabalhei|falou|falei|chorei|ri|dormi|cansei|demorou|demora|sofri|pensei|caro|apertad[oa]|quente|frio|fria)\\s+de\\s+mais(?=\\s*[.,;!?]|\\s*$|\\s+(n[eé]|mesmo|hoje|ontem|kk+|rs))`), "$1 demais", "ortografia", "no sentido de “muito”, é “demais”, junto"],
  // sessão (reunião, tempo de algo) × seção (parte, setor) × cessão (ato de ceder)
  [P(`(sess[aã]o|sess[oõ]es|se[cç][aã]o|se[cç][oõ]es)\\s+(de|do|da|dos|das)\\s+(cinema|filme|terapia|fotos?|treinos?|fisioterapia|massagem|estudos?|aut[oó]grafos?|julgamento|c[aâ]mara|plen[aá]rio|acupuntura|psicoterapia|tatuagem|drenagem|pilates|yoga|ioga|cuidados|depila[cç][aã]o|coaching|mentoria)(?![${L}])`),
    (m, w, d, o) => `${/[oõ]es$/i.test(w) ? "sessões" : "sessão"} ${d} ${o}`, "ortografia", "“sessão” = encontro, tempo de uma atividade (sessão de cinema, de terapia)"],
  [P(`(sess[aã]o|sess[oõ]es|se[cç][aã]o|se[cç][oõ]es)\\s+(de|do|da|dos|das)\\s+(frios|esportes|classificados|livros|roupas|brinquedos|hortifruti|perguntas|coment[aá]rios|ajuda|achados|eletr[oô]nicos|bebidas|limpeza|padaria|a[cç]ougue|cal[cç]ados|not[ií]cias|contatos?|jornal|loja|mercado|supermercado|site|p[aá]gina|revista|livro|texto|artigo|lei|manual)(?![${L}])`),
    (m, w, d, o) => `${/[oõ]es$/i.test(w) ? "seções" : "seção"} ${d} ${o}`, "ortografia", "“seção” = parte, setor (seção de frios, do jornal)"],
  [P(`se[cç][aã]o\\s+eleitoral|sess[aã]o\\s+eleitoral`), "seção eleitoral", "ortografia", "“seção eleitoral” (o lugar onde se vota)"],
  [P(`(sess[aã]o|se[cç][aã]o|cess[aã]o)\\s+(de|do|da|dos|das)\\s+(direitos?|uso|cr[eé]ditos?|im[oó]vel|terreno|ponto|contrato|cotas?|quotas?|imagem)(?![${L}])`),
    (m, w, d, o) => `cessão ${d} ${o}`, "ortografia", "“cessão” = ato de ceder (cessão de direitos, de uso)"],
  // mas (porém) × más (plural de "má", ruins)
  [P(`(pessoas|coisas|not[ií]cias|ideias|id[eé]ias|l[ií]nguas|companhias|influ[eê]ncias|condi[cç][oõ]es|escolhas|inten[cç][oõ]es|experi[eê]ncias|lembran[cç]as|energias|vibes|decis[oõ]es|atitudes|notas|a[cç][oõ]es|condutas|amizades|mem[oó]rias|sensa[cç][oõ]es|vibra[cç][oõ]es|l[ií]nguas)\\s+mas(?=\\s*[.,;!?]|\\s*$|\\s+(e|ou)\\s)`), "$1 más", "acento", "“más” (ruins) leva acento; “mas” = porém"],
  [P(`(boas|bons)\\s+(e|ou)\\s+mas(?![${L}])`), "$1 $2 más", "acento", "“más” (ruins) leva acento; “mas” = porém"],
  [P(`(?<=^|[,;]\\s*)m[aá]s(?=\\s+(eu|ele|ela|voc[eê]|vc|a\\s+gente|n[oó]s|eles|elas|n[aã]o|tudo|quando|se|como|j[aá]|ainda|tamb[eé]m|isso|isto|agora|hoje|mesmo|depois)(?![${L}]))`), (m) => (/á/i.test(m) ? "mas" : m), "acento", "“mas” (porém) não leva acento; “más” = ruins"],
  [P(`mal\\s+educad([oa]s?)`), "mal-educad$1", "ortografia", "“mal-educado” leva hífen"],
  [P(`bem\\s+vind([oa]s?)`), "bem-vind$1", "ortografia", "“bem-vindo” leva hífen"],
  [P(`(at[eé]|por|da[ií]|de|para|pra|l[aá]|c[aá]|fica|ficou|chegando|t[oô]|estou|t[aá]|esteja)\\s+ai(?=[\\s?!.,]|$)`), "$1 aí", "acento", "“aí” (lugar) leva acento"],
  [P(`(^|[.!?]\\s+)da\\s+(pra|para)(?![${L}])`), (m, a, b) => `${a}Dá ${b}`, "acento", "“dá” (verbo dar) leva acento"],
  [P(`(me|te|lhe|nos|ele|ela|voc[eê]|quem|algu[eé]m|ningu[eé]m)\\s+da\\s+(aten[cç][aã]o|bola|risada|valor|conta|bom\\s+dia|oi|um|uma|uns|umas|o|a|os|as|pra|para|certo|trabalho|medo|raiva|vontade|sono|fome)(?![${L}])`), "$1 dá $2", "acento", "“dá” (verbo dar) leva acento"],
  [P(`(o|a|um|uma|meu|minha|esse|essa|este|seu|sua|nosso|nossa|aquele|aquela)\\s+(\\p{Ll}{3,})\\s+e\\s+(mau|mal|bom|boa|grande|pequen[oa]|legal|lind[oa]|car[oa]|barat[oa]|nov[oa]|velh[oa]|fei[oa]|f[aá]cil|dif[ií]cil|[oó]tim[oa]|bonit[oa]|perfeit[oa]|chat[oa]|lent[oa]|r[aá]pid[oa]|importante|verdade|melhor|pior|incr[ií]vel|maravilhos[oa]|horr[ií]vel|azul|verde|vermelh[oa]|branc[oa]|pret[oa]|amarel[oa]|demais|top|muito|muita|super|t[aã]o|sempre|meu|minha)(?![${L}])`), (m, d, n, a) => /^(e|ou|que|de|em|com)$/i.test(n) ? null : `${d} ${n} é ${a}`, "acento", "“é” do verbo ser leva acento"],
  [P(`(ontem|anteontem)((?:\\s+\\p{L}+){0,4}?)\\s+pode(?=\\s+(vir|ir|ficar|sair|chegar|falar|atender|ajudar|ver|fazer|ligar|responder|trabalhar|dormir|comer|pagar|levar|buscar)(?![${L}]))`), (m, a, b) => `${a}${b} pôde`, "acento", "no passado é “pôde” (com acento)"],
  [P(`mau\\s+educad([oa]s?)`), "mal-educad$1", "ortografia", "“mal-educado” leva hífen (e é “mal”)"],
  [P(`(n[aã]o|j[aá]|isso|que|s[oó]|tudo|nem|como)\\s+da\\s+(pra|para|certo|errado|tempo|n[aã]o|mais|nada|medo|vontade|um\\s+jeito|jeito)(?![${L}])`), "$1 dá $2", "acento", "“dá” (verbo dar) leva acento"],
  [P(`(^|eu\\s+)to\\s+(\\p{L}+ndo|aqui|a[ií]|bem|mal|com|sem|em|no|na|cansad[oa]|feliz|triste|pront[oa]|livre|ocupad[oa]|online|chegando|saindo|indo|morrendo)(?![${L}])`), (m, a, w) => `${a}tô ${w}`, "acento", "“tô” (estou) leva acento"],
  [P(`(ontem|hoje|amanh[aã]|sexta|s[aá]bado|domingo|segunda|ter[cç]a|quarta|quinta|toda\\s+noite\\s+e)\\s+a\\s+(noite|tarde)(?![${L}])`), "$1 à $2", "crase", "“à noite / à tarde” leva crase"],
  [P(`h[aá]\\s+(um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|alguns|algumas|muitos|muitas|poucos|poucas|v[aá]rios|v[aá]rias)\\s+(anos?|meses|dias?|semanas?|horas?|minutos?)\\s+atr[aá]s`), "há $1 $2", "ortografia", "“há … atrás” repete a ideia: basta “há”", "media"],
  // futuro do subjuntivo: "se eu ver" → "se eu vir", "quando você poder" → "quando você puder"
  [P(`(quem|quando|se|assim\\s+que|logo\\s+que|caso|enquanto|sempre\\s+que)\\s+(eu\\s+|voc[eê]\\s+|ele\\s+|ela\\s+|a\\s+gente\\s+)?(ver|fazer|poder|ter|saber|querer|vir|dizer|trazer|estar|pôr|por)(?=\\s+(ele|ela|isso|isto|o|a|os|as|um|uma|algo|alguma|algu[eé]m|tempo|aqui|a[ií]|l[aá]|que|me|te|de|por|pra|para|com|em|no|na|mais|melhor|certo|lugar|ajuda)(?![${L}])|[.,!?]|$)`), (m, c, q, v) => {
    const t = { ver: "vir", fazer: "fizer", poder: "puder", ter: "tiver", saber: "souber", querer: "quiser", vir: "vier", dizer: "disser", trazer: "trouxer", estar: "estiver", "pôr": "puser", por: null }[v.toLowerCase()];
    return t ? `${c} ${q || ""}${t}` : null; }, "concordancia", "futuro do verbo: “se eu vir”, “quando puder”, “se tiver”", "media"],
  // ----- 12/11/2026: mais regras com contexto -----
  // crase
  [P(`as\\s+vezes`), "às vezes", "crase", "“às vezes” leva crase"],
  [P(`as\\s+pressas`), "às pressas", "crase", "“às pressas” leva crase"],
  [P(`(fique|fica|fiquem|fiquei|ficou|esteja|sinta-se|se\\s+sinta|ficar)\\s+a\\s+vontade`), "$1 à vontade", "crase", "“à vontade” leva crase"],
  [P(`(vou|vai|vamos|v[aã]o|fui|foi|fomos|ir|chegar|cheguei|chegou|chego|voltar|voltei|voltou|volto|levar|levei|levo|leva)\\s+a\\s+(praia|escola|igreja|festa|feira|farm[aá]cia|padaria|academia|faculdade|universidade|empresa|loja|cl[ií]nica|reuni[aã]o|missa|piscina|cidade|pra[cç]a|oficina|lanchonete|pizzaria|sorveteria|rodovi[aá]ria|delegacia|prefeitura)(?![${L}])`), "$1 à $2", "crase", "“ir a + a praia” vira “à praia”"],
  [P(`(vire|virar|vira|dobre|dobrar|dobra|fica|fica\\s+logo|fica\\s+bem)\\s+a\\s+(direita|esquerda)`), "$1 à $2", "crase", "“à direita/à esquerda” leva crase"],
  // mal × mau, traz × trás, por × pôr, vem × vêm
  [P(`(um|uns|o|muito|t[aã]o|que|esse|este|seu|meu)\\s+mal\\s+(humor|cheiro|tempo|exemplo|gosto|aluno|motorista|pagador|neg[oó]cio|sinal|momento|jeito|profissional|atendimento|car[aá]ter)(?![${L}])`), "$1 mau $2", "ortografia", "“mau” é o contrário de “bom”"],
  [P(`(estou|est[aá]|t[aá]|t[oô]|fiquei|ficou|ficar|passando|passei|passou|me\\s+sinto|se\\s+sente|muito|t[aã]o)\\s+mau(?![${L}])`), "$1 mal", "ortografia", "“mal” é o contrário de “bem”"],
  [P(`mal\\s+humorad([oa]s?)`), "mal-humorad$1", "ortografia", "“mal-humorado” leva hífen"],
  [P(`(para|pra|por|de|l[aá]\\s+de)\\s+tr[aá]z(?![${L}])`), (m, a) => `${a} trás`, "ortografia", "“trás” = parte de trás; “traz” é do verbo trazer"],
  [P(`(ele|ela|voc[eê]|quem|isso|sempre|que)\\s+tr[aá]s(?![${L}])`), "$1 traz", "ortografia", "“traz” é do verbo trazer"],
  [P(`(vou|vai|pode|posso|quero|quer|preciso|precisa|tem\\s+que|temos\\s+que|vamos)\\s+por\\s+(o|a|os|as|no|na|nos|nas|mais)(?![${L}])`), "$1 pôr $2", "acento", "“pôr” (colocar) leva acento"],
  [P(`(eles|elas|voc[eê]s)\\s+vem(?![${L}])`), "$1 vêm", "acento", "“vêm” no plural leva acento"],
  // ---- regência (19/11/2026): o verbo pede a preposição certa ----
  // "assistir o filme" → "assistir ao filme" (assistir = ver pede "a"; "assistir o paciente" = ajudar, por isso só com o que se vê)
  [P(`(assistir|assisti|assistiu|assistimos|assistiram|assisto|assiste|assistem|assistindo|assistia|assistiam|assistirei|assistiremos|assistirem)\\s+(o|a|os|as)\\s+(filmes?|jogos?|novelas?|s[eé]ries?|programas?|shows?|v[ií]deos?|aulas?|partidas?|apresenta[cç](?:[aã]o|[oõ]es)|palestras?|final|desenhos?|document[aá]rios?|epis[oó]dios?|lives?|missa|culto|lutas?|corridas?|tv|televis[aã]o|jornal|telejornal|treinos?|ensaios?|espet[aá]culos?|pe[cç]as?|musical|torneio|campeonato|copa|novelinha|reels|stories)(?![${L}])`),
    (m, v, d, n) => (/^(a|o)$/i.test(d) && /s$/i.test(n) && !/^(reels|stories|lives?)$/i.test(n) ? null : `${v} ${{ o: "ao", a: "à", os: "aos", as: "às" }[d.toLowerCase()]} ${n}`), "regencia", "“assistir” (ver) pede “a”: assistir ao filme, à novela"],
  // "obedecer as regras" → "obedecer às regras"
  [P(`((?:des)?obedec(?:er|e|em|emos|eu|eram|ia|iam|endo|o|a|am))\\s+(o|a|os|as)(?=\\s+\\p{L})`),
    (m, v, d) => ({ para: `${v} ${{ o: "ao", a: "à", os: "aos", as: "às" }[d.toLowerCase()]}`, conf: "media" }), "regencia", "“obedecer” pede “a”: obedecer às regras, ao pai"],
  // "prefiro mais isso" → "prefiro isso" (“preferir” já diz que é mais)
  [P(`(prefiro|prefere|preferimos|preferem|preferia|preferi|preferiu|preferir|preferiria)\\s+mais(?=\\s+(?!(?:tarde|cedo|perto|longe|devagar|r[aá]pido|vezes|dias|horas|tempo|um|uma|de|do|da)(?![${L}]))\\p{L})`),
    (m, v) => ({ para: v, conf: "media" }), "regencia", "“preferir” já quer dizer “gostar mais”: prefiro isso"],
  // "namorar com alguém" → "namorar alguém" (sugestão; "o meu namoro com ele" é substantivo)
  [P(`(?<!(?:meu|seu|nosso|o|um|esse|este|do|no|pelo)\\s)(namorar|namoro|namora|namorei|namorou|namoramos|namoram|namorava|namorando)\\s+com(?=\\s+\\p{L})`),
    (m, v) => ({ para: v, conf: "media" }), "regencia", "“namorar” não pede “com”: namorar alguém"],
  // ---- quem faz a ação vem DEPOIS do verbo: "chegou as encomendas" → "chegaram as encomendas" ----
  [new RegExp(`(^|[.!?;,:]\\s*|(?<![${L}])(?:que|quando|onde|ainda|j[aá]|n[aã]o|s[oó]|tamb[eé]m|hoje|ontem|amanh[aã]|aqui|ali|l[aá]|agora|depois|logo|ent[aã]o|sempre|nunca|se|como|mas|porque|pois|quase|finalmente)\\s+)`
    + `(existe|existia|existiu|existir[aá]|falta|faltava|faltou|faltar[aá]|sobra|sobrava|sobrou|acontece|acontecia|aconteceu|chegou|chega|chegava|come[cç]ou|come[cç]a|terminou|acabou|saiu|sai|apareceu|aparece|surgiu|surge)`
    + `\\s+(os|as|uns|umas|muitos|muitas|poucos|poucas|v[aá]rios|v[aá]rias|alguns|algumas|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|[2-9]|\\d{2,3})\\s+(\\p{Ll}{3,}s)(?![${L}])`, "giu"),
    (m, pre, v, d, n) => {
      if (!LEX || !LEX.has(n.toLowerCase()) || !/^[N?]$/.test(classeSegura(n.toLowerCase()))) return null;
      // "aparece duas vezes", "chegou dois dias depois": tempo/vezes é quanto, não quem (menos “faltam dois dias”, “sobraram 3 horas”)
      if (/^(vezes|horas|minutos|segundos|dias|semanas|meses|anos|metros|quil[oô]metros|km|reais|pontos|gols)$/i.test(n) && !/^(falt|sobr)/i.test(v)) return null;
      // números: "chega 2 dias" sim; "as 10h" nem chega aqui (precisa de palavra no plural)
      const pl = conjugar(v, "3p"); if (!pl || pl === v.toLowerCase()) return null;
      const certo = /^(exist|falt|sobr|acontec)/i.test(v);
      return { para: `${pre}${comoOriginal(v, pl)} ${d} ${n}`, conf: certo ? "alta" : "media" };
    }, "concordancia", "quem faz a ação está no plural (e vem depois): o verbo vai para o plural"],
  // "devem haver problemas" → "deve haver" (“haver” = existir não tem plural, nem o verbo que vai com ele)
  [P(`(devem|podem|v[aã]o|costumam|precisam|deveriam|poderiam|parecem)\\s+haver`), (m, v) => `${{ devem: "deve", podem: "pode", "vão": "vai", vao: "vai", costumam: "costuma", precisam: "precisa", deveriam: "deveria", poderiam: "poderia", parecem: "parece" }[v.toLowerCase()]} haver`,
    "concordancia", "com “haver” (existir) o verbo de antes fica no singular: deve haver"],
  // ---- vírgula ----
  // "Porém eu não fui" → "Porém, eu não fui" (palavra que liga as ideias no começo da frase)
  [new RegExp(`(^|[.!?]\\s+)(por[eé]m|contudo|entretanto|no\\s+entanto|todavia|al[eé]m\\s+disso|ou\\s+seja|por\\s+exemplo|ou\\s+melhor|por\\s+outro\\s+lado|sendo\\s+assim|dessa\\s+forma|desse\\s+modo|desta\\s+forma|deste\\s+modo|por\\s+fim|al[ií][aá]s|de\\s+fato|na\\s+verdade|infelizmente|felizmente|em\\s+resumo|resumindo|ali[aá]s)\\s+(?=\\p{L})`, "giu"),
    (m, pre, c) => ({ para: `${pre}${c}, `, conf: /^(al[ií][aá]s|ali[aá]s|de\s|na\s|infeliz|feliz|em\s+seguida|resumindo)/i.test(c) ? "media" : "alta" }), "pontuacao", "vírgula depois da palavra que liga as ideias (Porém, Além disso,...)"],
  // "Fui embora pois estava cansado" → ", pois" (explicação)
  [new RegExp(`(?<=[${L}]{2,})(?<!(?:^|\\s)(?:e|ou|mas|que|depois|ent[aã]o|n[aã]o))\\s+pois\\s+(?!(?:[eé]|n[aã]o|bem|sim|ent[aã]o)(?![${L}]))(?=\\p{L})`, "giu"),
    () => ", pois ", "pontuacao", "vírgula antes de “pois” (explicação)"],
  // "Sim eu vou" → "Sim, eu vou"; "Não eu não quero" → "Não, eu não quero"
  [new RegExp(`(^|[.!?]\\s+)(sim|n[aã]o)\\s+(?=(eu|ele|ela|n[oó]s|a\\s+gente|voc[eê]s?|eles|elas|obrigad[oa]|claro|senhor|senhora)(?![${L}]))`, "giu"),
    (m, pre, r, q) => ({ para: `${pre}${r}, `, conf: /^s/i.test(r) ? "alta" : "media" }), "pontuacao", "vírgula depois do “sim”/“não” da resposta"],
  // ======== 19/11/2026: regras profissionais (banco de erros comuns: _testes/corretor-banco.mjs) ========
  // ---- por que / porque / por quê ----
  // "porque você não veio?" → "Por que você não veio?" (pergunta direta)
  [new RegExp(`(^|[.!?]\\s+)(porque)(\\s[^.!?\\n]{1,140}\\?)`, "giu"), (m, pre, w, resto) => `${pre}${w[0] === "P" ? "Por que" : "por que"}${resto}`, "ortografia", "pergunta começa com “por que” (separado)"],
  // "por que?" no fim → "por quê?"; "porque?" → "por quê?"
  [P(`por\\s+que(?=\\s*[?!.]|\\s*$)`), "por quê", "acento", "no fim da frase é “por quê” (com acento)"],
  [P(`porque(?=\\s*\\?)`), "por quê", "ortografia", "no fim da pergunta é “por quê” (separado e com acento)"],
  // pergunta indireta: "me diga porque você saiu" → "por que"
  [P(`(diga|diz|me\\s+diz|me\\s+diga|explica|explique|explicar|pergunto|perguntou|perguntei|perguntar|sei|sabe|sabia|saber|entendi|entendo|entender|entende|descobrir|descobri|imagino|compreendo|compreender|n[aã]o\\s+vejo)\\s+porque(?=\\s+(?:voc[eê]s?|ele|ela|eles|elas|eu|n[oó]s|a\\s+gente|o|a|os|as|isso|tanto|n[aã]o|tem|est[aá]|foi|[eé]|ficou|demorou|sumiu|saiu|fez|faz)(?![${L}]))`),
    (m, v) => ({ para: `${v} por que`, conf: /^(sei|sabe|sabia|saber|entendi|entendo|entender|entende|imagino|compreend)/i.test(v) ? "media" : "alta" }), "ortografia", "pergunta indireta (o motivo de) é “por que”, separado"],
  // ---- hífen (nova ortografia) ----
  [P(`ex\\s+(presidente|prefeito|governador|ministro|mulher|marido|namorad[oa]|noiv[oa]|alun[oa]s?|funcion[aá]ri[oa]s?|chefe|s[oó]ci[oa]|jogador|t[eé]cnico|deputad[oa]|vereador|senador|patr[aã]o|companheir[oa]|colega|esposa|esposo|cunhad[oa]|sogr[oa]|BBB|participante|integrante|membro|diretor|dono|dona|presidi[aá]rio)(?![${L}])`), "ex-$1", "ortografia", "“ex” (antigo) vai com hífen: ex-presidente"],
  [P(`(p[oó]s|pr[eé]|pr[oó])\\s+(gradua[cç][aã]o|graduad[oa]|parto|operat[oó]ri[oa]|venda|doutorado|mestrado|guerra|natal|escola|vestibular|pago|requisito|estreia|candidat[oa]|datad[oa]|hist[oó]ria|vida|ativo|reforma|temporada|jogo|treino|carnaval|eleitoral)(?![${L}])`), (m, a, b) => {
    const pre = { pos: "pós", "pós": "pós", pre: "pré", "pré": "pré", pro: "pró", "pró": "pró" }[a.toLowerCase()];
    return `${a[0] === a[0].toUpperCase() ? pre[0].toUpperCase() + pre.slice(1) : pre}-${b}`; }, "ortografia", "pós-, pré- e pró- vão com hífen: pós-graduação"],
  [P(`(vice|rec[eé]m|sem|al[eé]m|aqu[eé]m)\\s+(presidente|prefeito|governador|campe[aã]o|campe[aã]|l[ií]der|diretor|reitor|nascid[oa]s?|casad[oa]s?|chegad[oa]s?|formad[oa]s?|contratad[oa]s?|inaugurad[oa]|terra|teto|mar|fronteiras?|vergonha)(?![${L}])`), (m, a, b) => {
    if (/^sem$/i.test(a) && !/^(terra|teto|vergonha)$/i.test(b)) return null;
    if (/^al[eé]m|aqu[eé]m$/i.test(a) && !/^(mar|fronteiras?)$/i.test(b)) return null;
    if (/^vice$/i.test(a) && /^(nascid|casad|chegad|formad|contratad|inaugur|terra|teto|mar|fronteir|vergonha)/i.test(b)) return null;
    return `${a}-${b}`; }, "ortografia", "vai com hífen: vice-presidente, recém-nascido, sem-terra"],
  [P(`boas\\s+vindas`), "boas-vindas", "ortografia", "“boas-vindas” vai com hífen"],
  [P(`(um|o|esse|este|aquele|pequeno|grande|novo|outro|houve\\s+um|teve\\s+um|foi\\s+um|uns|os|esses|alguns)\\s+mal\\s+entendid(o|os)`), "$1 mal-entendid$2", "ortografia", "o substantivo “mal-entendido” vai com hífen"],
  // ---- crase que NÃO existe ----
  [P(`(à)\\s+(p[eé]|prazo|domic[ií]lio|cavalo|partir|ela|ele|eles|elas|voc[eê]s?|mim|ti|todos|todas|cada|qualquer|algu[eé]m|ningu[eé]m|quem|esta|essa|este|esse|isso|isto|vossa)(?![${L}])`),
    (m, a, w) => `${a === "À" ? "A" : "a"} ${w}`, "crase", "não há crase antes de palavra masculina, pronome ou “partir/pé/prazo”"],
  [P(`(à)\\s+(\\p{Ll}+(?:ar|er|ir|or))`), (m, a, w) => {
    if (!LEX || !LEX.has(w) || classeSegura(w) !== "V" || /^(mulher|colher|lugar|mar|bar|jantar|par|sabor|cor|flor|dor|amor|senhor|favor|calor|valor|interior|exterior|prazer|poder|dever|lazer|ser|melhor|pior|maior|menor|beira-mar|vapor|vez)$/i.test(w)) return null;
    return `${a === "À" ? "A" : "a"} ${w}`; }, "crase", "não há crase antes de verbo (a fazer, a chover)"],
  // ---- crase que falta ----
  [P(`(fico|fica|ficamos|ficam|estou|est[aá]|estamos|est[aã]o|estarei|estaremos|seguimos|sigo|permane[cç]o|permanecemos|me\\s+coloco|nos\\s+colocamos|me\\s+ponho|deixo|deixamos)\\s+a\\s+((?:sua|tua|vossa|inteira)\\s+)?disposi[cç][aã]o`),
    (m, v, x) => `${v} à ${x || ""}disposição`, "crase", "“à disposição” leva crase"],
  [P(`(pagamento|pagar|pago|paga|pagando|paguei|pagou|pagamos|compra|comprar|comprei|compro|pre[cç]o|valor|desconto|venda|vender|vendo|vendemos|vendas)\\s+(s[oó]\\s+|somente\\s+|apenas\\s+)?a\\s+vista`),
    (m, v, s1) => `${v} ${s1 || ""}à vista`, "crase", "pagamento “à vista” leva crase"],
  [P(`(sa[ií]mos|sa[ií]|saio|sair|saiu|liguei|ligo|ligar|ligou|chego|chegou|cheguei|chegamos|volto|voltei|voltamos|voltou|trabalho|estudo|treino|abre|abrimos|abro|fecha|fechamos|vou|vamos|vai|vem|venho|durmo|acordo|janto|almo[cç]o|corro|caminho|saiu|ocorre|acontece|come[cç]a|termina|e\\s+de\\s+manh[aã]|ou)\\s+a\\s+(noite|tarde|tardinha|noitinha)(?!\\s+(?:toda|inteira|passada|anterior|de|do|da|em|que)(?![${L}]))`),
    "$1 à $2", "crase", "“à noite / à tarde” (quando) leva crase"],
  [P(`(estou|est[aá]|estamos|est[aã]o|estava|estavam|ando|anda|andamos|fico|fiquei|ficou|vivo|vive|sa[ií]|saiu|fui|foi|vou|vai|continuo|continua|sigo|segue|estar|ficar)\\s+a\\s+procura\\s+(de|do|da|dos|das)`),
    "$1 à procura $2", "crase", "“à procura de” leva crase"],
  [P(`(fiquei|fico|ficamos|ficou|fica|estou|est[aá]|estamos|est[aã]o|estava|estive|continuo|continua|sigo|seguimos)\\s+a\\s+espera(?=\\s*[.,!?]|\\s*$|\\s+(?:de|do|da|dos|das|que)(?![${L}]))`),
    "$1 à espera", "crase", "“à espera” leva crase"],
  [P(`(feito|feita|feitos|feitas|fez|fa[cç]o|fazemos|escrito|escrita|escrevi|escreveu|lavar|lavo|lavei|lavado|lavada|bordado|bordada|pintado|pintada|costurado|costurada|desenhado|desenhada|montado|montada|preenchido|preenchida)\\s+a\\s+m[aã]o(?![${L}])`),
    "$1 à mão", "crase", "“à mão” (feito a mão) leva crase"],
  [P(`a\\s+(milanesa|parmegiana|parmigiana|bolonhesa|moda\\s+(?:da|do|de|antiga))(?![${L}])`), "à $1", "crase", "“à milanesa / à moda de” leva crase"],
  [P(`(chego|chega|chegou|cheguei|come[cç]a|come[cç]ou|termina|terminou|abre|abriu|fecha|fechou|saio|sai|saiu|volto|voltou|almo[cç]o|marcado|marcada|marcamos|marquei|[eé]|foi|ser[aá])\\s+a\\s+uma\\s+(hora|da\\s+tarde|da\\s+manh[aã]|da\\s+madrugada)(?![${L}])`),
    "$1 à uma $2", "crase", "hora marcada: “à uma hora” leva crase"],
  // ---- regência e expressões ----
  [P(`nada\\s+haver`), "nada a ver", "ortografia", "é “nada a ver” (não tem relação)"],
  [P(`(tem|tinha|t[eê]m|ter|tenha|teve|tiver|teria)\\s+haver(?=\\s+com(?![${L}]))`), (m, v) => `${v} a ver`, "ortografia", "é “ter a ver com” (ter relação)"],
  [P(`ao\\s+(meu|seu|teu|nosso)\\s+ver`), "a $1 ver", "regencia", "é “a meu ver” (sem o “o”)"],
  [P(`haja\\s+visto`), "haja vista", "ortografia", "a expressão é “haja vista”"],
  [P(`sobre\\s+medida`), "sob medida", "ortografia", "é “sob medida” (sob = embaixo de)"],
  [P(`sobre\\s+(o|este|esse|aquele|um)\\s+(ponto\\s+de\\s+vista|aspecto|prisma|olhar)`), "sob $1 $2", "ortografia", "é “sob o ponto de vista”"],
  [P(`(perigo|risco|amea[cç]a|guerra|ataque|colapso|queda|morte|chegada|despejo|fal[eê]ncia)\\s+eminente`), "$1 iminente", "ortografia", "“iminente” = prestes a acontecer; “eminente” = importante"],
  [P(`(inflig(?:ir|iu|iram|e|em|imos|indo|ido|ia))\\s+(a|as|o|os)\\s+(lei|leis|regra|regras|norma|normas|regulamento|regimento|contrato|c[oó]digo|sinal|regras\\s+do|lei\\s+do)`),
    (m, v, d, n) => `${v.replace(/^inflig/i, "infring")} ${d} ${n}`, "ortografia", "desrespeitar a lei é “infringir”; “infligir” é aplicar (uma pena)"],
  [P(`(quantia|soma|valor|investimento|dinheiro|preju[ií]zo|neg[oó]cio|verba|montante|doa[cç][aã]o|lucro|fortuna)\\s+(vultuos(?:o|a|os|as))`), (m, n, v) => `${n} ${v.replace(/vultuos/i, "vultos")}`, "ortografia", "valor grande é “vultoso” (vultuoso = rosto inchado)"],
  [P(`(pass(?:ou|a|ar|am|aram|ando|ei|amos|ado)|ficou|fica)\\s+desapercebid(o|a|os|as)`), "$1 despercebid$2", "ortografia", "sem ser notado é “despercebido”"],
  [P(`ao\\s+inv[eé]s\\s+de`), (m) => ({ para: "em vez de", conf: "media" }), "estilo", "“ao invés de” é só para opostos; “em vez de” serve sempre"],
  [P(`(falar|falou|falamos|falei|fala|conversar|conversamos|conversei|discutir|discutimos|discutiu|saber|sabe|sei|informar|informou|informa|perguntar|perguntou|pergunta|pensar|penso|d[uú]vidas?|reclamar|reclamou|explicar|explicou|comentar|comentou|opini[aã]o|not[ií]cias?|informa[cç](?:[aã]o|[oõ]es))\\s+a\\s+cerca\\s+(de|do|da|dos|das|disso)`),
    "$1 acerca $2", "ortografia", "“acerca de” (junto) = sobre"],
  [P(`(?<!(?:daqui|dentro\\s+de|em)\\s)a\\s+cerca\\s+de\\s+(\\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|vinte|trinta|cem|mil)\\s+(anos|meses|dias|semanas|horas|minutos|d[eé]cadas)(?![${L}])`),
    (m, n, t) => ({ para: `há cerca de ${n} ${t}`, conf: "media" }), "ortografia", "tempo que passou: “há cerca de”"],
  [new RegExp(`(?<![${L}])(prefiro|prefere|preferimos|preferem|preferia|preferi|preferiu|preferir|preferiria)\\s+((?:\\p{L}+\\s+){1,3}?)do\\s+que\\s+(?:(o|a|os|as)\\s+)?(?=\\p{L})`, "giu"),
    (m, v, x, d) => ({ para: `${v} ${x}${d ? { o: "ao", a: "à", os: "aos", as: "às" }[d.toLowerCase()] : "a"} `, conf: "media" }), "regencia", "preferir uma coisa “a” outra (não “do que”)"],
  [P(`(?<=,)\\s*se\\s+n[aã]o\\s+(perco|chego|atraso|esque[cç]o|caio|levo|leva|apanho|apanha|perdemos|chegamos|atrasamos|perde|chega|esquece|cai)(?![${L}])`),
    (m, v) => ({ para: ` senão ${v}`, conf: "media" }), "ortografia", "“senão” = do contrário (corre, senão perde o ônibus)"],
  [P(`([eé]|era|for|sendo|s[aã]o|eram|seja|sou|somos)\\s+de\\s+menor(es)?(?![${L}])`), (m, v, p) => `${v} menor${p || ""} de idade`, "ortografia", "o certo é “menor de idade”"],
  [P(`mau[\\s-]+humorad(o|a|os|as)`), "mal-humorad$1", "ortografia", "“mal-humorado” (com L e hífen)"],
  [P(`(concert(?:ar|o|ou|ei|amos|aram|a|am|ando|ado|ada|e|em))\\s+((?:o|a|os|as|meu|minha|seu|sua|esse|essa|este|esta|um|uma)\\s+)?(carro|celular|computador|geladeira|tv|televis[aã]o|m[aá]quina|moto|telhado|cano|torneira|chuveiro|rel[oó]gio|bicicleta|bike|notebook|pc|roupa|sapato|port[aã]o|porta|janela|fog[aã]o|aparelho|defeito|erro|problema|celulares|carros|vazamento|tela)(?![${L}])`),
    (m, v, d, n) => `${v.replace(/^concert/i, (x) => (x[0] === "C" ? "Consert" : "consert"))} ${d || ""}${n}`, "ortografia", "arrumar é “consertar” (com S); “concertar” é combinar"],
  // ---- verbos ----
  // futuro do subjuntivo com quem faz a ação: "se eu ver" → "se eu vir", "se eles verem" → "se eles virem"
  [P(`(quando|se|assim\\s+que|logo\\s+que|caso|enquanto|sempre\\s+que|depois\\s+que)\\s+(eu|voc[eê]|ele|ela|a\\s+gente|n[oó]s|eles|elas|voc[eê]s)\\s+(ver|verem|vermos|fazer|fazerem|fazermos|poder|poderem|podermos|ter|terem|termos|saber|saberem|sabermos|querer|quererem|querermos|dizer|dizerem|dizermos|trazer|trazerem|trazermos|estar|estarem|estarmos|propor|proporem|pôr|porem|ir|irem|ser|serem|dar|darem|manter|manterem|caber|caberem|obter|obterem|conter|ver-me)(?![${L}])`),
    (m, c, q, v) => {
      const k = v.toLowerCase(); const plural = /(em|mos)$/.test(k) && !/^(ter|ser|ver|dar|ir)$/.test(k);
      const base = { ver: "vir", fazer: "fizer", poder: "puder", ter: "tiver", saber: "souber", querer: "quiser", dizer: "disser", trazer: "trouxer", estar: "estiver", propor: "propuser", "pôr": "puser", por: "puser", ir: "for", ser: "for", dar: "der", manter: "mantiver", caber: "couber", obter: "obtiver", conter: "contiver" };
      const raiz = k.replace(/(em|mos)$/, "").replace(/^(ver|fazer|poder|ter|saber|querer|dizer|trazer|estar|propor|ir|ser|dar|manter|caber)$/, "$1");
      const inf = base[k] ? k : Object.keys(base).find((b) => k === b + "em" || k === b + "mos" || (b === "pôr" && /^porem$/.test(k)));
      if (!inf) return null;
      let f = base[inf]; if (k.endsWith("em") && k !== inf) f += "em"; else if (k.endsWith("mos") && k !== inf) f += "mos";
      if (/^(eles|elas|voc[eê]s)$/i.test(q) && !/em$/.test(f)) f += "em";
      if (/^n[oó]s$/i.test(q) && !/mos$/.test(f)) f += "mos";
      return `${c} ${q} ${f}`; }, "concordancia", "futuro do verbo: “se eu vir”, “quando puder”, “se eles tiverem”"],
  [P(`(eu(?:\\s+n[aã]o)?)\\s+di(?![${L}])`), "$1 dei", "concordancia", "passado de “dar”: “eu dei”"],
  [P(`(eu(?:\\s+n[aã]o)?|n[aã]o)\\s+cabo(?=\\s+(?:a[ií]|aqui|l[aá]|nisso|nessa|nesse|em|no|na|mais)(?![${L}])|\\s*[.,!?]|\\s*$)`), "$1 caibo", "concordancia", "verbo caber: “eu caibo”"],
  [P(`(tinha|tenho|tem|havia|haviam|tinham|t[ií]nhamos|teria|ter|terem|tenha|tivesse|tiver|tinha\\s+n[aã]o)\\s+(chego|trago)(?![${L}])`), (m, v, p) => `${v} ${p.toLowerCase() === "chego" ? "chegado" : "trazido"}`, "concordancia", "depois de “tinha/tenho” vem “chegado/trazido”"],
  // gerundismo: "vou estar enviando" → "vou enviar"
  [P(`(vou|vai|vamos|v[aã]o|irei|iremos|ir[aá]|posso|pode|podemos|devo|deve|devemos)\\s+estar\\s+(\\p{Ll}+?)(ando|endo|indo)(?![${L}])`), (m, v, r, t) => {
    const inf = r + { ando: "ar", endo: "er", indo: "ir" }[t]; if (!LEX || !LEX.has(inf)) return null;
    return { para: `${v} ${inf}`, conf: "media" }; }, "estilo", "gerundismo: “vou enviar” é mais direto que “vou estar enviando”"],
  // ---- concordância ----
  // "Vende-se casas" → "Vendem-se casas" (a coisa vendida é quem manda no verbo)
  [P(`(\\p{L}{3,})-se\\s+((?:os|as|uns|umas|\\d+|dois|duas|tr[eê]s|v[aá]rios|v[aá]rias|muitos|muitas|alguns|algumas|novos|novas|lindos|lindas)\\s+)?(\\p{Ll}{3,}s)(?![${L}])`), (m, v, d, n) => {
    if (!d && /^(pelas|pelos|nas|nos|das|dos|aos|mais|menos|depois|antes|apenas|atrav[eé]s|somos|estamos|temos|vamos|vezes|horas|dias|anos|meses)$/i.test(n)) return null;
    if (!LEX || !LEX.has(n) || !/^[N?]$/.test(classeSegura(n)) || /^(trata|precisa|necessita|fala|vive|chega|vai|sabe|pensa|acredita|gosta|confia|depende|refere|comenta)$/i.test(v)) return null;
    const pl = conjugar(v, "3p"); if (!pl || pl === v.toLowerCase()) return null;
    return `${comoOriginal(v, pl)}-se ${d || ""}${n}`; }, "concordancia", "com “-se”, o verbo vai para o plural se a coisa está no plural (vendem-se casas)"],
  // "ficou meia preocupada" → "meio preocupada" (meio = um pouco, não muda)
  [P(`(ficou|fiquei|fica|fico|est[aá]|estou|estava|t[aá]|t[oô]|ficando|parece|parecia|anda|ando|andava|[eé]|era|sou|sentiu|sinto|deixou|deixa|achei|acho|t[aá]\\s+t[aã]o)\\s+meia\\s+(\\p{Ll}{3,})(?![${L}])`), (m, v, a) => {
    if (classeSegura(a) !== "A" && !/(ada|ida|osa|ante|ente|ica)$/.test(a)) return null;
    return `${v} meio ${a}`; }, "concordancia", "“meio” (um pouco) não muda: meio cansada"],
  [P(`([eé]|est[aá]|fica)\\s+(proibido|permitido|necess[aá]rio|obrigat[oó]rio|vedado)\\s+a\\s+(\\p{Ll}{3,})(?![${L}])`), (m, v, a, n) => {
    if (!LEX || !LEX.has(n) || classeSegura(n) !== "N" || /^(todos|todas|ele|ela|quem|voc[eê]|qualquer|menores|pessoas|crian[cç]as|clientes)$/i.test(n)) return null;
    return { para: `${v} ${a.replace(/o$/, "a")} a ${n}`, conf: "media" }; }, "concordancia", "com artigo, combina com a palavra: “é proibida a entrada”"],
  [P(`(elas|eles|n[oó]s|voc[eê]s)\\s+mesmo(?=\\s+(?:\\p{Ll}+(?:ram|ram|mos|am|em|aram|eram|iram)|fizeram|fomos|vamos|v[aã]o|sabem|disseram|fizemos)(?![${L}]))`), (m, q) => `${q} ${/^elas$/i.test(q) ? "mesmas" : "mesmos"}`, "concordancia", "“mesmo” combina com a pessoa: elas mesmas"],
  // ---- pronomes ----
  [P(`com\\s+n[oó]s(?!\\s+(?:dois|duas|tr[eê]s|quatro|cinco|todos|todas|mesmos|mesmas|pr[oó]prios|pr[oó]prias|ambos|outros|outras|sozinhos)(?![${L}]))`), "conosco", "concordancia", "“com nós” vira “conosco”"],
  [P(`(para|pra)\\s+mim\\s+(\\p{Ll}+(?:ar|er|ir|or))(?![${L}])`), (m, p, v, off, str) => {
    if (!LEX || !LEX.has(v) || classeSegura(v) !== "V") return null;
    const antes = str.slice(Math.max(0, off - 25), off);
    return { para: `${p} eu ${v}`, conf: /(dif[ií]cil|f[aá]cil|importante|bom|ruim|imposs[ií]vel|poss[ií]vel|complicado|chato|legal|[oó]timo|melhor|pior|necess[aá]rio)\s*$/i.test(antes) ? "media" : "alta" }; }, "concordancia", "antes de verbo é “para eu fazer” (quem faz é “eu”)"],
  // ---- repetição de ideia (sugestão) ----
  [P(`((?:sub|sob)\\p{Ll}*|desc\\p{Ll}*|entr(?:a|ar|o|ou|ei|amos|aram|e|em|ando)|sa[ií]|sair|saiu|sa[ií]mos|sa[ií]ram|saia|saiam|saindo|saio)\\s+(l[aá]\\s+)?(pra|para)\\s+(cima|baixo|dentro|fora)(?!\\s+(?:de|da|do|das|dos|deste|desta|dele|dela)(?![${L}]))`), (m, v, la, p, d) => {
    const ok = { cima: /^s[uo]b/i, baixo: /^desc/i, dentro: /^entr/i, fora: /^sa/i }[d.toLowerCase()];
    if (!ok.test(v)) return null;
    return { para: `${v}${la ? " " + la.trim() : ""}`, conf: "media" }; }, "estilo", "repete a ideia: “subir” já é para cima"],
  [P(`(repet\\p{Ll}*)\\s+(de\\s+novo|novamente|outra\\s+vez)`), (m, v) => ({ para: v, conf: "media" }), "estilo", "repete a ideia: “repetir” já é fazer de novo"],
  [P(`h[aá]\\s+((?:\\p{L}+\\s+)?(?:anos|meses|dias|semanas|tempos|horas|minutos|d[eé]cadas|s[eé]culos))\\s+atr[aá]s`), (m, t) => ({ para: `há ${t}`, conf: "media" }), "estilo", "“há … atrás” repete a ideia: basta “há”"],
  [P(`(surpresa)\\s+inesperada|(elo)\\s+de\\s+liga[cç][aã]o|(planos)\\s+para\\s+o\\s+futuro|(encarar)\\s+de\\s+frente|(consenso)\\s+geral|(fato)\\s+real|(monop[oó]lio)\\s+exclusivo|(acabamento)\\s+final|(multid[aã]o)\\s+de\\s+pessoas|(hemorragia)\\s+de\\s+sangue|(abertura)\\s+inaugural|(metades)\\s+iguais|(conviver)\\s+juntos?|(outra)\\s+alternativa`),
    (m, ...g) => { const w = g.slice(0, 14).find(Boolean); return { para: /^outra$/i.test(w) ? "alternativa" : w, conf: "media" }; }, "estilo", "repete a ideia (pleonasmo)"],
  [P(`(ganh(?:e|ar|ou|ei|a|am|em|amos|ando)|leve|levar|receba|receber)\\s+gr[aá]tis`), (m, v) => ({ para: v, conf: "media" }), "estilo", "“ganhar” já é de graça"],
  [P(`(cri(?:ar|ou|amos|aram|a|am|ando|e|em))\\s+(novos|novas)(?=\\s+\\p{L})`), (m, v) => ({ para: v, conf: "media" }), "estilo", "“criar” já é fazer algo novo"],
  // ---- pontuação e formatos ----
  [new RegExp(`([${L}]+),?\\s+e\\s+etc\\.{0,3}`, "giu"), "$1 etc.", "pontuacao", "“etc.” já quer dizer “e outros”: sem o “e”"],
  [new RegExp(`(?<![${L}])etc\\.{2,}`, "giu"), "etc.", "pontuacao", "“etc.” leva um ponto só"],
  [/\.{4,}/g, "...", "pontuacao", "reticências são três pontos"],
  // ---- maiúsculas: dia da semana e mês no meio da frase ----
  [new RegExp(`(?<=(?:^|[^.!?\\s]\\s)(?:na|no|de|da|do|toda|todo|nesta|neste|nessa|nesse|esta|este|essa|esse|pr[oó]xima|pr[oó]ximo|[uú]ltima|[uú]ltimo|at[eé]|At[eé]|desde|Desde|aos|[àa]s|nas|nos|pela|pelo|cada|em|e|ou|entre|m[eê]s\\s+de)\\s)(Segunda|Ter[cç]a|Quarta|Quinta|Sexta|S[aá]bado|Domingo|Janeiro|Fevereiro|Mar[cç]o|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)(-[Ff]eira)?(?![${L}])`, "gu"),
    (m, d, f, off, str) => {
      const antes = str.slice(Math.max(0, off - 40), off).trim().split(/\s+/);
      // "Sete de Setembro" (nome de rua/data comemorativa): palavra com maiúscula logo antes da preposição, fora do começo da frase
      const ant = antes[antes.length - 2], comeco = antes.length - 2 === 0 || /[.!?]$/.test(antes[antes.length - 3] || "");
      if (ant && /^\p{Lu}/u.test(ant) && !comeco) return null;
      return (d + (f || "")).toLowerCase(); }, "maiuscula", "dia da semana e mês vão com letra minúscula"],
  // concordância do verbo com a pessoa
  [P(`(?<!(?:com|entre|de|para|pra|por|sem|contra|sobre|a|em|que)\\s)eu\\s+(vai|foi|est[aá]|tem|[ée]́?|pode|quer|sabe|fica|faz|precisa|gosta|acha|quis|teve)(?![${L}])(?!\\s+que(?![${L}]))`), (m, v) => { const t = { vai: "vou", foi: "fui", "está": "estou", esta: "estou", tem: "tenho", "é": "sou", pode: "posso", quer: "quero", sabe: "sei", fica: "fico", faz: "faço", precisa: "preciso", gosta: "gosto", acha: "acho", quis: "quis", teve: "tive" }[v.toLowerCase()]; return t && t !== v.toLowerCase() ? "eu " + t : null; }, "concordancia", "o verbo combina com “eu”"],
  [P(`(?<!(?:com|entre|de|para|pra|por|sem|contra|sobre|a|em|que)\\s)(voc[eê]s|eles|elas)\\s+(vai|est[aá]|foi|[ée]|pode|quer|sabe|fica|faz|precisa|gosta|acha|teve|fez|ficou)(?![${L}])`), (m, q, v) => { const t = { vai: "vão", "está": "estão", esta: "estão", foi: "foram", "é": "são", pode: "podem", quer: "querem", sabe: "sabem", fica: "ficam", faz: "fazem", precisa: "precisam", gosta: "gostam", acha: "acham", teve: "tiveram", fez: "fizeram", ficou: "ficaram" }[v.toLowerCase()]; return t && v !== "e" ? `${q} ${t}` : null; }, "concordancia", "o verbo vai para o plural"],
  // "Foi umas situação" → "Foi uma situação" (com o verbo no singular, o artigo é que está errado)
  [P(`(foi|[eé]|era|ser[aá]|seria|virou|parece|parecia)\\s+(uns|umas)\\s+(\\p{Ll}{3,})(?![${L}-])`), (m, v, d, w) => {
    if (!LEX || /s$/.test(w) || !LEX.has(w)) return null;
    return `${v} ${d.toLowerCase() === "uns" ? "um" : "uma"} ${w}`; }, "concordancia", "o artigo combina com a palavra no singular"],
  // concordância do plural: "várias coisa" → "várias coisas", "uns estranho" → "uns estranhos"
  [P(`(os|as|dos|das|nas|meus|minhas|teus|tuas|seus|suas|nossos|nossas|esses|essas|estes|estas|aqueles|aquelas|desses|dessas|nesses|nessas|muitos|muitas|v[aá]rios|v[aá]rias|alguns|algumas|poucos|poucas|uns|umas|outros|outras|todos\\s+os|todas\\s+as|todos\\s+esses|todas\\s+essas)\\s+(\\p{Ll}{2,})(?![${L}-])`), (m, d, w) => {
    if (!LEX || /s$/.test(w) || NAO_PLURAL.has(w) || !/^[NA?]$/.test(classeSegura(w))) return null;
    if (CTX && !/^[NA]$/.test(classeSegura(w))) return null; // "eu os procurava", "aos poucos remova": não é substantivo
    if (/^(os|as|nos|nas)$/i.test(d) && /^(ama|amo|vejo|vi|levo|chama|conhece|conheço|acho|deixa|deixo|pega|pego|manda|mando|ajuda|ajudo|espera|espero)$/i.test(w)) return null;
    const pl = pluralizar(w); if (!pl) return null;
    // "as vende" (verbo) não é plural: com os/as/nos/nas e cara de verbo vira só sugestão
    const verbo = /^(os|as|nos|nas)$/i.test(d) && /[aeo]$/.test(w) && ["ar", "er", "ir"].some((t) => rank(w.slice(0, -1) + t) < 25000);
    return { para: `${d} ${pl}`, conf: verbo ? "media" : "alta" }; }, "concordancia", "o plural combina com a palavra de antes"],
  // "sem compra nada" → "sem comprar nada"
  [P(`sem\\s+(\\p{Ll}{3,}[aei])\\s+(nada|ningu[eé]m|nenhum|nenhuma|isso|aquilo|mais\\s+nada)(?![${L}])`), (m, w, o) => {
    const inf = w + "r"; if (!LEX || !LEX.has(inf)) return null;
    return { para: `sem ${inf} ${o}`, conf: /^(nada|ningu|nenhu)/i.test(o) || !LEX.has(w + "s") ? "alta" : "media" }; }, "concordancia", "depois de “sem” o verbo fica no infinitivo (sem comprar)"],
  // dupla negação com "ninguém": "ninguém não sabia" → "ninguém sabia"
  [P(`ningu[eé]m\\s+n[aã]o\\s+(\\p{L}+)`), "ninguém $1", "concordancia", "“ninguém” já nega: não precisa do “não”"],
  // "mais" no lugar de "mas" depois da vírgula: ", mais quando" → ", mas quando"
  [new RegExp(`(,\\s*)mais\\s+(quando|se|como|depois|agora|eu|ele|ela|eles|elas|voc[eê]s?|a\\s+gente|n[oó]s|n[aã]o|nunca|s[oó]|j[aá]|o\\s+que|tamb[eé]m\\s+n[aã]o|isso|aquilo|ningu[eé]m)(?![${L}])`, "giu"), (m, v, w) => `${v}mas ${w}`, "ortografia", "“mas” (porém) é diferente de “mais” (quantidade)"],
  // "agente" antes de um verbo é "a gente"
  [P(`agente\\s+(\\p{Ll}+(?:ava|ia|ou|eu|iu)|vai|foi|pode|tem|tinha|t[aá]|est[aá]|precisa|quer|fica|faz|sabe|vive|gosta|acha|chegou|saiu|n[aã]o|j[aá]|sempre|nunca|tamb[eé]m|se|s[oó])(?![${L}])`), "a gente $1", "ortografia", "“a gente” (nós) se escreve separado; “agente” é profissão"],
  // ir "no mercado" → "ao mercado"; "na praia" → "à praia"
  [P(`(vou|vai|vamos|v[aã]o|fui|foi|fomos|foram|ir|indo|iremos|chegamos|cheguei|chegou|volto|voltei|voltamos)\\s+no\\s+(mercado|supermercado|shopping|m[eé]dico|dentista|banco|centro|cinema|hospital|posto|trabalho|parque|show|est[aá]dio|restaurante|bar|sal[aã]o|a[cç]ougue|aeroporto|correio|teatro|clube|museu|consult[oó]rio|cart[oó]rio|f[oó]rum|hotel|zool[oó]gico|culto|jogo|velório|enterro|casamento|anivers[aá]rio)(?![${L}])`), "$1 ao $2", "ortografia", "quem vai, vai “a” algum lugar: “ao mercado”"],
  [P(`(vou|vai|vamos|v[aã]o|fui|foi|fomos|foram|ir|indo|iremos|chegamos|cheguei|chegou|volto|voltei|voltamos)\\s+na\\s+(praia|escola|igreja|festa|feira|farm[aá]cia|padaria|academia|faculdade|universidade|loja|cl[ií]nica|reuni[aã]o|missa|piscina|cidade|pra[cç]a|oficina|lanchonete|pizzaria|sorveteria|rodovi[aá]ria|delegacia|prefeitura|casa\\s+d[aoe])(?![${L}])`), "$1 à $2", "crase", "quem vai, vai “a” algum lugar: “à praia”"],
  // tempo: "ontem" com o verbo ir no presente → passado
  [P(`(vamos|vou|vai|v[aã]o)(?=\\s+(?:ao|aos|à|às|a|no|na|pra|para|em)\\s+(?:(?!que|porque|mas|quando)[^.!?,;\\n]){0,40}?(?<![${L}])(?:ontem|anteontem)(?![${L}]))`), (m, v) => ({ vamos: "fomos", vou: "fui", vai: "foi", "vão": "foram", vao: "foram" })[v.toLowerCase()], "concordancia", "com “ontem” o verbo vai para o passado"],
  [P(`(ontem|anteontem)\\s+((?:n[oó]s|eu|a\\s+gente|ele|ela|eles|elas)\\s+)?(vamos|vou|vai|v[aã]o)(?![${L}])`), (m, o, q, v) => `${o} ${q || ""}${({ vamos: "fomos", vou: "fui", vai: "foi", "vão": "foram", vao: "foram" })[v.toLowerCase()]}`, "concordancia", "com “ontem” o verbo vai para o passado"],
  // gênero: "uma situação muito complicado" → "complicada"
  [P(`(?<!\\p{L}(?:ar|er|ir|or|ôr)\\s)(?<!(?:de|do|da|dos|das|em|no|na|com|para|pra|por|pelo|pela|entre|sobre|a|ao)\\s)(a|uma|essa|esta|minha|sua|nossa|aquela|toda|outra|nenhuma|alguma|primeira|[uú]ltima)\\s+(\\p{Ll}{3,})\\s+((?:(?:é|est[aá]|estava|ficou|fica|foi|era|parece|parecia|t[aá]|tava|continua|est[aá]\\s+ficando)\\s+)?(?:(?:muito|bem|t[aã]o|super|bastante|meio|mais|menos|pouco)\\s+)?)(\\p{Ll}{3,}o)(?![${L}-])`), (m, d, n, i, a) => generoAdj(m, d, n, i, a, "f"), "concordancia", "o adjetivo combina com a palavra (feminino/masculino)"],
  [P(`(?<!\\p{L}(?:ar|er|ir|or|ôr)\\s)(?<!(?:de|do|da|dos|das|em|no|na|com|para|pra|por|pelo|pela|entre|sobre|a|ao)\\s)(o|um|esse|este|meu|seu|nosso|aquele|todo|outro|nenhum|algum|primeiro|[uú]ltimo)\\s+(\\p{Ll}{3,})\\s+((?:(?:é|est[aá]|estava|ficou|fica|foi|era|parece|parecia|t[aá]|tava|continua|est[aá]\\s+ficando)\\s+)?(?:(?:muito|bem|t[aã]o|super|bastante|meio|mais|menos|pouco)\\s+)?)(\\p{Ll}{3,}a)(?![${L}-])`), (m, d, n, i, a) => generoAdj(m, d, n, i, a, "m"), "concordancia", "o adjetivo combina com a palavra (feminino/masculino)"],
  // outras
  [P(`afim\\s+de`), "a fim de", "ortografia", "“a fim de” (com o objetivo de) é separado"],
  [P(`o\\s+porque(?![${L}])`), "o porquê", "ortografia", "substantivo: “o porquê”"],
  [P(`(n[aã]o\\s+sei|n[aã]o\\s+entendo|n[aã]o\\s+entendi|explica|explique|me\\s+diz|me\\s+diga)\\s+porque`), "$1 por que", "ortografia", "“por que” = por qual motivo", "media"],
  [P(`com\\s+eu(?![${L}])`), "comigo", "concordancia", "“com eu” vira “comigo”"],
  [P(`a\\s+n[ií]vel\\s+de`), "em nível de", "ortografia", "prefira “em nível de”", "media"],
  [P(`(ser|estar|ficar|est[aá]|foi)\\s+de\\s+menor`), "$1 menor de idade", "ortografia", "o certo é “menor de idade”", "media"],
  [P(`dia\\s+a\\s+dia`), null, null, null] // já está certo: não mexe
].filter((r) => r[1] !== null);


// ---------- Concordância (12/11/2026, 2ª etapa) ----------
// classe da palavra quando o modelo do contexto já carregou ("?" sem ele)
const classeSegura = (w) => (CTX && CTX.pos ? classeCtx(semAcento(String(w).toLowerCase())) : "?");
// Palavras que não vão para o plural depois de "os/as" ("os dele" está certo).
const NAO_PLURAL = new Set("dele dela deste desta desse dessa daquele daquela disso disto daquilo do da que quais qual quem mesmo cujo cuja tal mais menos tanto quanto ao à pra para de em no na com por pelo pela se me te lhe nos vos um uma dois tres três quatro cinco seis sete oito nove dez".split(" "));
// Plural de uma palavra (só se o plural existe no dicionário).
function pluralizar(w) {
  if (!LEX) return null;
  const c = [];
  if (/ão$/.test(w)) c.push(w.slice(0, -2) + "ões", w.slice(0, -2) + "ães", w + "s");
  else if (/el$/.test(w)) c.push(w.slice(0, -2) + "éis", w.slice(0, -1) + "is");
  else if (/ol$/.test(w)) c.push(w.slice(0, -2) + "óis");
  else if (/[au]l$/.test(w)) c.push(w.slice(0, -1) + "is");
  else if (/il$/.test(w)) c.push(w.slice(0, -1) + "s", w.slice(0, -2) + "eis");
  else if (/m$/.test(w)) c.push(w.slice(0, -1) + "ns");
  else if (/[rz]$/.test(w)) c.push(w + "es");
  else if (/[aeiouáéíóúâêô]$/.test(w)) c.push(w + "s");
  return c.find((x) => LEX.has(x)) || null;
}
// "uma situação muito complicado" → "complicada" (o artigo diz se é feminino ou masculino)
const NAO_ADJ = new Set("mesmo mesma muito muita pouco pouca tudo todo toda junto junta sozinho sozinha meio meia demais certo certa obrigado obrigada outro outra nada algo".split(" "));
function generoAdj(m, d, n, i, a, gen) {
  if (!LEX || NAO_ADJ.has(a) || NAO_ADJ.has(n) || /^(gente|vez|parte|hora|pessoa|coisa)$/.test(n) && a === "mesmo") return null;
  // "a" pode ser preposição ("fui a pé cansado"): só vale com palavra de cara feminina
  if (d.toLowerCase() === "a" && !/(a|ção|são|dade|gem|ez|ice|tude|ie|ã)$/.test(n)) return null;
  if (d.toLowerCase() === "o" && /(ção|dade|gem|tude)$/.test(n)) return null;
  // a palavra do meio não pode ser verbo/advérbio comum
  if (/^(foi|é|era|está|estava|ficou|fica|parece|tá|tava|que|de|do|da|em|no|na|com|e|ou|mas|não|já|só)$/.test(n)) return null;
  // sem "muito/bem/tão" no meio, só palavras com cara de adjetivo (complicado, bonito, cansada...)
  if (!i && !/(ad[oa]|id[oa]|os[oa]|iv[oa]|ic[oa]|ent[oa]|eir[oa]|ant[oa]|ut[oa]|it[oa]|in[oa]|ond[oa]|und[oa]|ec[oa]|elh[oa]|eg[oa]|ld[oa]|nh[oa])$/.test(a)) return null;
  // "o pedido chega", "cada publicação ganha": é verbo, não adjetivo
  if (["ar", "er", "ir"].some((t) => rank(a.slice(0, -1) + t) < 30000) && !/(ad[oa]|id[oa])$/.test(a)) return null;
  const outra = a.slice(0, -1) + (gen === "f" ? "a" : "o");
  if (!LEX.has(outra) || !LEX.has(a)) return null;
  // com o modelo carregado: só adjetivo/particípio ("o cereal mais cebolinha" é substantivo) e nunca gerúndio
  if (!/^[AV?]$/.test(classeSegura(a)) || /ndo$/.test(a)) return null;
  if (i && /^(mais|menos)\s/.test(i) && CTX && classeSegura(a) !== "A") return null; // "o cereal mais cebolinha"
  // palavra do meio com o gênero contrário à cara dela fica como sugestão
  const caraF = /(a|ção|são|dade|gem|tude|ã)$/.test(n), caraM = /(o|or|ão)$/.test(n) && !/(ção|são)$/.test(n);
  const conf = i && (gen === "f" ? !caraM : !caraF) ? "alta" : "media";
  return { para: `${d} ${n} ${i || ""}${outra}`, conf: i && /(muito|bem|t[aã]o|super|bastante|meio|mais|menos|pouco)\s+$/.test(i) || conf === "alta" ? conf : "media" };
}
// ---- verbo: muda a pessoa (1s eu, 1p nós, 3p eles) a partir da 3ª pessoa do singular ----
const VERBOS_IRR = {
  foi: ["fui", "fomos", "foram"], vai: ["vou", "vamos", "vão"], "é": ["sou", "somos", "são"], era: ["era", "éramos", "eram"],
  "está": ["estou", "estamos", "estão"], tem: ["tenho", "temos", "têm"], teve: ["tive", "tivemos", "tiveram"],
  fez: ["fiz", "fizemos", "fizeram"], faz: ["faço", "fazemos", "fazem"], pode: ["posso", "podemos", "podem"],
  quer: ["quero", "queremos", "querem"], quis: ["quis", "quisemos", "quiseram"], sabe: ["sei", "sabemos", "sabem"],
  vem: ["venho", "vimos", "vêm"], veio: ["vim", "viemos", "vieram"], diz: ["digo", "dizemos", "dizem"],
  disse: ["disse", "dissemos", "disseram"], viu: ["vi", "vimos", "viram"], "vê": ["vejo", "vemos", "veem"],
  deu: ["dei", "demos", "deram"], "dá": ["dou", "damos", "dão"], fosse: ["fosse", "fôssemos", "fossem"],
  ia: ["ia", "íamos", "iam"], "põe": ["ponho", "pomos", "põem"], "pôs": ["pus", "pusemos", "puseram"],
  traz: ["trago", "trazemos", "trazem"], trouxe: ["trouxe", "trouxemos", "trouxeram"], saiu: ["saí", "saímos", "saíram"],
  caiu: ["caí", "caímos", "caíram"], sai: ["saio", "saímos", "saem"], "lê": ["leio", "lemos", "leem"], houve: null, "há": null,
  "pôde": ["pude", "pudemos", "puderam"], havia: null, houve: null, haverá: null, haveria: null, desde: null, ora: null, presente: null, soube: ["soube", "soubemos", "souberam"], ficou: ["fiquei", "ficamos", "ficaram"],
};
const PESSOA_I = { "1s": 0, "1p": 1, "3p": 2 };
// terminação da 3ª do singular → [eu, nós, eles] (a forma nova precisa existir no dicionário)
const TERMINACOES = [
  ["ava", ["ava"], ["ávamos"], ["avam"]], ["ia", ["ia"], ["íamos"], ["iam"]],
  ["ou", ["ei"], ["amos"], ["aram"]], ["eu", ["i"], ["emos"], ["eram"]], ["iu", ["i"], ["imos"], ["iram"]],
  ["asse", ["asse"], ["ássemos"], ["assem"]], ["esse", ["esse"], ["éssemos", "êssemos"], ["essem"]], ["isse", ["isse"], ["íssemos"], ["issem"]],
  ["ará", ["arei"], ["aremos"], ["arão"]], ["erá", ["erei"], ["eremos"], ["erão"]], ["irá", ["irei"], ["iremos"], ["irão"]],
  ["a", ["o"], ["amos"], ["am"], "pres"], ["e", ["o"], ["emos", "imos"], ["em"], "pres"],
];
const sem1s = (stem, fim) => fim === "ei" ? stem.replace(/c$/, "qu").replace(/g$/, "gu").replace(/ç$/, "c") + fim : stem + fim;
function conjugar(w, pessoa, tempo) {
  if (!LEX) return null;
  const k = w.toLowerCase(), i = PESSOA_I[pessoa];
  if (Object.prototype.hasOwnProperty.call(VERBOS_IRR, k)) { const f = VERBOS_IRR[k]; return f ? f[i] : null; }
  if (!LEX.has(k)) return null;
  for (const [fim, a, b, c, pres] of TERMINACOES) {
    if (!k.endsWith(fim) || k.length < fim.length + 2) continue;
    const stem = k.slice(0, -fim.length);
    // presente: só verbos de verdade (o infinitivo existe)
    if (pres && !["ar", "er", "ir"].some((t) => LEX.has(stem + t))) continue;
    // verbo coordenado no presente depois de um verbo no passado ("fomos ao mercado e compra" → "compramos")
    if (pres && tempo === "passado" && fim === "a") { const p = [stem.replace(/c$/, "qu").replace(/g$/, "gu") + "ei", stem + "amos", stem + "aram"][i]; if (LEX.has(p)) return p; }
    const opc = [a, b, c][i].map((f) => i === 0 ? sem1s(stem, f) : stem + f);
    const ok = opc.find((x) => LEX.has(x));
    if (ok) return ok;
  }
  return null;
}
const TEMPO_PASSADO = /(ou|eu|iu|ei|i|aram|eram|iram)$|^(foi|fui|fomos|foram|fez|fiz|fizemos|teve|tive|tivemos|veio|vim|viemos|disse|deu|dei|demos)$/;
const PULA_ADV = new Set("não nao já ja também tambem ainda nunca sempre tudo todos todas só so me te se lhe lhes nos vos mesmo então entao logo lá aqui aí bem quase".split(" "));
const PREPOS = new Set("pra para de com por sem em entre contra até ate sobre pelo pela a ao do da dos das no na".split(" "));
const DET_PL = new Set("os as meus minhas teus tuas seus suas nossos nossas esses essas estes estas aqueles aquelas muitos muitas vários várias alguns algumas poucos poucas uns umas todos todas outros outras".split(" "));
const PARA_FRASE = new Set("que quando porque se como onde enquanto mas e ou pois quem cujo".split(" "));
const VERBO_ANTES = /(ndo|ar|er|ir|ou|ei|eu|iu|ava|ia|amos|emos|imos|am|em)$/;
function concordarSujeito(s, anotar) {
  if (!LEX) return s;
  const toks = [...s.matchAll(/\p{L}+(?:-\p{L}+)*/gu)].map((m) => ({ w: m[0], i: m.index, f: m.index + m[0].length }));
  const troca = []; // {i, f, para}
  const entre = (a, b) => s.slice(toks[a].f, toks[b].i); // o que há entre dois tokens
  const corta = (a, b) => /[.!?;:\n()"“”—–]/.test(entre(a, b));
  const lc = (t) => t.w.toLowerCase();
  const mudar = (j, pessoa, conf, tempo, motivo) => {
    const t = toks[j], para0 = conjugar(t.w, pessoa, tempo);
    if (!para0 || para0 === lc(t)) return false;
    const para = comoOriginal(t.w, para0);
    if (troca.some((x) => x.i === t.i)) return true;
    if (anotar(t.w, para, "concordancia", motivo, conf)) { troca.push({ i: t.i, f: t.f, para }); t.w = para; }
    return true;
  };
  for (let a = 0; a < toks.length; a++) {
    const w = lc(toks[a]), ant = a > 0 && !corta(a - 1, a) ? lc(toks[a - 1]) : "";
    let pessoa = null, fimSuj = a, conf = "alta", motivo = "o verbo combina com quem faz a ação";
    if (PREPOS.has(ant)) continue; // "pra nós", "com eles": não é quem faz a ação
    // "para que eu possa", "se eu faça": depois de "que/se/caso/embora" o verbo pode estar no subjuntivo (possa, faça, seja)
    if (w === "nós" || w === "nois" || w === "nóis") pessoa = "1p";
    else if (w === "eu") pessoa = "1s";
    else if (/^(eles|elas|vocês|voces)$/.test(w)) pessoa = "3p";
    else if (DET_PL.has(w) && a + 1 < toks.length && !corta(a, a + 1) && !/^(os|as)$/.test(lc(toks[a + 1]))) {
      // "as pessoas estava" / "os ônibus não passava": artigo no plural + palavra = quem faz a ação
      const n = lc(toks[a + 1]);
      if (NAO_PLURAL.has(n) || PULA_ADV.has(n) || /^(vezes|que|quais|segundos|minutos|horas|dias|semanas|meses|anos|vez|lugares|momentos|instantes)$/.test(n)) continue;
      if (/^(outros|outras|alguns|algumas|poucos|poucas|muitos|muitas|v[aá]rios|v[aá]rias|todos|todas)$/.test(w) && ant && !/^(e|mas|que|quando|se|porque)$/.test(ant)) continue;
      if (/^(os|as)$/.test(w) && !/s$/.test(n) && !pluralizar(n)) continue; // "as" pronome: "eu as vejo"
      if (/^(todos|todas)$/.test(w) && /^(os|as)$/.test(n)) continue;
      pessoa = "3p"; fimSuj = a + 1; motivo = "o verbo vai para o plural (quem faz a ação está no plural)";
      if (ant && VERBO_ANTES.test(ant) && !PARA_FRASE.has(ant)) conf = "media";
      if (ant === "e" || ant === "ou") conf = "media"; // "a distância entre a superfície e os reservatórios pode"
    }
    if (!pessoa) continue;
    // primeiro verbo depois de quem faz a ação (pulando "não", "já", "me"...)
    let j = fimSuj + 1;
    while (j < toks.length && !corta(j - 1, j) && !/,/.test(entre(j - 1, j)) && PULA_ADV.has(lc(toks[j])) && j - fimSuj <= 3) j++;
    if (j >= toks.length || corta(j - 1, j) || /,/.test(entre(j - 1, j))) continue;
    const v = lc(toks[j]);
    if (PARA_FRASE.has(v) || PREPOS.has(v)) continue;
    if (pessoa === "1s" && /^(que|se|caso|embora|talvez|quando|enquanto)$/.test(ant) && /[ae]$/.test(v)) continue;
    // "eu é que", "os outros é que": construção com "é que" não muda
    if (/^(é|foi|era|seria|será)$/.test(v) && j + 1 < toks.length && lc(toks[j + 1]) === "que") continue;
    // com artigo + palavra, o verbo só muda se ele for verbo mesmo (classe) e "é/era" só como sugestão
    if (pessoa === "3p" && fimSuj > a && !/^[VX?]$/.test(classeSegura(v)) && !VERBOS_IRR[v]) continue;
    if (pessoa === "3p" && fimSuj > a && /^(é|foi|era)$/.test(v)) conf = "media";
    const mudou = mudar(j, pessoa, conf, null, motivo);
    const ref = toks[j].w.toLowerCase();
    // é verbo? (mudou agora ou já estava certo na pessoa)
    const ehVerbo = mudou || /(mos|am|em|ou|ei|o|i|ão)$/.test(ref);
    if (!ehVerbo || conf !== "alta") continue;
    const tempo = TEMPO_PASSADO.test(ref) ? "passado" : null;
    // mesma frase, outra oração sem sujeito: "Nós fomos ..., mas quando chegou lá" → "chegamos" (sugestão)
    if (pessoa !== "3p") for (let k = j + 1; k < toks.length - 1 && k - j < 25; k++) {
      if (/[.!?;\n]/.test(entre(k - 1, k))) break;
      const x = lc(toks[k]);
      if (/^(eu|n[oó]s|ele|ela|eles|elas|voc[eê]s?|gente)$/.test(x)) break;
      if (!/^(quando|assim|depois|enquanto)$/.test(x)) continue;
      let q = k + 1; if (/^(assim|depois)$/.test(x) && lc(toks[q]) === "que") q++;
      if (q < toks.length && /(ou|eu|iu|ava|ia)$/.test(lc(toks[q])) && !corta(q - 1, q)) mudar(q, pessoa, "media", null, "parece que quem faz a ação ainda é o mesmo: confira");
      break;
    }
    // verbos ligados por "e" sem outro sujeito: "Nós fomos ao mercado e compra" → "compramos"
    for (let k = j + 1, n = 0; k < toks.length && n < 10; k++, n++) {
      if (corta(k - 1, k) || /,/.test(entre(k - 1, k))) break;
      const x = lc(toks[k]);
      if (x === "nós" || x === "eu" || x === "ele" || x === "ela" || x === "eles" || x === "elas" || DET_PL.has(x) && k > j + 1 && lc(toks[k - 1]) === "e") break;
      if (PARA_FRASE.has(x) && x !== "e") break;
      if (x !== "e") continue;
      let q = k + 1;
      while (q < toks.length && !corta(q - 1, q) && PULA_ADV.has(lc(toks[q])) && q - k <= 2) q++;
      if (q >= toks.length || corta(q - 1, q)) break;
      // no presente, o verbo coordenado precisa vir com o que se compra/faz (artigo, número, pronome...)
      const depois = q + 1 < toks.length && !corta(q, q + 1) ? lc(toks[q + 1]) : "";
      const vq = lc(toks[q]);
      if (PARA_FRASE.has(vq) || PREPOS.has(vq) || vq.length < 3) break;
      const pres = /[ae]$/.test(vq) && !/(ava|ia|asse|esse|isse)$/.test(vq);
      if (pres && !(DET_PL.has(depois) || /^(o|a|um|uma|uns|umas|mais|muito|muita|muitos|tudo|nada|isso|aquilo|ele|ela|eles|elas|embora|logo|lá|aqui|comida|pão)$/.test(depois))) break;
      mudar(q, pessoa, "alta", tempo, "o verbo ligado por “e” combina com quem faz a ação");
      break;
    }
  }
  if (!troca.length) return s;
  troca.sort((x, y) => y.i - x.i);
  for (const t of troca) s = s.slice(0, t.i) + t.para + s.slice(t.f);
  return s;
}

// ---------- Utilidades ----------
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
// Mantém maiúsculas como estavam: "Vc" → "Você", "VC" → "VOCÊ".
function comoOriginal(orig, nova) {
  if (orig.length > 1 && orig === orig.toUpperCase() && /\p{Lu}/u.test(orig)) return nova.toUpperCase();
  if (/^\p{Lu}/u.test(orig)) return nova.charAt(0).toUpperCase() + nova.slice(1);
  return nova;
}
// Partes do texto que NÃO são mexidas: links, e-mails, @menções, #hashtags, números com ponto/vírgula/hora, código.
const PROTEGIDO = /(https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+|[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:com|br|net|org|app|io|gov|edu|me|dev|info|online|site|store|shop)(?:\.[a-z]{2})?(?:\/\S*)?(?![\p{L}])|[@#][\p{L}\p{N}_.]+|\b\d[\d.,:/-]*\d\b|`[^`]*`)/gu;
function emPartes(texto) {
  const partes = []; let i = 0;
  for (const m of texto.matchAll(PROTEGIDO)) {
    if (m.index > i) partes.push({ t: texto.slice(i, m.index) });
    partes.push({ t: m[0], fixo: true }); i = m.index + m[0].length;
  }
  if (i < texto.length) partes.push({ t: texto.slice(i) });
  return partes;
}
const PALAVRA = /[\p{L}]+(?:-[\p{L}]+)*/gu;

// =====================================================
// Dicionário (12/11/2026): corretor/lexico2.txt (formato compacto desde 19/11/2026; o legível fica em
// scripts/corretor/fonte/lexico.txt) = palavras do português do Brasil (dicionário VERO do LibreOffice,
// LGPL/MPL) na ordem de uso (lista de frequência FrequencyWords, CC-BY-SA 4.0) — gerado por scripts/corretor/gerar-lexico.mjs.
// Com ele, QUALQUER palavra que não existe é encontrada e a sugestão vem por: acento (sem acento → com acento), som
// (como se fala: ss/ç/sc, x/ch, s/z, g/j, l/u no fim da sílaba, ei/e, ou/o, n/m antes de consoante...) e digitação
// (uma letra trocada, faltando, sobrando ou invertida; teclas vizinhas pesam a favor). Carrega só quando o corretor é usado.
// =====================================================
let LEX = null, ACC = null, FON = null, carregando = null;
const PESSOAL = new Set();
// Palavras estrangeiras e da internet que se usam assim no Brasil (o dicionário formal não traz): não são erro.
const ESTRANGEIRAS = new Set(("pet pets petshop cookie cookies e-mail e-mails email emails google instagram whatsapp facebook tiktok youtube " +
  "twitter iphone android wi-fi wifi internet online offline delivery app apps site sites link links post posts story stories feed reels " +
  "chat chats emoji emojis print prints selfie selfies login logout show shows top fitness design designer marketing freelancer freela " +
  "freelas home office back front history art location smartphone notebook mouse play playlist spotify netflix uber ifood shopping outlet " +
  "milkshake brownie brownies cupcake cupcakes sushi temaki yakisoba hot dog tattoo piercing nail lash brow makeup skincare crossfit pilates " +
  "yoga coach coaching startup startups mei cnpj cpf rg cnh pix qr code ok okay hashtag hashtags stalker crush match like likes follow " +
  "web download upload backup bug bugs layout feedback deadline briefing job jobs freelancers drive pen pendrive bluetooth smart tv " +
  "check-in checkin check-out checkout self service drink drinks happy hour fast food food truck trucks gamer games game streaming live lives " +
  "reel reels flash nº nºs vs etc " +
  // eletrônicos, marcas e termos técnicos (avaliações de produtos: "hd", "hdmi", "full hd", "xbox" não são erro)
  "hd hdmi full fullhd pc pcs lg cce www wii xbox playstation ps2 ps3 ps4 ps5 slim vimeo plug pip rca usb dvd dvds led leds lcd plasma " +
  "blu-ray bluray samsung sony philips motorola nokia apple ipad ipod kindle touch touchscreen screen display zoom player players gps " +
  "tablet tablets netbook ultrabook headphone headphones headset wireless stereo dolby surround subwoofer home theater bass sd microsd " +
  "mpg mpeg divx xvid avi mkv jpg jpeg png pdf mp3 mp4 router modem ram ssd hdd cpu gpu chip chips intel amd nvidia windows linux mac " +
  "macbook dell lenovo acer asus positivo semp toshiba panasonic jbl multilaser britania mondial arno walita electrolux brastemp consul " +
  "ok ok's ps sms driver drivers magic dlna smartv software hardware firmware widget widgets bike bikes premium plus pro di").split(" "));
const CHAVE_PESSOAL = "hf-dicionario";
try { (JSON.parse(localStorage.getItem(CHAVE_PESSOAL) || "[]") || []).forEach((w) => PESSOAL.add(w)); } catch {}
export const lexicoPronto = () => !!LEX;
export function definirLexico(texto) {
  LEX = new Map(); ACC = null; FON = null;
  texto = String(texto);
  if (texto.startsWith("#hflex2")) return lexicoCompacto(texto);
  texto.split("\n").forEach((w, i) => { w = w.trim(); if (w && !LEX.has(w)) LEX.set(w, i); });
  return LEX.size;
}
// Formato compacto (19/11/2026, scripts/corretor/compactar.py): palavras em ordem alfabética, cada linha começa com um
// caractere que diz quantas letras repete da anterior; no fim, a faixa de uso de cada palavra (posição ≈ q^faixa).
// A posição volta como número com vírgula: o meio da faixa + um desempate pela ordem alfabética (nunca dá empate).
function lexicoCompacto(texto) {
  const linhas = texto.split("\n"), q = parseFloat(linhas[0].split(" ")[1]) || 1.05, lq = Math.log(q);
  const fim = linhas.indexOf("#faixas"), faixas = linhas[fim + 1] || "", n = fim - 1;
  let prev = "";
  for (let i = 0; i < n; i++) {
    const l = linhas[i + 1], p = l.charCodeAt(0) - 48, w = prev.slice(0, p) + l.slice(1);
    const f = faixas.charCodeAt(i) - 48;
    LEX.set(w, Math.exp((f + 0.5) * lq) - 1 + i / (n * 10)); prev = w;
  }
  const t = linhas.indexOf("#topo"); // as mais usadas na ordem exata
  if (t > 0) for (let i = t + 1, r = 0; i < linhas.length; i++) if (linhas[i]) LEX.set(linhas[i], r++);
  return LEX.size;
}
export function carregarLexico(url = new URL("./corretor/lexico2.txt?v=1", import.meta.url).href) {
  if (LEX) { carregarContexto(); return Promise.resolve(true); }
  if (!carregando) carregando = Promise.all([
    fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error("lexico")))).then((t) => { definirLexico(t); return true; }),
    carregarContexto()
  ]).then(([ok]) => ok).catch(() => { carregando = null; return false; });
  return carregando;
}

// =====================================================
// Corretor que aprende (12/11/2026): palavras que se confundem (e/é, mas/mais, mal/mau, esta/está, nos/nós, por/pôr...)
// são escolhidas pelas palavras em volta, com contagens tiradas de 2,5 milhões de palavras de textos em português
// (corretor/contexto3.json + pesos3.bin desde 19/11/2026: as pistas viram números por hashing, sem vocabulário; a fonte é
// scripts/corretor/fonte/contexto.json, gerada por gerar-contexto.py e separada por compactar.py). Cada grupo tem a margem de confiança medida
// em frases que o modelo não viu no treino: só corrige sozinho onde acertou 99% delas; entre 93% e 99% vira sugestão.
// E aprende com a pessoa: correção que ela desliga várias vezes deixa de vir ligada (e depois some); sugestão que ela
// liga várias vezes passa a vir ligada (aprenderEscolhas, guardado só no aparelho).
// =====================================================
let CTX = null, carregandoCtx = null;
export const contextoPronto = () => !!CTX;
export function definirContexto(dados, pesos) {
  const d = typeof dados === "string" ? JSON.parse(dados) : dados;
  if (d.v === 5) {
    // v5: pesos numa tabela de bytes (pesos3.bin), posição = hash da pista. Também aceita a tabela em base64 (arquivo fonte).
    if (pesos) d.tab = new Int8Array(pesos.buffer ? pesos.buffer.slice(pesos.byteOffset, pesos.byteOffset + pesos.byteLength) : pesos);
    else if (d.tabela) { const b = atob(d.tabela); d.tab = new Int8Array(b.length); for (let i = 0; i < b.length; i++) d.tab[i] = (b.charCodeAt(i) << 24) >> 24; delete d.tabela; }
  } else if (d.v >= 4) d.m = pesosCompactos(d.m);
  const membro = new Map(), pos = new Map();
  (d.grupos || []).forEach((g, gi) => g.forEach((w) => membro.set(w, gi)));
  String(d.pos || "").split(",").forEach((x) => { const i = x.indexOf("="); if (i > 0) pos.set(x.slice(0, i), x.slice(i + 1)); });
  CTX = { ...d, membro, pos };
}
// Pesos no formato compacto (v4, compactar.py): 2 formas por grupo, o peso da 2ª é o da 1ª com o sinal trocado e vem em
// centésimos; as pistas vêm juntas por tipo ("l": "a|de|o", "w": {"l": "12,-40,3"}). Volta ao formato de sempre.
function pesosCompactos(m) {
  const out = {};
  for (const [g, v] of Object.entries(m)) {
    const w = {};
    for (const [p, lista] of Object.entries(v.f)) {
      const ks = lista.split("|"), xs = String(v.w[p]).split(",");
      ks.forEach((k, i) => { const x = Number(xs[i]) / 100; w[p + ":" + k] = [x, -x]; });
    }
    out[g] = { c: v.c, b: [v.b, -v.b], w };
  }
  return out;
}
export function carregarContexto(url = new URL("./corretor/contexto3.json?v=2", import.meta.url).href,
  urlPesos = new URL("./corretor/pesos3.bin?v=2", import.meta.url).href) {
  if (CTX) return Promise.resolve(true);
  if (!carregandoCtx) carregandoCtx = Promise.all([
    fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error("contexto")))),
    fetch(urlPesos).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("pesos"))))
  ]).then(([j, b]) => { definirContexto(j, new Uint8Array(b)); return true; })
    .catch(() => { carregandoCtx = null; return false; });
  return carregandoCtx;
}
// FNV-1a de 32 bits sobre os bytes UTF-8 (o mesmo do gerar-contexto.py): a pista vira o número da posição na tabela
const UTF8 = new TextEncoder();
function fnv(s) {
  let h = 0x811c9dc5;
  for (const b of UTF8.encode(s)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
const TOK_CTX = /[\p{L}]+(?:-[\p{L}]+)*|[.,;:!?]/gu;
// classe da palavra (N substantivo, A adjetivo, V verbo, X auxiliar, R advérbio, D determinante, P pronome, E preposição,
// C/S conjunção, M número, U pontuação, ? não sei) — igual ao gerar-contexto.py
function classeCtx(w) {
  const c = CTX.pos.get(w); if (c) return c;
  if (/^[.,;:!?]$/.test(w)) return "U";
  if (/mente$/.test(w)) return "R";
  if (/(cao|coes|dade|dades|gem|ismo|ista|ncia|ncias|mento|mentos)$/.test(w)) return "N";
  if (/(ar|er|ir|ando|endo|indo)$/.test(w)) return "V";
  if (/(ado|ada|ados|adas|ido|ida|idos|idas|oso|osa|ivel|avel|ivo|iva|ico|ica)$/.test(w)) return "A";
  return "?";
}
// probabilidade de cada forma do grupo (regressão logística treinada no gerar-contexto.py)
function probCtx(gi, toks, i) {
  const g = CTX.grupos[gi], m = CTX.m[g[0]];
  const at = (j) => (j >= 0 && j < toks.length ? semAcento(toks[j].w.toLowerCase()) : "<>");
  const cl = (j) => (j >= 0 && j < toks.length ? classeCtx(at(j)) : "<");
  const fs = ["l:" + at(i - 1), "r:" + at(i + 1), "ll:" + at(i - 2) + "_" + at(i - 1), "rr:" + at(i + 1) + "_" + at(i + 2),
    "lp:" + cl(i - 1), "rp:" + cl(i + 1), "pp:" + cl(i - 1) + "_" + cl(i + 1), "rq:" + cl(i + 1) + "_" + cl(i + 2),
    "lq:" + cl(i - 2) + "_" + cl(i - 1), "rs:" + at(i + 1).slice(-3), "ls:" + at(i - 1).slice(-3)];
  if (CTX.tab) {
    // v5: soma o peso de cada pista na tabela do grupo (peso da 1ª forma; a 2ª é o mesmo com o sinal trocado)
    const mask = (1 << m.bits) - 1;
    let s = m.b;
    for (const f of fs) s += CTX.tab[m.off + (fnv(f) & mask)] / m.s;
    const p1 = 1 / (1 + Math.exp(-2 * s));
    return { [m.c[0]]: p1, [m.c[1]]: 1 - p1 };
  }
  const z = m.b.slice();
  for (const f of fs) { const w = m.w[f]; if (w) for (let c = 0; c < z.length; c++) z[c] += w[c]; }
  const mx = Math.max(...z), e = z.map((x) => Math.exp(x - mx)), soma = e.reduce((a, x) => a + x, 0);
  const p = {}; m.c.forEach((c, j) => { p[c] = e[j] / soma; });
  return p;
}
function corrigirPeloContexto(s, anotar) {
  if (!CTX) return s;
  const toks = [...s.matchAll(TOK_CTX)].map((m) => ({ w: m[0], i: m.index }));
  const troca = [];
  toks.forEach((t, i) => {
    const k = t.w.toLowerCase();
    if (k !== semAcento(k) || !CTX.membro.has(k)) return; // só o que foi escrito sem acento (ou a outra palavra do par)
    if (/\p{Lu}/u.test(t.w) && i > 0 && !/[.!?]/.test(toks[i - 1].w)) return; // nome próprio no meio da frase
    const gi = CTX.membro.get(k), g = CTX.grupos[gi], lim = CTX.lim[g[0]];
    if (!lim || !CTX.m?.[g[0]]) return;
    const p = probCtx(gi, toks, i);
    const melhor = g.filter((c) => c !== k).sort((a, b) => (p[b] || 0) - (p[a] || 0))[0];
    const pm = p[melhor] || 0;
    // limites medidos fora do treino (1 = nunca), com piso: só muda sozinho com 90%+ e sugere com 70%+
    const conf = lim[0] < 1 && pm > Math.max(lim[0], 0.9) ? "alta" : lim[1] < 1 && pm > Math.max(lim[1], 0.7) ? "media" : null;
    if (!conf) return;
    if (conf === "media" && naoSugerir(k, melhor, toks, i)) return;
    const para = comoOriginal(t.w, melhor);
    const de = (i > 0 && !/[.,;:!?]/.test(toks[i - 1].w) ? toks[i - 1].w + " " : "") + t.w; // um pouco do contexto na lista
    const deAte = de === t.w ? para : de.slice(0, de.length - t.w.length) + para;
    if (anotar(de, deAte, MAIS_ACENTO.has(k) ? "acento" : "ortografia", "escolhida pelas palavras em volta", conf)) troca.push({ i: t.i, f: t.i + t.w.length, para });
  });
  // padrões com a classe das palavras (as árvores sintáticas dizem quem é adjetivo, substantivo...)
  const cls = (j) => (j >= 0 && j < toks.length ? classeCtx(semAcento(toks[j].w.toLowerCase())) : "<");
  const lw = (j) => (j >= 0 && j < toks.length ? semAcento(toks[j].w.toLowerCase()) : "");
  const cru = (j) => (j >= 0 && j < toks.length ? toks[j].w.toLowerCase() : "");
  // depois do adjetivo a frase acaba (ou vem pontuação/uma palavra que fecha), senão é lista ("maior que a ponta e menor que")
  const fecha = (j) => j >= toks.length || /^[.,;:!?]$/.test(toks[j].w) || /^(mas|porque|pq|entao|demais|hoje|agora|tambem|sim|mesmo|né|ne|kk+|rs)$/.test(lw(j));
  const DET = /^(o|a|os|as|um|uma|meu|minha|seu|sua|nosso|nossa|esse|essa|este|aquele|aquela|teu|tua)$/;
  const ADV_E = /^(hoje|amanha|agora|aqui|ali|longe|perto|cedo|tarde|demais|verdade|assim|facil|dificil|caro|barato|top|otimo|otima|lindo|linda)$/;
  toks.forEach((t, i) => {
    if (troca.some((x) => x.i === t.i)) return;
    const k = t.w.toLowerCase();
    let para = null, motivo = "";
    // "o preço e alto", "a vida e bela", "o jogo e hoje" → é (artigo + palavra + e + adjetivo/advérbio no fim da frase)
    if (k === "e" && DET.test(cru(i - 2)) && cls(i - 1) === "N" && (cls(i + 1) === "A" || ADV_E.test(lw(i + 1))) && fecha(i + 2)) { para = "é"; motivo = "“é” do verbo ser leva acento"; }
    // "já e tarde" → já é
    else if (k === "e" && lw(i - 1) === "ja" && /^(tarde|cedo|hora|noite|dia|meio|domingo|sabado|sexta|outro|outra|amanha)$/.test(lw(i + 1))) { para = "é"; motivo = "“é” do verbo ser leva acento"; }
    // "o dia esta lindo", "a casa esta limpa" → está (esta + adjetivo/advérbio que não vem antes de um substantivo)
    else if (k === "esta" && i > 0 && !/^(que|qual|quem|como|onde|se)$/.test(lw(i - 1)) && (cls(i - 1) === "P" || cls(i - 1) === "N" && cls(i - 2) === "D") && (/^[AR]$/.test(cls(i + 1)) || /(ndo|ado|ada|ido|ida)$/.test(lw(i + 1))) && !/^[NA]$/.test(cls(i + 2))) { para = "está"; motivo = "“está” do verbo estar leva acento"; }
    if (!para) return;
    const novo = comoOriginal(t.w, para);
    const de = (i > 0 ? toks[i - 1].w + " " : "") + t.w, deAte = (i > 0 ? toks[i - 1].w + " " : "") + novo;
    if (anotar(de, deAte, "acento", motivo)) troca.push({ i: t.i, f: t.i + t.w.length, para: novo });
  });
  for (const t of troca.sort((a, b) => b.i - a.i)) s = s.slice(0, t.i) + t.para + s.slice(t.f);
  return s;
}
// Sugestões (conf "media") que o modelo erra em texto bem escrito: listas com "e", verbo depois de "não", "mais" + substantivo.
// Medido em _testes/corretor-paginas.mjs (frases certas do site) e _testes/corretor-prova.mjs (erros reais).
const DET_LISTA = /^(o|a|os|as|um|uma|uns|umas|quem|seu|sua|seus|suas|meu|minha|meus|minhas|nosso|nossa|outro|outra)$/;
function naoSugerir(k, para, toks, i) {
  const w = (j) => (j >= 0 && j < toks.length ? semAcento(toks[j].w.toLowerCase()) : "");
  const c = (j) => (j >= 0 && j < toks.length ? classeCtx(w(j)) : "<");
  if (k === "e" && para === "é") {
    const dep = w(i + 1), ant = w(i - 1);
    // "você e a pessoa", "você e quem votou": quem faz a ação são os dois
    if (/^(voce|voces|eu|ele|ela|eles|elas|nos)$/.test(ant) && DET_LISTA.test(dep)) return true;
    // "o plano e o período", "um documento e uma selfie", "a senha atual e a nova": dois itens com artigo
    if (DET_LISTA.test(dep) && [i - 2, i - 3].some((j) => /^(o|a|os|as|um|uma|seu|sua|meu|minha|esse|essa|cada|do|da|dos|das|no|na|nos|nas|pelo|pela|ao|num|numa)$/.test(w(j)))) return true;
    // "X, Y e Z" (enumeração): vírgula pouco antes, sem verbo no meio
    if (i > 0 && !/^[.,;:!?]$/.test(toks[i - 1].w)) for (let j = i - 2; j >= Math.max(0, i - 4); j--) { if (toks[j].w === ",") return true; if (/^[.;:!?]$/.test(toks[j].w) || c(j) === "V") break; }
    // "agora e edite", "e muito mais": o que vem depois é verbo no imperativo/presente ou "muito mais"
    if (dep === "muito" && w(i + 2) === "mais") return true;
    if (c(i + 1) === "V" && !/(ado|ada|ido|ida|ados|adas|idos|idas)$/.test(dep)) return true;
    // "agora e edite", "e mande": forma do verbo (editar → edite) logo depois do "e"
    if (/e$/.test(dep) && dep.length >= 4 && c(i + 1) !== "A" && LEX && LEX.has(dep.slice(0, -1) + "ar")) return true;
  }
  // "não publica, não avalia", "mensagens, publica, avalia": verbo, não "pública"
  if (k === "publica" && (/^(nao|nunca|ja|tambem|se|me|ninguem|quem|so)$/.test(w(i - 1)) || toks[i - 1]?.w === "," || toks[i + 1]?.w === ",")) return true;
  // "nos vemos amanhã", "nos falamos": “nos” é o pronome (um ao outro), não “nós”
  if (k === "nos" && /^(vemos|falamos|encontramos|conhecemos|vimos|despedimos|beijamos|abra[cç]amos|casamos|mudamos|sentimos|preocupamos|divertimos|esfor[cç]amos|cuidamos|cuidemos|vemos|falaremos|veremos|encontraremos|reunimos|reuniremos|juntamos|amamos|entendemos)$/.test(w(i + 1))) return true;
  // "mais corridas", "mais fotos": quantidade, não "mas"
  if (k === "mais" && para === "mas" && (c(i + 1) === "N" || c(i + 1) === "A")) return true;
  return false;
}
const MAIS_ACENTO = new Set("e as esta nos pais da ai por pode publico duvida historia seria ate la le numero musica ultimo ultima publica mes manha".split(" "));

// ---- aprende com a pessoa (no aparelho) ----
const CHAVE_GOSTO = "hf-corretor-gosto";
let GOSTO = null;
function gosto() {
  if (!GOSTO) { try { GOSTO = JSON.parse(localStorage.getItem(CHAVE_GOSTO) || "{}"); } catch { GOSTO = {}; } }
  return GOSTO;
}
// escolhas: [[chave, ligada], ...] — chamada quando a pessoa aplica a revisão
export function aprenderEscolhas(escolhas) {
  const g = gosto();
  for (const [k, on] of escolhas) { const x = g[k] || [0, 0]; x[on ? 0 : 1]++; g[k] = x; }
  const ks = Object.keys(g); if (ks.length > 600) ks.slice(0, ks.length - 600).forEach((k) => delete g[k]);
  try { localStorage.setItem(CHAVE_GOSTO, JSON.stringify(g)); } catch {}
}
export function esquecerEscolhas() { GOSTO = {}; try { localStorage.removeItem(CHAVE_GOSTO); } catch {} }
// "alta" vira "media" (vem desligada) quando a pessoa desligou 2+ vezes; some com 4+ recusas e nenhuma aceita;
// "media" vira "alta" quando ela ligou 2+ vezes e nunca recusou mais do que aceitou.
function confAprendida(chave, conf) {
  const x = gosto()[chave]; if (!x) return conf;
  const [sim, nao] = x;
  if (nao >= 4 && sim === 0) return null;
  if (conf === "alta" && nao >= 2 && nao > sim) return "media";
  if (conf === "media" && sim >= 2 && sim >= nao) return "alta";
  return conf;
}
export function adicionarAoDicionario(w) {
  PESSOAL.add(String(w).toLowerCase());
  try { localStorage.setItem(CHAVE_PESSOAL, JSON.stringify([...PESSOAL].slice(-500))); } catch {}
}
export const noDicionarioPessoal = (w) => PESSOAL.has(String(w).toLowerCase());
const rank = (w) => (LEX ? (LEX.has(w) ? LEX.get(w) : Infinity) : Infinity);
export const palavraExiste = (w) => !!LEX && [LEX, PESSOAL, ESTRANGEIRAS].some((c) => c.has(String(w).toLowerCase()));

// Chave pelo som (português do Brasil): palavras que soam igual ficam com a mesma chave.
export function chaveSom(w) {
  let s = String(w).toLowerCase().replace(/ç/g, "s");
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/^h/, "").replace(/([^cslnp])h/g, "$1")
    .replace(/ch|sh/g, "x").replace(/lh/g, "i").replace(/nh/g, "N").replace(/x(?=[ptcq])/g, "s").replace(/([ae])i(?=x)/g, "$1")
    .replace(/qu(?=[ei])/g, "k").replace(/gu(?=[ei])/g, "g").replace(/qu/g, "kw").replace(/q/g, "k")
    .replace(/sc(?=[ei])|xc(?=[ei])|ss/g, "s").replace(/c(?=[ei])/g, "s").replace(/c/g, "k")
    .replace(/g(?=[ei])/g, "j").replace(/([aeiou])s(?=[aeiou])/g, "$1z").replace(/z(?=[^aeiou]|$)/g, "s")
    .replace(/w/g, "v").replace(/y/g, "i").replace(/rr/g, "R")
    .replace(/l(?=[^aeiouN]|$)/g, "u").replace(/ei(?=[rxj])/g, "e").replace(/ou/g, "o").replace(/ii+/g, "i")
    .replace(/[mn](?=[^aeiouN]|$)/g, "M").replace(/e$/, "i").replace(/o$/, "u").replace(/es$/, "is").replace(/os$/, "us")
    .replace(/(.)\1+/g, "$1");
  return s;
}
function mapas() {
  if (ACC) return;
  ACC = new Map(); FON = new Map();
  for (const [w, r] of LEX) {
    const a = semAcento(w);
    if (!ACC.has(a) || r < LEX.get(ACC.get(a))) ACC.set(a, w);
    const k = chaveSom(w); if (!FON.has(k) || r < LEX.get(FON.get(k))) FON.set(k, w);
  }
}
const ALFA = "abcdefghijklmnopqrstuvwxyzáàâãéêíóôõúç";
const TECLADO = ["qwertyuiop", "asdfghjklç", "zxcvbnm"];
const VIZ = (() => { const m = {}; TECLADO.forEach((l, y) => [...l].forEach((c, x) => { m[c] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c2 = TECLADO[y + dy]?.[x + dx]; if (c2 && c2 !== c) m[c].push(c2); } })); return m; })();
// Candidatos a uma letra de distância, com o "custo" (tecla vizinha e letra invertida custam menos).
function umaLetra(w) {
  const out = new Map(), add = (c, custo) => { if (c !== w && (!out.has(c) || custo < out.get(c))) out.set(c, custo); };
  for (let i = 0; i <= w.length; i++) {
    const a = w.slice(0, i), b = w.slice(i);
    if (b) add(a + b.slice(1), 1);                                   // sobrando
    if (b.length > 1) add(a + b[1] + b[0] + b.slice(2), 0.6);        // invertidas
    for (const c of ALFA) {
      if (b) add(a + c + b.slice(1), semAcento(c) === semAcento(b[0]) ? 0.3 : (VIZ[b[0]] || []).includes(c) ? 0.7 : 1); // trocada
      add(a + c + b, b[0] === c || a.slice(-1) === c ? 0.6 : 1);     // faltando (letra dobrada custa menos)
    }
  }
  return out;
}
// Melhor sugestão para uma palavra que não existe: { para, como: acento|som|digitacao, conf: alta|media } ou null.
export function sugerirPalavra(w) {
  if (!LEX) return null;
  mapas();
  const k = w.toLowerCase();
  const a = ACC.get(semAcento(k));
  if (a && a !== k) return { para: a, como: "acento", conf: "alta" };
  const cands = [];
  for (const [c, custo] of umaLetra(k)) if (LEX.has(c)) cands.push({ c, custo, r: LEX.get(c) });
  const som = FON.get(chaveSom(k));
  if (som && som !== k) cands.push({ c: som, custo: 0.15, r: LEX.get(som), som: true });
  if (!cands.length) {
    // duas letras de distância, só para palavras maiores (tenta pelas que existem a 1 letra de cada candidato)
    if (k.length >= 6) for (const [c1] of umaLetra(k)) { if (c1.length < 4) continue; const s2 = FON.get(chaveSom(c1)); if (s2 && s2 !== k) cands.push({ c: s2, custo: 1.6, r: LEX.get(s2) }); }
    if (!cands.length) return null;
  }
  // nota: palavra mais usada e mais parecida ganha
  // mesmo som pesa muito: quem erra pelo som quase nunca quis outra palavra que soa diferente
  cands.forEach((x) => (x.nota = Math.log(2 + x.r) + x.custo * 2.2 - (x.som ? 2.6 : 0)));
  cands.sort((x, y) => x.nota - y.nota);
  const melhor = cands[0], segundo = cands.find((x) => x.c !== melhor.c);
  const folga = segundo ? segundo.nota - melhor.nota : 9;
  const conf = (melhor.custo <= 0.7 && melhor.r < 40000 && folga > 0.8) || (melhor.custo <= 1 && melhor.r < 60000 && folga > 1.2)
    || (melhor.som && melhor.r < 60000) ? "alta" : "media";
  return { para: melhor.c, como: melhor.som ? "som" : melhor.custo > 1 ? "parecida" : "digitacao", conf, outras: cands.filter((x) => x.c !== melhor.c).slice(0, 2).map((x) => x.c) };
}
// Palavra que existe sem acento mas quase sempre se escreve com acento ("ate" → "até", "voce" já cai no outro caso).
const AMBIGUAS = new Set(["e", "esta", "estas", "nos", "pais", "tem", "vem", "por", "para", "pelo", "pela", "da", "de", "do", "secretaria", "valido", "pratica", "publico", "duvida", "historia", "seria", "sabia", "e", "a", "as", "o", "nossa", "sera", "fabrica", "analise", "medico", "transito", "magoa", "agua", "pode", "pre", "pos", "ola", "alias", "contem", "obvio", "serio"]);
function acentoProvavel(k) {
  if (!LEX || AMBIGUAS.has(k)) return null;
  mapas();
  const a = ACC.get(semAcento(k));
  if (!a || a === k) return null;
  const ra = LEX.get(a), rk = LEX.get(k);
  return ra < 3000 && rk > 30 * ra && rk > 2000 ? a : null;
}
// Palavra rara que existe, mas soa igual a outra MUITO mais usada ("pexe" → "peixe"): vira sugestão para conferir.
function gemeaComum(k) {
  if (!LEX || k.length < 4 || AMBIGUAS.has(k)) return null;
  mapas();
  const g = FON.get(chaveSom(k));
  if (!g || g === k || semAcento(g) === semAcento(k)) return null;
  const rg = LEX.get(g), rk = LEX.get(k);
  return rg < 8000 && rk > 20000 && rk > 25 * rg ? g : null;
}

// ---------- Corretor ----------
const MOTIVO_SUG = { acento: "palavra com acento", som: "escrita certa (soa igual)", digitacao: "erro de digitação", parecida: "palavra parecida (confira)" };
// Começo de frase? (para não confundir nome próprio no meio da frase com palavra errada)
function inicioFrase(str, off, primeira) {
  for (let i = off - 1; i >= 0; i--) { const c = str[i]; if (/\s|["“'(¿¡]/.test(c)) continue; return /[.!?…\n]/.test(c); }
  return primeira;
}
// Antes de separar os links e números: horas e valores ("10hrs" → "10h", "R$10" → "R$ 10", "10 reais" fica).
function unidades(t, anotar) {
  return t
    .replace(/(?<![\w/.])(\d{1,2})\s?(?:hrs?|hs|horas?)\b/gi, (m, h) => (/horas?/i.test(m) ? m : anotar(m, h + "h", "pontuacao", "hora: “10h”") ? h + "h" : m))
    .replace(/(?<![\w/.:])(\d{1,2}):(\d{2})\s?h(?:rs?|s)?(?![\p{L}])/giu, (m, h, mi) => { const n = h + "h" + (mi === "00" ? "" : mi); return anotar(m, n, "pontuacao", "hora: 10h ou 10h30 (sem os dois-pontos)") ? n : m; })
    .replace(/(?<![\w/.])(\d{1,2})\s?h\s?(\d{2})\b/gi, (m, h, mi) => (anotar(m, h + "h" + mi, "pontuacao", "hora: “10h30”") ? h + "h" + mi : m))
    .replace(/(?<![\p{L}])(as)\s+(\d{1,2})(?=h\b|:\d{2}|\s*horas?\b)/giu, (m, a, h) => { const n = (a[0] === "A" ? "Às " : "às ") + h; return anotar(m, n, "crase", "hora: “às 10h” leva crase") ? n : m; })
    .replace(/(?<![\p{L}])fazem\s+(\d+)\s+(anos?|meses|dias?|semanas?|horas?|minutos?)(?![\p{L}])/giu, (m, n, u) => { const x = (m[0] === "F" ? "Faz " : "faz ") + n + " " + u; return anotar(m, x, "concordancia", "“faz” indicando tempo fica no singular") ? x : m; })
    .replace(/(?<![\p{L}])a\s+(\d+)\s+(anos?|meses|dias?|semanas?|horas?|minutos?)\s+(atr[aá]s|que)(?![\p{L}])/giu, (m, n, u, f) => { const x = `há ${n} ${u} ${f}`; return anotar(m, x, "ortografia", "tempo passado: “há”") ? x : m; })
    .replace(/(?<![\p{L}])h[aá]\s+(\d+)\s+(anos?|meses|dias?|semanas?|horas?|minutos?)\s+atr[aá]s(?![\p{L}])/giu, (m, n, u) => { const x = `há ${n} ${u}`; return anotar(m, x, "ortografia", "“há … atrás” repete a ideia: basta “há”", "media") ? x : m; })
    .replace(/R\$\s*(?=\d)/g, (m) => (m === "R$ " ? m : anotar(m + "…", "R$ …", "pontuacao", "espaço depois de “R$”") ? "R$ " : m));
}

export function corrigirTexto(texto, { modo = "pub", pular = new Set(), aceitar = new Set(), abreviacoes = true } = {}) {
  const mudancas = [], desconhecidas = new Set();
  // conf "media" = sugestão: aparece na revisão desligada (a pessoa liga se quiser); "alta" já vem ligada.
  const anotar = (de, para, tipo, motivo, conf = "alta") => {
    if (!de || de === para) return false;
    const chave = semAcento(de.toLowerCase()) + "→" + para.toLowerCase();
    if (pular.has(chave)) return false;
    conf = confAprendida(chave, conf);
    if (!conf) return false;
    const ligada = conf === "alta" || aceitar.has(chave);
    const ja = mudancas.find((x) => x.chave === chave);
    if (ja) ja.n++; else mudancas.push({ de, para, tipo, motivo, chave, n: 1, conf, ligada });
    return ligada;
  };
  const original = unidades(String(texto || ""), anotar);
  const partes = emPartes(original);

  partes.forEach((parte, ip) => {
    if (parte.fixo) return;
    let s = parte.t;
    // 1) palavra por palavra
    s = s.replace(PALAVRA, (w, off, str) => {
      const k = w.toLowerCase(), ks = semAcento(k);
      // colada em número/código ("mp4", "80cm", "n8", "v=abc") não é palavra para corrigir
      const colada = /[\p{N}=_/@]/u.test(str[off - 1] || "") || /[\p{N}=_/@]/u.test(str[off + w.length] || "");
      if (colada) return w;
      // risadas e "rs" ficam como estão
      if (/^(k{2,}|(ha){2,}|(he){2,}|(hu){2,}|(rs)+|a?ha+|kk+|[aeiu]?(h[aeiu]+){2,}h?|hu[ae](hu[ae])+)$/i.test(w)) return w;
      // letras repetidas: "muitoooo" → "muito" (no chat a pessoa pode querer; vale como sugestão)
      const rep = w.replace(/(\p{L})\1{2,}/gu, (m, l) => /[rs]/i.test(l) ? l + l : l);
      if (rep !== w && rep.length >= 2) { if (anotar(w, rep, "repeticao", "letras repetidas")) return rep; }
      if (abreviacoes && Object.prototype.hasOwnProperty.call(ABREVIACOES, k) && ABREVIACOES[k]) {
        const n = comoOriginal(w, ABREVIACOES[k]);
        if (anotar(w, n, "abreviacao", "abreviação escrita por inteiro")) return n;
      }
      if (Object.prototype.hasOwnProperty.call(ORTOGRAFIA, k) && ORTOGRAFIA[k] && ORTOGRAFIA[k] !== k) {
        const n = comoOriginal(w, ORTOGRAFIA[k]);
        if (anotar(w, n, "ortografia", "forma correta da palavra")) return n;
      }
      if (Object.prototype.hasOwnProperty.call(NOMES, ks) && w !== NOMES[ks]) {
        if (anotar(w, NOMES[ks], "maiuscula", "nome de lugar ou pessoa começa com maiúscula")) return NOMES[ks];
      }
      // "eu/não/ou + palavra + artigo": a palavra sem acento é verbo ("ou silencio uma conversa", "eu pratico o")
      const verboComObjeto = /(?:^|[\s,])(eu|n[ãa]o|ou|que|se|me|te|nos|j[áa]|tamb[ée]m|sempre|nunca)\s+$/i.test(str.slice(Math.max(0, off - 14), off))
        && /^\s+(o|a|os|as|um|uma|uns|umas|meu|minha|seu|sua|esse|essa|este|esta|isso|isto|tudo|nada)\b/i.test(str.slice(off + w.length, off + w.length + 10));
      if (k === ks && !verboComObjeto && Object.prototype.hasOwnProperty.call(ACENTOS, k) && ACENTOS[k] && ACENTOS[k] !== k) {
        const n = comoOriginal(w, ACENTOS[k]);
        if (anotar(w, n, "acento", "palavra com acento")) return n;
      }
      // terminações que sempre levam acento/til: -cao/-coes, -encia/-ancia, -avel/-ivel
      if (k === ks && k.length >= 5) {
        let n = null;
        if (k === "razao") n = "razão";
        else if (/[^aeiou]cao$/.test(k) || /^.{2,}acao$/.test(k)) n = k.replace(/cao$/, "ção");
        else if (/[^aeiou]coes$/.test(k) || /acoes$/.test(k)) n = k.replace(/coes$/, "ções");
        else if (/[^aeiou]zao$/.test(k) || /^razao$/.test(k)) n = k.replace(/zao$/, "zão");
        else if (/[^aeiou]sao$/.test(k) && k.length >= 6) n = k.replace(/sao$/, "são"); // decisão, televisão
        else if (/encia$/.test(k)) n = k.replace(/encia$/, "ência");
        else if (/ancia$/.test(k) && !/^(lancia|ancia)$/.test(k)) n = k.replace(/ancia$/, "ância");
        else if (/[^u]avel$/.test(k)) n = k.replace(/avel$/, "ável");
        else if (/ivel$/.test(k)) n = k.replace(/ivel$/, "ível");
        else if (/ovel$/.test(k)) n = k.replace(/ovel$/, "óvel");
        else if (/oveis$/.test(k)) n = k.replace(/oveis$/, "óveis");
        else if (/aveis$/.test(k)) n = k.replace(/aveis$/, "áveis");
        else if (/iveis$/.test(k)) n = k.replace(/iveis$/, "íveis");
        if (n && n !== k && (!LEX || LEX.has(n))) { n = comoOriginal(w, n); if (anotar(w, n, "acento", "terminação com acento")) return n; }
      }
      // Dicionário: a palavra existe? (nomes próprios no meio da frase, siglas e palavras com número ficam de fora)
      // sem vogal ("hd", "pc": sigla) não é palavra para corrigir
      if (LEX && k.length >= 2 && /[aeiouyáéíóúâêôãõàü]/.test(k) && !/\d/.test(w) && !PESSOAL.has(k) && !/\p{Lu}/u.test(w.slice(1))
          && !(/^\p{Lu}/u.test(w) && !inicioFrase(str, off, ip === 0))) {
        const existe = (x) => LEX.has(x) || PESSOAL.has(x) || ESTRANGEIRAS.has(x);
        const partesHifen = k.split("-");
        // nova ortografia: prefixo sem hífen ("auto-estima" → autoestima, "anti-rugas" → antirrugas, "mini-série" → minissérie)
        if (partesHifen.length === 2 && !existe(k)) {
          const [a, b] = partesHifen, junto = a + (/[aeiou]$/.test(a) && /^[rs]/.test(b) ? b[0] : "") + b;
          const PREF = /^(auto|anti|contra|semi|mini|micro|maxi|mega|ultra|infra|supra|super|hiper|neo|pseudo|co|extra|intra|agro|multi|poli|retro|tele|socio|eco|bio|geo|foto|hidro|termo|aero|moto|macro|proto|ante|entre|sobre)$/;
          if (PREF.test(a) && b.length >= 3 && !/^(lhe|lhes|nos|vos|los|las|nas|sena)$/.test(b) && LEX.has(junto) && a.slice(-1) !== b[0]) { const n = comoOriginal(w, junto); if (anotar(w, n, "ortografia", "nova ortografia: junto, sem hífen")) return n; }
        }
        if (!existe(k) && !(partesHifen.length > 1 && partesHifen.every(existe))) {
          const sg = sugerirPalavra(k);
          if (sg && k.length <= 3 && sg.como !== "acento") sg.conf = "media"; // 2–3 letras: muitas siglas e gírias, só sugere
          if (sg) {
            const n = comoOriginal(w, sg.para);
            return anotar(w, n, sg.como === "acento" ? "acento" : "ortografia", MOTIVO_SUG[sg.como], sg.conf) ? n : w;
          }
          if (k.length >= 3 && !ABREVIACOES[k]) desconhecidas.add(w);
        } else if (k === ks) {
          const a = acentoProvavel(k);
          if (a) { const n = comoOriginal(w, a); if (anotar(w, n, "acento", "palavra com acento")) return n; }
          else { const g = gemeaComum(k); if (g) { const n = comoOriginal(w, g); return anotar(w, n, "ortografia", "soa igual a uma palavra muito mais usada: confira", "media") ? n : w; } }
        }
      }
      return w;
    });
    // 1b) palavras que se confundem, escolhidas pelas palavras em volta (corretor que aprende)
    s = corrigirPeloContexto(s, anotar);
    // 2) palavra repetida: "o o" → "o" (menos as que se repetem de propósito)
    s = s.replace(/(?<![\p{L}])(\p{L}+)\s+\1(?![\p{L}])/giu, (m, w) => {
      if (/^(n[aã]o|sim|muito|bem|tchau|oi|pode|vai|corre|ai|aí|r[aá]pido|j[aá]|tá|ta|kk+|ha|he|blá|bla|tic|toc)$/i.test(w)) return m;
      return anotar(m, w, "repeticao", "palavra repetida") ? w : m;
    });
    // 3) regras com contexto
    for (const [re, sub, tipo, motivo, conf] of REGRAS) {
      s = s.replace(re, (...args) => {
        const m = args[0];
        let n = typeof sub === "function" ? sub(...args) : m.replace(new RegExp(re.source, "iu"), sub);
        let cf = conf;
        if (n && typeof n === "object") { cf = n.conf || conf; n = n.para; }
        if (!n || n === m) return m;
        if (tipo !== "maiuscula") n = comoOriginal(m.trimStart(), n.trimStart()); n = m.match(/^\s*/)[0] + n.trimStart();
        return anotar(m.trim(), n.trim(), tipo, motivo, cf) ? n : m;
      });
    }
    // 3b) o verbo combina com quem faz a ação (nós/eu/eles/"as pessoas") — também nos verbos ligados por "e"
    s = concordarSujeito(s, anotar);
    // 4) pontuação: espaço antes da vírgula, espaço depois, vírgula antes de "mas"/"porém", "!!!!!!"
    s = s.replace(/[ \t]+([,;:]|[!?]+|\.(?!\.))(?=\s|$)/g, (m, p) => anotar(m, p, "pontuacao", "sem espaço antes da pontuação") ? p : m);
    s = s.replace(/([,;])(\p{L}+)/gu, (m, p, w) => anotar(m, p + " " + w, "pontuacao", "espaço depois da vírgula") ? p + " " + w : m);
    s = s.replace(/(\p{Ll}{2,})([.!?])(\p{L}+)/gu, (m, a, p, b) => anotar(m, a + p + " " + b, "pontuacao", "espaço depois do ponto") ? a + p + " " + b : m);
    s = s.replace(/(?<=\p{L})\s+por\s+favor\s+(?=\p{L})/gu, (m) => anotar(m.trim(), ", por favor,", "pontuacao", "“por favor” no meio da frase vai entre vírgulas", "media") ? ", por favor, " : m);
    s = s.replace(/([!?]){4,}/g, (m, p) => anotar(m, p.repeat(3), "pontuacao", "pontuação repetida demais") ? p.repeat(3) : m);
    s = s.replace(/(?<=\p{L}{2,})\s+(mas|por[eé]m|contudo|entretanto)\s+(?=\p{L})/giu, (m, c) => {
      const n = ", " + c + " ";
      return anotar(c, ", " + c, "pontuacao", "vírgula antes de “mas”/“porém”") ? n : m;
    });
    parte.t = s;
  });
  // links, @, # e números viram marcadores enquanto as frases são arrumadas (o ponto de "site.com.br" não é fim de frase)
  const guardados = [];
  let fim = partes.map((p) => p.fixo ? (guardados.push(p.t), `\uE000${guardados.length - 1}\uE001`) : p.t).join("");

  // 5) frases: maiúscula no começo, "?" nas perguntas, ponto final (só publicações)
  const ORDEM_PEDIDO = /(me\s+(avise|avisa|chama|chame|ligue|liga|mande|manda|procure|procura)|por\s+favor|entre\s+em\s+contato|me\s+ajud)/iu;
  const PERG = /^(como(?!\s+se\b)|quando|onde|qual|quais|quem|quanto|quantos|quantas|por que|pra que|para que|o que|cad[eê]|ser[aá] que|voc[eê] (pode|poderia|sabe|tem|vai|quer|conhece|j[aá])|algu[eé]m (sabe|tem|conhece|indica|pode)|tem como|d[aá] pra|d[aá] para|posso|pode me)\b/iu;
  fim = fim.split("\n").map((linha) => {
    // frases separadas pelo ponto/!/? seguido de espaço; cada uma: maiúscula no começo e "?" se é pergunta
    const pedacos = linha.split(/(?<=[.!?…]["”')]*)(\s+)/);
    return pedacos.map((frase) => {
      if (!frase || /^\s+$/.test(frase)) return frase;
      let f = frase;
      // vocativo depois do cumprimento: "Oi gente tudo bem" → "Oi, gente, tudo bem"
      f = f.replace(/^(["“'(¿¡]*)([Oo]i|[Oo]l[aá]|[Bb]om\s+dia|[Bb]oa\s+tarde|[Bb]oa\s+noite|[Oo]brigad[oa]|[Vv]aleu|[Pp]arab[eé]ns|[Tt]chau|[Ee]\s+a[ií]|[Oo]pa|[Ff]ala)\s+(gente|pessoal|galera|amig[oa]s?|amor|meu\s+amor|querid[oa]s?|mano|mana|todos|tod[oa]s|\p{Lu}\p{Ll}+)(?=([\s,!?.]|$))(\s+(?![,!?.])(?=\p{L}))?/u, (m, q, cumpr, voc, _, depois) => {
        const n = `${q}${cumpr}, ${voc}${depois ? ", " : ""}`;
        return anotar(m.trim(), n.trim(), "pontuacao", "vírgula no vocativo (quem você chama)") ? n : m;
      });
      f = f.replace(/^(["“'(¿¡]*)([Oo]i|[Oo]l[aá]|[Oo]pa|[Ee]\s+a[ií]|[Bb]om\s+dia|[Bb]oa\s+tarde|[Bb]oa\s+noite)\s+(?=(tudo|td|como|beleza|blz|tranquilo|tranquila|quanto|quantos|voc[eê]s?|vcs?|algu[eé]m|posso|pode|queria|gostaria)(?![\p{L}]))/u, (m, q, i) => {
        const n = `${q}${i}, `;
        return anotar(m.trim(), n.trim(), "pontuacao", "vírgula depois do cumprimento") ? n : m;
      });
      const c = f.match(/^(["“'(¿¡]*)(\p{Ll}\p{L}*)/u);
      if (c) {
        const para = c[2].charAt(0).toUpperCase() + c[2].slice(1);
        if (anotar(c[2], para, "maiuscula", "frase começa com letra maiúscula")) f = c[1] + para + f.slice(c[0].length);
      }
      const limpa = f.trim().replace(/[\s,;:]+$/, "");
      const nPal = limpa.split(/\s+/).length;
      const subordinada = /^(quando|onde|como|se)\b[^,]*,/iu.test(limpa); // "Quando eu puder, vou" afirma, não pergunta
      if (!/[.!?…]["”')]*$/.test(limpa) && !subordinada && PERG.test(limpa) && nPal >= 2 && !/\uE001$/.test(limpa) && !ORDEM_PEDIDO.test(limpa)) {
        const ult = limpa.split(/\s+/).pop();
        if (anotar(ult, ult + "?", "pontuacao", "pergunta termina com “?”", nPal <= 9 ? "alta" : "media")) f = f.replace(/[\s,;:]*$/, (e) => "?" + e.replace(/[,;:]/g, ""));
      }
      return f;
    }).join("");
  }).join("\n");
  // "eu" no começo já sai com maiúscula pela regra acima; ponto final na publicação (parágrafo com 5+ palavras)
  if (modo === "pub") {
    fim = fim.split("\n").map((l) => {
      const t = l.trimEnd();
      if (t.split(/\s+/).length < 5 || /[.!?…:;,)"”\]]$/.test(t) || /\uE001$/.test(t) || /^\s*([•\-*]|\[[ xX]\]|#)/.test(t) || /\p{Extended_Pictographic}$/u.test(t)) return l;
      const ult = t.split(/\s+/).pop();
      return anotar(ult, ult + ".", "pontuacao", "ponto final no fim do parágrafo") ? t + "." : l;
    }).join("\n");
  }
  fim = fim.replace(/\uE000(\d+)\uE001/g, (m, i) => guardados[+i]);
  const porTipo = {};
  for (const m of mudancas) if (m.ligada) porTipo[m.tipo] = (porTipo[m.tipo] || 0) + m.n;
  for (const m of mudancas) if (m.ligada) desconhecidas.delete(m.de);
  return { texto: fim, mudancas, porTipo, total: mudancas.filter((m) => m.ligada).reduce((a, m) => a + m.n, 0), sugestoes: mudancas.filter((m) => !m.ligada).length, desconhecidas: [...desconhecidas], dicionario: !!LEX };
}

// Resumo curto: "3 acentos, 2 abreviações"
export function resumoCorrecoes(porTipo) {
  const nomes = { acento: ["acento", "acentos"], ortografia: ["palavra", "palavras"], abreviacao: ["abreviação", "abreviações"],
    concordancia: ["concordância", "concordâncias"], regencia: ["regência", "regências"], estilo: ["ajuste de estilo", "ajustes de estilo"], crase: ["crase", "crases"], pontuacao: ["pontuação", "pontuações"], maiuscula: ["maiúscula", "maiúsculas"],
    repeticao: ["repetição", "repetições"] };
  return Object.entries(porTipo).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${nomes[k][n > 1 ? 1 : 0]}`).join(", ");
}

// Diferença palavra a palavra (para pintar o que mudou): [{t, tipo: "igual"|"saiu"|"entrou"}]
export function diferenca(a, b) {
  const ta = String(a).split(/(\s+)/), tb = String(b).split(/(\s+)/);
  const n = ta.length, m = tb.length;
  if (n * m > 400000) return [{ t: b, tipo: "igual" }];
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  const pus = (t, tipo) => { const u = out[out.length - 1]; if (u && u.tipo === tipo) u.t += t; else out.push({ t, tipo }); };
  while (i < n && j < m) {
    if (ta[i] === tb[j]) { pus(ta[i], "igual"); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { pus(ta[i], "saiu"); i++; }
    else { pus(tb[j], "entrou"); j++; }
  }
  while (i < n) pus(ta[i++], "saiu");
  while (j < m) pus(tb[j++], "entrou");
  return out;
}
