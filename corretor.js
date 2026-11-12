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
  [P(`(isso|isto|aquilo|ele|ela|n[aã]o|qual|quem|onde|como|quando|aqui|a[ií]|tudo|ningu[eé]m|voc[eê]|ela|ele|que)\\s+e\\s+(um|uma|muito|muita|bom|boa|ruim|verdade|certo|certa|assim|isso|melhor|pior|s[oó]|mesmo|poss[ií]vel|importante|dif[ií]cil|f[aá]cil|lindo|linda|top|demais|o\\s+melhor|a\\s+melhor|meu|minha|seu|sua|nosso|nossa)`), "$1 é $2", "acento", "“é” do verbo ser leva acento"],
  [P(`(^|[.!?]\\s+)e\\s+(verdade|isso|assim|s[oó]|muito|bom|boa|claro|poss[ií]vel)`), "$1é $2", "acento", "“é” do verbo ser leva acento"],
  // "esta" → "está" (verbo) antes de palavras que pedem o verbo
  [P(`esta\\s+(bem|aqui|a[ií]|l[aá]|certo|certa|tudo|ok|com|sendo|indo|fazendo|vindo|chegando|chovendo|aberto|aberta|fechado|fechada|pronto|pronta|dispon[ií]vel|funcionando|precisando|esperando|tranquilo|tranquila|na|no|em|muito|bom|boa|ruim|caro|cara|barato|barata|legal|livre|ocupado|ocupada|online|atrasado|atrasada)`), "está $1", "acento", "“está” do verbo estar leva acento"],
  [P(`(voc[eê]|ele|ela|isso|tudo|onde|como|quem|n[aã]o)\\s+esta(?=[\\s?!.,]|$)`), "$1 está", "acento", "“está” do verbo estar leva acento"],
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
  [P(`n[oó]s\\s+(vai|é|est[aá]|tem|pode|foi|fez|quer|precisa|ficou|sabe)`), (m, v) => "nós " + ({ vai: "vamos", "é": "somos", "está": "estamos", esta: "estamos", tem: "temos", pode: "podemos", foi: "fomos", fez: "fizemos", quer: "queremos", precisa: "precisamos", ficou: "ficamos", sabe: "sabemos" })[v.toLowerCase()], "concordancia", "“nós” combina com o verbo no plural"],
  [P(`agente\\s+(vai|vamos|foi|pode|tem|t[aá]|est[aá]|precisa|se\\s+v[eê]|quer|fica|faz|sempre)`), "a gente $1", "ortografia", "“a gente” (nós) se escreve separado; “agente” é profissão"],
  [P(`fazem\\s+(\\d+|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|muitos|v[aá]rios|anos|meses|dias|semanas|horas)`), "faz $1", "concordancia", "“faz” indicando tempo fica no singular"],
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
  [P(`mal\\s+educad([oa]s?)`), "mal-educad$1", "ortografia", "“mal-educado” leva hífen"],
  [P(`bem\\s+vind([oa]s?)`), "bem-vind$1", "ortografia", "“bem-vindo” leva hífen"],
  [P(`dia\\s+a\\s+dia`), null, null, null] // já está certo: não mexe
].filter((r) => r[1] !== null);

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

// ---------- Corretor ----------
export function corrigirTexto(texto, { modo = "pub", pular = new Set(), abreviacoes = true } = {}) {
  const original = String(texto || "");
  const mudancas = [];
  const anotar = (de, para, tipo, motivo) => {
    if (!de || de === para) return false;
    const chave = semAcento(de.toLowerCase()) + "→" + para.toLowerCase();
    if (pular.has(chave)) return false;
    const ja = mudancas.find((x) => x.chave === chave);
    if (ja) ja.n++; else mudancas.push({ de, para, tipo, motivo, chave, n: 1 });
    return true;
  };
  const partes = emPartes(original);

  for (const parte of partes) {
    if (parte.fixo) continue;
    let s = parte.t;
    // 1) palavra por palavra
    s = s.replace(PALAVRA, (w) => {
      const k = w.toLowerCase(), ks = semAcento(k);
      // risadas e "rs" ficam como estão
      if (/^(k{2,}|(ha){2,}|(he){2,}|(hu){2,}|(rs)+|a?ha+|kk+)$/i.test(w)) return w;
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
      if (k === ks && Object.prototype.hasOwnProperty.call(ACENTOS, k) && ACENTOS[k] && ACENTOS[k] !== k) {
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
        if (n && n !== k) { n = comoOriginal(w, n); if (anotar(w, n, "acento", "terminação com acento")) return n; }
      }
      return w;
    });
    // 2) palavra repetida: "o o" → "o" (menos as que se repetem de propósito)
    s = s.replace(/(?<![\p{L}])(\p{L}+)\s+\1(?![\p{L}])/giu, (m, w) => {
      if (/^(n[aã]o|sim|muito|bem|tchau|oi|pode|vai|corre|ai|aí|r[aá]pido|j[aá]|tá|ta|kk+|ha|he|blá|bla|tic|toc)$/i.test(w)) return m;
      return anotar(m, w, "repeticao", "palavra repetida") ? w : m;
    });
    // 3) regras com contexto
    for (const [re, sub, tipo, motivo] of REGRAS) {
      s = s.replace(re, (...args) => {
        const m = args[0];
        let n = typeof sub === "function" ? sub(...args) : m.replace(new RegExp(re.source, "iu"), sub);
        if (!n || n === m) return m;
        n = comoOriginal(m.trimStart(), n.trimStart()); n = m.match(/^\s*/)[0] + n;
        return anotar(m.trim(), n.trim(), tipo, motivo) ? n : m;
      });
    }
    // 4) pontuação: espaço antes da vírgula, espaço depois, vírgula antes de "mas"/"porém", "!!!!!!"
    s = s.replace(/[ \t]+([,;:!?]|\.(?!\.))(?=\s|$)/g, (m, p) => anotar(m, p, "pontuacao", "sem espaço antes da pontuação") ? p : m);
    s = s.replace(/([,;])(\p{L}+)/gu, (m, p, w) => anotar(m, p + " " + w, "pontuacao", "espaço depois da vírgula") ? p + " " + w : m);
    s = s.replace(/(\p{Ll}{2,})([.!?])(\p{L}+)/gu, (m, a, p, b) => anotar(m, a + p + " " + b, "pontuacao", "espaço depois do ponto") ? a + p + " " + b : m);
    s = s.replace(/([!?]){4,}/g, (m, p) => anotar(m, p.repeat(3), "pontuacao", "pontuação repetida demais") ? p.repeat(3) : m);
    s = s.replace(/(?<=\p{L}{2,})\s+(mas|por[eé]m|contudo|entretanto)\s+(?=\p{L})/giu, (m, c) => {
      const n = ", " + c + " ";
      return anotar(c, ", " + c, "pontuacao", "vírgula antes de “mas”/“porém”") ? n : m;
    });
    parte.t = s;
  }
  // links, @, # e números viram marcadores enquanto as frases são arrumadas (o ponto de "site.com.br" não é fim de frase)
  const guardados = [];
  let fim = partes.map((p) => p.fixo ? (guardados.push(p.t), `\uE000${guardados.length - 1}\uE001`) : p.t).join("");

  // 5) frases: maiúscula no começo, "?" nas perguntas, ponto final (só publicações)
  const PERG = /^(como|quando|onde|qual|quais|quem|quanto|quantos|quantas|por que|pra que|para que|o que|cad[eê]|ser[aá] que|voc[eê] (pode|poderia|sabe|tem|vai|quer|conhece|j[aá])|algu[eé]m (sabe|tem|conhece|indica|pode)|tem como|d[aá] pra|d[aá] para|posso|pode me)\b/iu;
  fim = fim.split("\n").map((linha) => {
    // frases separadas pelo ponto/!/? seguido de espaço; cada uma: maiúscula no começo e "?" se é pergunta
    const pedacos = linha.split(/(?<=[.!?…]["”')]*)(\s+)/);
    return pedacos.map((frase) => {
      if (!frase || /^\s+$/.test(frase)) return frase;
      let f = frase;
      const c = f.match(/^(["“'(¿¡]*)(\p{Ll}\p{L}*)/u);
      if (c) {
        const para = c[2].charAt(0).toUpperCase() + c[2].slice(1);
        if (anotar(c[2], para, "maiuscula", "frase começa com letra maiúscula")) f = c[1] + para + f.slice(c[0].length);
      }
      const limpa = f.trim().replace(/[\s,;:]+$/, "");
      if (!/[.!?…]["”')]*$/.test(limpa) && PERG.test(limpa) && limpa.split(/\s+/).length >= 2 && !/\uE001$/.test(limpa)) {
        const ult = limpa.split(/\s+/).pop();
        if (anotar(ult, ult + "?", "pontuacao", "pergunta termina com “?”")) f = f.replace(/[\s,;:]*$/, (e) => "?" + e.replace(/[,;:]/g, ""));
      }
      return f;
    }).join("");
  }).join("\n");
  // "eu" no começo já sai com maiúscula pela regra acima; ponto final na publicação (parágrafo com 5+ palavras)
  if (modo === "pub") {
    fim = fim.split("\n").map((l) => {
      const t = l.trimEnd();
      if (t.split(/\s+/).length < 5 || /[.!?…:;,)"”\]]$/.test(t) || /\uE001$/.test(t) || /^[•\-*]/.test(t) || /\p{Extended_Pictographic}$/u.test(t)) return l;
      const ult = t.split(/\s+/).pop();
      return anotar(ult, ult + ".", "pontuacao", "ponto final no fim do parágrafo") ? t + "." : l;
    }).join("\n");
  }
  fim = fim.replace(/\uE000(\d+)\uE001/g, (m, i) => guardados[+i]);
  const porTipo = {};
  for (const m of mudancas) porTipo[m.tipo] = (porTipo[m.tipo] || 0) + m.n;
  return { texto: fim, mudancas, porTipo, total: mudancas.reduce((a, m) => a + m.n, 0) };
}

// Resumo curto: "3 acentos, 2 abreviações"
export function resumoCorrecoes(porTipo) {
  const nomes = { acento: ["acento", "acentos"], ortografia: ["palavra", "palavras"], abreviacao: ["abreviação", "abreviações"],
    concordancia: ["concordância", "concordâncias"], pontuacao: ["pontuação", "pontuações"], maiuscula: ["maiúscula", "maiúsculas"],
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
