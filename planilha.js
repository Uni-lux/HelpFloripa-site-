// =====================================================
// Planilha do Excel (.xlsx) feita no próprio navegador, sem bibliotecas, em estilo de relatório.
// Abre no Microsoft Excel, Google Planilhas, Numbers, LibreOffice e no celular.
// - capa "Resumo" (quando há título): nome, período, filtro, data de geração, números
//   principais com a variação e índice com link para cada aba
// - cada aba: título e período no topo, gráfico nativo primeiro e a tabela formatada
//   (bordas, linhas alternadas e total com fórmula), pronta para imprimir em A4
//
// O Excel é bem mais exigente que os outros leitores: qualquer elemento fora da
// ordem do padrão OOXML, repetido ou vazio faz ele dizer "encontrou um problema
// neste arquivo". Por isso cada parte segue o esquema à risca (validado com o
// Open XML SDK da Microsoft).
// =====================================================
const enc = new TextEncoder();
// Texto seguro para XML: escapa & < > " e tira caracteres que o XML não aceita
// (controles, U+FFFE/U+FFFF e metades soltas de emoji).
const xml = (t) => String(t)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1")
  .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let tabelaCrc = null;
function crc32(bytes) {
  if (!tabelaCrc) { tabelaCrc = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tabelaCrc[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = tabelaCrc[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ZIP sem compressão (método "store"): simples e aceito por todos os leitores de .xlsx.
function zip(arquivos) {
  const partes = [], central = []; let pos = 0;
  const u16 = (v) => [v & 0xff, (v >>> 8) & 0xff];
  const u32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
  // Data e hora do arquivo no formato do DOS (o Excel não liga, mas alguns descompactadores sim).
  const d = new Date();
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const [nome, texto] of arquivos) {
    const n = enc.encode(nome), dados = enc.encode(texto), crc = crc32(dados);
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(hora), ...u16(dia), ...u32(crc), ...u32(dados.length), ...u32(dados.length), ...u16(n.length), ...u16(0)]);
    partes.push(local, n, dados);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(hora), ...u16(dia), ...u32(crc), ...u32(dados.length), ...u32(dados.length), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), n);
    pos += local.length + n.length + dados.length;
  }
  const tamCentral = central.reduce((a, b) => a + b.length, 0);
  const fim = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(arquivos.length), ...u16(arquivos.length), ...u32(tamCentral), ...u32(pos), ...u16(0)]);
  return new Blob([...partes, ...central, fim], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const coluna = (i) => { let s = ""; i++; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
// Referência a uma aba numa fórmula: 'Nome da aba'!$A$1 (aspas simples dobradas dentro do nome).
const refAba = (nome) => `'${String(nome).replace(/'/g, "''")}'`;
// O Excel aceita no máximo 32.767 caracteres por célula.
const LIMITE_CELULA = 32767;

// Paleta do gráfico (mesma família das cores do painel, legível no Excel claro).
const CORES = ["2E86DE", "E8833A", "27AE60", "E6B800", "7C5CFF", "E0457B", "00ADEE", "EF4444", "16A085", "8E44AD"];

// Colunas numéricas viram séries do gráfico; a 1ª coluna são os rótulos (categorias).
function series(cabecalho, linhas) {
  const cats = linhas.map((l) => String(l[0] ?? ""));
  const sers = [];
  for (let c = 1; c < cabecalho.length; c++) {
    const nums = linhas.map((l) => (typeof l[c] === "number" && isFinite(l[c]) ? l[c] : null));
    if (nums.some((v) => v != null)) sers.push({ col: c, nome: String(cabecalho[c] ?? "Série"), nums: nums.map((v) => v ?? 0) });
  }
  return { cats, sers };
}

// Gráfico nativo (DrawingML). Os elementos de cada <c:ser> seguem a ordem exata do esquema:
// idx, order, tx, spPr, (marker | invertIfNegative), dPt, cat, val, smooth. Um só <c:spPr> por série.

function chartXml(grafico, cabecalho, linhas, aba, linhaCab = 1) {
  const { cats, sers } = series(cabecalho, linhas);
  if (!sers.length || !cats.length) return null;
  const A = refAba(aba);
  const primeira = linhaCab + 1, ultima = linhaCab + linhas.length; // a tabela começa na linha do cabeçalho
  const tipo = ["coluna", "barra", "linha", "pizza"].includes(grafico.tipo) ? grafico.tipo : "coluna";
  const pizza = tipo === "pizza", linha = tipo === "linha";
  const cor = (i) => CORES[i % CORES.length];
  const strCache = (arr) => `<c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${xml(v)}</c:v></c:pt>`).join("")}`;
  const numCache = (arr) => `<c:formatCode>General</c:formatCode><c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join("")}`;
  const catRef = `<c:cat><c:strRef><c:f>${xml(A)}!$A$${primeira}:$A$${ultima}</c:f><c:strCache>${strCache(cats)}</c:strCache></c:strRef></c:cat>`;
  const serXml = sers.map((sr, si) => {
    const L = coluna(sr.col);
    const tx = `<c:tx><c:strRef><c:f>${xml(A)}!$${L}$${linhaCab}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${xml(sr.nome)}</c:v></c:pt></c:strCache></c:strRef></c:tx>`;
    let visual = "";
    if (linha) visual = `<c:spPr><a:ln w="22225" cap="rnd"><a:solidFill><a:srgbClr val="${cor(si)}"/></a:solidFill><a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="${cor(si)}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:marker>`;
    else if (pizza) visual = cats.map((_, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${cor(i)}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join("");
    else visual = `<c:spPr><a:solidFill><a:srgbClr val="${cor(si)}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>`;
    const val = `<c:val><c:numRef><c:f>${xml(A)}!$${L}$${primeira}:$${L}$${ultima}</c:f><c:numCache>${numCache(sr.nums)}</c:numCache></c:numRef></c:val>`;
    return `<c:ser><c:idx val="${si}"/><c:order val="${si}"/>${tx}${visual}${catRef}${val}${linha ? '<c:smooth val="0"/>' : ""}</c:ser>`;
  }).join("");
  const eixos = (horiz) => `<c:catAx><c:axId val="111"/><c:scaling><c:orientation val="${horiz ? "maxMin" : "minMax"}"/></c:scaling><c:delete val="0"/><c:axPos val="${horiz ? "l" : "b"}"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="222"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`
    + `<c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${horiz ? "b" : "l"}"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E3E8EC"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="111"/><c:crosses val="${horiz ? "max" : "autoZero"}"/><c:crossBetween val="between"/></c:valAx>`;
  let plot;
  if (pizza) plot = `<c:pieChart><c:varyColors val="1"/>${serXml}<c:firstSliceAng val="0"/></c:pieChart>`;
  else if (linha) plot = `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${serXml}<c:marker val="1"/><c:axId val="111"/><c:axId val="222"/></c:lineChart>${eixos(false)}`;
  else { const dir = tipo === "barra" ? "bar" : "col"; plot = `<c:barChart><c:barDir val="${dir}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${serXml}<c:gapWidth val="80"/><c:axId val="111"/><c:axId val="222"/></c:barChart>${eixos(dir === "bar")}`; }
  const titulo = grafico.titulo
    ? `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="pt-BR" sz="1200" b="1"/><a:t>${xml(grafico.titulo)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`
    : `<c:autoTitleDeleted val="1"/>`;
  const legenda = sers.length > 1 || pizza ? `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:lang val="pt-BR"/><c:roundedCorners val="0"/><c:chart>${titulo}<c:plotArea><c:layout/>${plot}</c:plotArea>${legenda}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="D9DEE3"/></a:solidFill></a:ln></c:spPr></c:chartSpace>`;
}


// Gráfico logo abaixo do título da aba: tamanho fixo (16 x 8 cm), cabe numa folha A4 em pé.
const LINHA_GRAFICO = 4;        // começa na linha 5
const LINHAS_GRAFICO = 16;      // ocupa as linhas 5 a 20
function drawingXml(linhaInicial) {
  return `${XML_DECL}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${linhaInicial}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="5760000" cy="2880000"/><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Gráfico 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
}

// Números em texto ("12", "3,5") viram número de verdade (somam e entram no gráfico).
// "0123" (CEP, telefone) continua texto.
const numerizar = (linhas) => linhas.map((l) => (l || []).map((v) => (typeof v === "string" && /^-?\d{1,9}([.,]\d+)?$/.test(v.trim()) && !/^-?0\d/.test(v.trim()) ? Number(v.trim().replace(",", ".")) : v)));

const XML_DECL = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const relsXml = (corpo) => `${XML_DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${corpo}</Relationships>`;

// Tema mínimo do Office (as cores "theme" dos estilos e dos gráficos vêm daqui).
const TEMA = `${XML_DECL}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="2E86DE"/></a:accent1><a:accent2><a:srgbClr val="E8833A"/></a:accent2><a:accent3><a:srgbClr val="27AE60"/></a:accent3><a:accent4><a:srgbClr val="E6B800"/></a:accent4><a:accent5><a:srgbClr val="7C5CFF"/></a:accent5><a:accent6><a:srgbClr val="E0457B"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

// ---------- estilos do relatório ----------
// Cores: azul do Help Floripa no cabeçalho, linhas alternadas bem claras e total destacado.
const AZUL = "FF0B7FAE", ZEBRA = "FFF2F7FA", TOTAL = "FFE3F4FC", BORDA = "FFD5DEE4", ESCURO = "FF0E1A21", CINZA = "FF5D6F7B";
const FONTES = [
  `<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 0 normal
  `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 1 cabeçalho
  `<font><b/><sz val="11"/><color rgb="${ESCURO}"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 2 negrito
  `<font><b/><sz val="16"/><color rgb="${ESCURO}"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 3 título
  `<font><sz val="10"/><color rgb="${CINZA}"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 4 subtítulo
  `<font><b/><sz val="10"/><color rgb="FF00ADEE"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 5 marca
  `<font><b/><sz val="22"/><color rgb="${ESCURO}"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 6 título da capa
  `<font><b/><sz val="11"/><color rgb="${CINZA}"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 7 rótulo
  `<font><b/><sz val="13"/><color rgb="${ESCURO}"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 8 seção
  `<font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>`, // 9 link
  `<font><i/><sz val="10"/><color rgb="${CINZA}"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>` // 10 nota
];
const PREENCH = [`<fill><patternFill patternType="none"/></fill>`, `<fill><patternFill patternType="gray125"/></fill>`,
  `<fill><patternFill patternType="solid"><fgColor rgb="${AZUL}"/><bgColor indexed="64"/></patternFill></fill>`,
  `<fill><patternFill patternType="solid"><fgColor rgb="${ZEBRA}"/><bgColor indexed="64"/></patternFill></fill>`,
  `<fill><patternFill patternType="solid"><fgColor rgb="${TOTAL}"/><bgColor indexed="64"/></patternFill></fill>`];
const lado = (n, estilo, cor) => (estilo ? `<${n} style="${estilo}"><color rgb="${cor}"/></${n}>` : `<${n}/>`);
const borda = (e, d, c, b) => `<border>${lado("left", e, BORDA)}${lado("right", d, BORDA)}${c ? lado("top", c[0], c[1]) : "<top/>"}${b ? lado("bottom", b[0], b[1]) : "<bottom/>"}<diagonal/></border>`;
const BORDAS = [borda(), borda("thin", "thin", ["thin", BORDA], ["thin", BORDA]), borda("thin", "thin", ["medium", AZUL], ["medium", AZUL]), `<border><left/><right/><top/>${lado("bottom", "medium", AZUL)}<diagonal/></border>`];
const FORMATOS = [[164, "#,##0.0#"], [165, `"▲ "0%;"▼ "0%;"= "0%`]];
// Cor da variação por formatação condicional (verde subiu, vermelho caiu): igual em todo leitor.
const DXFS = [`<dxf><font><b/><color rgb="FF0C8A3E"/></font></dxf>`, `<dxf><font><b/><color rgb="FFC62828"/></font></dxf>`];
// cellXfs: [fonte, preenchimento, borda, formato, alinhamento]
const X = {};
const XFS = [];
function xf(nome, fonte, preench, bord, fmt = 0, alin = "") { X[nome] = XFS.length; XFS.push({ fonte, preench, bord, fmt, alin }); }
xf("normal", 0, 0, 0);
xf("cab", 1, 2, 1, 0, `<alignment vertical="center" wrapText="1"/>`);
xf("cabNum", 1, 2, 1, 0, `<alignment horizontal="right" vertical="center" wrapText="1"/>`);
xf("txt", 0, 0, 1); xf("txtZ", 0, 3, 1);
xf("int", 0, 0, 1, 3); xf("intZ", 0, 3, 1, 3);
xf("dec", 0, 0, 1, 164); xf("decZ", 0, 3, 1, 164);
xf("totTxt", 2, 4, 2); xf("totInt", 2, 4, 2, 3); xf("totDec", 2, 4, 2, 164);
xf("titulo", 3, 0, 0); xf("sub", 4, 0, 0); xf("marca", 5, 0, 0); xf("capa", 6, 0, 0);
xf("rotulo", 7, 0, 0); xf("valor", 0, 0, 0, 0, `<alignment horizontal="left"/>`); xf("secao", 8, 0, 3);
xf("var", 2, 0, 1, 165, `<alignment horizontal="right"/>`); xf("varZ", 2, 3, 1, 165, `<alignment horizontal="right"/>`);
xf("link", 9, 0, 1); xf("linkZ", 9, 3, 1); xf("linkSolto", 9, 0, 0); xf("nota", 10, 0, 0);
const STYLES = `${XML_DECL}<styleSheet xmlns="${NS_MAIN}"><numFmts count="${FORMATOS.length}">${FORMATOS.map(([id, f]) => `<numFmt numFmtId="${id}" formatCode="${xml(f)}"/>`).join("")}</numFmts>`
  + `<fonts count="${FONTES.length}">${FONTES.join("")}</fonts><fills count="${PREENCH.length}">${PREENCH.join("")}</fills><borders count="${BORDAS.length}">${BORDAS.join("")}</borders>`
  + `<cellStyleXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="9" fillId="0" borderId="0" applyNumberFormat="0" applyFill="0" applyBorder="0" applyAlignment="0" applyProtection="0"/></cellStyleXfs>`
  + `<cellXfs count="${XFS.length}">${XFS.map((s) => `<xf numFmtId="${s.fmt}" fontId="${s.fonte}" fillId="${s.preench}" borderId="${s.bord}" xfId="${s.fonte === 9 ? 1 : 0}"${s.fmt ? ' applyNumberFormat="1"' : ""}${s.fonte ? ' applyFont="1"' : ""}${s.preench ? ' applyFill="1"' : ""}${s.bord ? ' applyBorder="1"' : ""}${s.alin ? ` applyAlignment="1">${s.alin}</xf>` : "/>"}`).join("")}</cellXfs>`
  + `<cellStyles count="2"><cellStyle name="Normal" xfId="0" builtinId="0"/><cellStyle name="Hyperlink" xfId="1" builtinId="8"/></cellStyles><dxfs count="${DXFS.length}">${DXFS.join("")}</dxfs><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;

// ---------- montador de aba ----------
// Guarda as células por linha/coluna e escreve o XML na ordem exigida pelo Excel.
class Folha {
  constructor() { this.linhas = new Map(); this.uniao = []; this.links = []; this.alturas = new Map(); this.condicionais = []; }
  cel(r, c, v, estilo = "normal", formula = null) {
    if (!this.linhas.has(r)) this.linhas.set(r, new Map());
    this.linhas.get(r).set(c, { v, s: X[estilo] ?? 0, f: formula });
  }
  unir(r1, c1, r2, c2) { this.uniao.push(`${coluna(c1)}${r1}:${coluna(c2)}${r2}`); }
  link(r, c, aba, texto) { this.links.push({ ref: `${coluna(c)}${r}`, local: `${refAba(aba)}!A1`, texto }); }
  altura(r, pt) { this.alturas.set(r, pt); }
  xmlCelulas() {
    let maxR = 1, maxC = 0;
    const rows = [...this.linhas.keys()].sort((a, b) => a - b).map((r) => {
      const cels = [...this.linhas.get(r).entries()].sort((a, b) => a[0] - b[0]).map(([c, { v, s, f }]) => {
        maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
        const ref = coluna(c) + r, st = s ? ` s="${s}"` : "";
        if (f) {
          if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${st}><f>${xml(f)}</f><v>${v}</v></c>`;
          return `<c r="${ref}"${st} t="str"><f>${xml(f)}</f><v>${xml(v ?? "")}</v></c>`;
        }
        if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
        const t = String(v ?? "").slice(0, LIMITE_CELULA);
        if (!t) return `<c r="${ref}"${st}/>`;
        return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xml(t)}</t></is></c>`;
      }).join("");
      const h = this.alturas.get(r);
      return `<row r="${r}"${h ? ` ht="${h}" customHeight="1"` : ""}>${cels}</row>`;
    }).join("");
    return { rows, maxR, maxC };
  }
}

function folhaXml(folha, { larguras, filtro, temChart, paisagem }) {
  const { rows, maxR, maxC } = folha.xmlCelulas();
  const dim = `A1:${coluna(Math.max(0, maxC))}${maxR}`;
  return `${XML_DECL}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_R}">`
    + `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="${dim}"/>`
    + `<sheetViews><sheetView showGridLines="0" workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>`
    + `<sheetFormatPr defaultRowHeight="15"/>`
    + (larguras.length ? `<cols>${larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "")
    + `<sheetData>${rows}</sheetData>`
    + (filtro ? `<autoFilter ref="${filtro}"/>` : "")
    + (folha.uniao.length ? `<mergeCells count="${folha.uniao.length}">${folha.uniao.map((u) => `<mergeCell ref="${u}"/>`).join("")}</mergeCells>` : "")
    + folha.condicionais.map((faixa, i) => `<conditionalFormatting sqref="${faixa}"><cfRule type="cellIs" dxfId="0" priority="${i * 2 + 1}" operator="greaterThan"><formula>0</formula></cfRule><cfRule type="cellIs" dxfId="1" priority="${i * 2 + 2}" operator="lessThan"><formula>0</formula></cfRule></conditionalFormatting>`).join("")
    + (folha.links.length ? `<hyperlinks>${folha.links.map((l) => `<hyperlink ref="${l.ref}" location="${xml(l.local)}" display="${xml(l.texto)}"/>`).join("")}</hyperlinks>` : "")
    + `<printOptions horizontalCentered="1"/>`
    + `<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.7" header="0.3" footer="0.3"/>`
    + `<pageSetup paperSize="9" orientation="${paisagem ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>`
    + `<headerFooter><oddFooter>${xml("&L&8Help Floripa · Painel da equipe&R&8Página &P de &N")}</oddFooter></headerFooter>`
    + (temChart ? '<drawing r:id="rId1"/>' : "")
    + `</worksheet>`;
}

// Nome de aba válido no Excel: até 31 caracteres, sem \ / ? * [ ] :, sem apóstrofo
// nas pontas, não vazio e sem repetir (o Excel compara sem diferenciar maiúsculas).
function nomesDeAba(nomes) {
  const usados = new Set();
  return nomes.map((nome, i) => {
    const limpo = (s) => String(s ?? "").replace(/[\\/?*[\]:]/g, " ").replace(/[\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "").trim();
    let base = limpo(nome).slice(0, 31).trim() || `Aba ${i + 1}`;
    if (base.toLowerCase() === "history") base = "Histórico";
    let n = base, k = 2;
    while (usados.has(n.toLowerCase())) n = `${base.slice(0, 31 - String(k).length - 1).trim()} ${k++}`;
    usados.add(n.toLowerCase());
    return n;
  });
}

const largura = (v) => String(v ?? "").length;
const ehNumero = (v) => typeof v === "number" && isFinite(v);
const dataHoraBR = (d) => d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Uma aba de dados: título e período no topo, gráfico, tabela formatada e total.
function montarAba(a, nomeAba, op, temCapa, nomeCapa) {
  const f = new Folha();
  const nCols = Math.max(a.cabecalho.length, ...a.linhas.map((l) => l.length), 1);
  f.cel(1, 0, a.titulo || nomeAba, "titulo"); f.altura(1, 24);
  const sub = [op.periodo, op.filtro && op.filtro !== "Nenhum" ? `Filtro: ${op.filtro}` : "", a.sub, `Gerado em ${op.geradoEm}`].filter(Boolean).join("  ·  ");
  f.cel(2, 0, sub, "sub");
  if (temCapa) { f.cel(3, 0, "‹ Voltar ao resumo", "linkSolto"); f.link(3, 0, nomeCapa, "Voltar ao resumo"); }
  const temDados = a.linhas.length > 0;
  // O gráfico vem primeiro (sem título próprio: o título da aba já está no topo) e a tabela logo abaixo.
  const rComGrafico = LINHA_GRAFICO + LINHAS_GRAFICO + 2;
  const chartX = temDados && a.grafico ? chartXml({ ...a.grafico, titulo: "" }, a.cabecalho, a.linhas, nomeAba, rComGrafico) : null;
  const rCab = chartX ? rComGrafico : 5;
  const numericas = a.cabecalho.map((_, c) => c > 0 && a.linhas.some((l) => ehNumero(l[c])) && a.linhas.every((l) => l[c] == null || l[c] === "" || ehNumero(l[c])));
  // Cabeçalho da tabela
  for (let c = 0; c < nCols; c++) f.cel(rCab, c, a.cabecalho[c] ?? "", numericas[c] ? "cabNum" : "cab");
  f.altura(rCab, 20);
  // Linhas (alternadas)
  a.linhas.forEach((l, i) => {
    const r = rCab + 1 + i, z = i % 2 ? "Z" : "";
    for (let c = 0; c < nCols; c++) {
      const v = l[c];
      if (ehNumero(v)) f.cel(r, c, v, (Number.isInteger(v) ? "int" : "dec") + z);
      else f.cel(r, c, v ?? "", "txt" + z);
    }
  });
  let ultimaLinha = rCab + a.linhas.length;
  if (!temDados) { f.cel(rCab + 1, 0, "Sem dados no período escolhido.", "nota"); }
  // Total (soma) das colunas numéricas, com fórmula (continua certo se alguém mexer nos números).
  if (temDados && a.total !== false && numericas.some(Boolean)) {
    const r = ultimaLinha + 1;
    for (let c = 0; c < nCols; c++) {
      if (c === 0) { f.cel(r, 0, "Total", "totTxt"); continue; }
      if (!numericas[c]) { f.cel(r, c, "", "totTxt"); continue; }
      const L = coluna(c), soma = a.linhas.reduce((s, l) => s + (ehNumero(l[c]) ? l[c] : 0), 0);
      const inteiro = a.linhas.every((l) => !ehNumero(l[c]) || Number.isInteger(l[c]));
      f.cel(r, c, Math.round(soma * 1e6) / 1e6, inteiro ? "totInt" : "totDec", `SUM(${L}${rCab + 1}:${L}${ultimaLinha})`);
    }
    f.altura(r, 18);
  }
  // Larguras: pelo texto mais longo de cada coluna (entre 10 e 50).
  const larguras = Array.from({ length: nCols }, (_, c) => Math.min(50, Math.max(c === 0 ? 16 : 11, largura(a.cabecalho[c]) + 3, ...a.linhas.map((l) => largura(ehNumero(l[c]) ? l[c].toLocaleString("pt-BR") : l[c]) + 2))));
  // Tabela pelo menos da largura do gráfico (16 cm ≈ 84 caracteres): a folha fica alinhada.
  const soma = larguras.reduce((x, w) => x + w, 0);
  if (chartX && soma < 84) { const extra = 84 - soma; larguras[0] += Math.round(extra * 0.4); for (let c = 1; c < nCols; c++) larguras[c] += Math.round((extra * 0.6) / Math.max(1, nCols - 1)); }
  const filtro = temDados ? `A${rCab}:${coluna(nCols - 1)}${ultimaLinha}` : null;
  const paisagem = larguras.reduce((s, w) => s + w, 0) > 110;
  return { xml: folhaXml(f, { larguras, filtro, temChart: !!chartX, paisagem }), chart: chartX, filtro, rCab, linhaGrafico: LINHA_GRAFICO };
}

// Capa ("Resumo"): nome, período, filtro, data, números principais com variação e índice.
function montarCapa(op, abas, nomes) {
  const f = new Folha();
  f.cel(1, 0, "HELP FLORIPA", "marca");
  f.cel(2, 0, op.titulo, "capa"); f.altura(2, 34);
  f.cel(3, 0, op.descricao || "Relatório gerado pelo painel da equipe", "sub");
  let r = 5;
  const par = (rot, val) => { f.cel(r, 0, rot, "rotulo"); f.cel(r, 1, val, "valor"); f.unir(r, 1, r, 4); r++; };
  par("Período", op.periodo || "—");
  par("Filtro aplicado", op.filtro || "Nenhum");
  par("Gerado em", `${op.geradoEm}${op.autor ? " por " + op.autor : ""}`);
  r++;
  const ind = (op.indicadores || []).filter((l) => l && l[0]);
  if (ind.length) {
    f.cel(r, 0, "Números principais", "secao"); for (let c = 1; c < 5; c++) f.cel(r, c, "", "secao"); f.altura(r, 22); r += 2;
    ["Indicador", "Período", "Período anterior", "Variação"].forEach((t, c) => f.cel(r, c, t, c ? "cabNum" : "cab")); f.altura(r, 20);
    ind.forEach(([nome, atual, ant], i) => {
      r++; const z = i % 2 ? "Z" : "";
      f.cel(r, 0, nome, "txt" + z);
      const estNum = (v) => (Number.isInteger(v) ? "int" : "dec") + z;
      f.cel(r, 1, ehNumero(atual) ? atual : atual ?? "", ehNumero(atual) ? estNum(atual) : "txt" + z);
      f.cel(r, 2, ehNumero(ant) ? ant : "", ehNumero(ant) ? estNum(ant) : "txt" + z);
      const varia = ehNumero(atual) && ehNumero(ant) && ant !== 0 ? Math.round(((atual - ant) / ant) * 10000) / 10000 : "";
      f.cel(r, 3, varia, "var" + z, `IF(OR(C${r}="",C${r}=0),"",(B${r}-C${r})/C${r})`);
    });
    f.condicionais.push(`D${r - ind.length + 1}:D${r}`);
    r += 2;
    f.cel(r, 0, "Variação: comparação com o período anterior de mesmo tamanho. ▲ subiu · ▼ caiu.", "nota"); r += 2;
  }
  f.cel(r, 0, "Índice", "secao"); for (let c = 1; c < 5; c++) f.cel(r, c, "", "secao"); f.altura(r, 22); r += 2;
  ["Aba", "Conteúdo", "", "", "Linhas"].forEach((t, c) => f.cel(r, c, t, c === 4 ? "cabNum" : "cab")); f.unir(r, 1, r, 3); f.altura(r, 20);
  abas.forEach((a, i) => {
    r++; const z = i % 2 ? "Z" : "";
    f.cel(r, 0, nomes[i], "link" + z); f.link(r, 0, nomes[i], nomes[i]);
    f.cel(r, 1, a.sub || (a.grafico && a.linhas.length ? "Gráfico e tabela" : "Tabela"), "txt" + z); f.cel(r, 2, "", "txt" + z); f.cel(r, 3, "", "txt" + z); f.unir(r, 1, r, 3);
    f.cel(r, 4, a.linhas.length, "int" + z);
  });
  const larguras = [38, 16, 18, 14, 12];
  return folhaXml(f, { larguras, filtro: null, temChart: false, paisagem: false });
}

// Várias abas num .xlsx só. Com opcoes.titulo, a primeira aba é a capa "Resumo".
// abas: [{ nome, titulo?, sub?, cabecalho, linhas, grafico?: { tipo, titulo }, total?: false }]
// opcoes: { titulo, descricao, periodo, filtro, autor, indicadores: [[nome, atual, anterior]] }
export function gerarXlsxMulti(abas, opcoes = {}) {
  abas = (abas && abas.length ? abas : [{ nome: "Dados", cabecalho: [], linhas: [] }])
    .map((a) => ({ ...a, cabecalho: (a.cabecalho || []).map((v) => String(v ?? "")), linhas: numerizar(a.linhas || []) }));
  const op = { ...opcoes, geradoEm: dataHoraBR(new Date()) };
  const temCapa = !!op.titulo;
  const todosNomes = nomesDeAba([...(temCapa ? ["Resumo"] : []), ...abas.map((a) => a.nome)]);
  const nomeCapa = temCapa ? todosNomes[0] : null;
  const nomes = temCapa ? todosNomes.slice(1) : todosNomes;
  const folhas = [];
  if (temCapa) folhas.push({ nome: nomeCapa, xml: montarCapa(op, abas, nomes), chart: null, filtro: null });
  abas.forEach((a, i) => folhas.push({ nome: nomes[i], ...montarAba(a, nomes[i], op, temCapa, nomeCapa) }));

  const partes = [], ct = [], wbRels = [], nomesDef = [];
  folhas.forEach((fo, i) => {
    const idx = i + 1;
    partes.push([`xl/worksheets/sheet${idx}.xml`, fo.xml]);
    wbRels.push(`<Relationship Id="rId${idx}" Type="${REL}/worksheet" Target="worksheets/sheet${idx}.xml"/>`);
    ct.push(`<Override PartName="/xl/worksheets/sheet${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    if (fo.filtro) {
      const [a1, b1] = fo.filtro.split(":");
      const abs = (ref) => ref.replace(/^([A-Z]+)(\d+)$/, "$$$1$$$2");
      nomesDef.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${xml(refAba(fo.nome))}!${abs(a1)}:${abs(b1)}</definedName>`);
      // Ao imprimir, o cabeçalho da tabela se repete em cada página.
      nomesDef.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${xml(refAba(fo.nome))}!$${fo.rCab}:$${fo.rCab}</definedName>`);
    }
    if (fo.chart) {
      partes.push(
        [`xl/worksheets/_rels/sheet${idx}.xml.rels`, relsXml(`<Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing${idx}.xml"/>`)],
        [`xl/drawings/drawing${idx}.xml`, drawingXml(fo.linhaGrafico)],
        [`xl/drawings/_rels/drawing${idx}.xml.rels`, relsXml(`<Relationship Id="rId1" Type="${REL}/chart" Target="../charts/chart${idx}.xml"/>`)],
        [`xl/charts/chart${idx}.xml`, fo.chart]
      );
      ct.push(`<Override PartName="/xl/drawings/drawing${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`, `<Override PartName="/xl/charts/chart${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
    }
  });
  // O Excel exige os nomes definidos em ordem: _FilterDatabase antes de Print_Titles para cada aba.
  const n = folhas.length;
  const agora = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const tiposFixos = `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
    + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
    + `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
    + `<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`
    + `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`
    + `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`;
  const titulo = op.titulo || folhas[0].nome;
  const arquivos = [
    ["[Content_Types].xml", `${XML_DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${tiposFixos}${ct.join("")}</Types>`],
    ["_rels/.rels", relsXml(`<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/>`)],
    ["docProps/core.xml", `${XML_DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(titulo)}</dc:title><dc:creator>Help Floripa</dc:creator><cp:lastModifiedBy>Help Floripa</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${agora}</dcterms:modified></cp:coreProperties>`],
    ["docProps/app.xml", `${XML_DECL}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Planilhas</vt:lpstr></vt:variant><vt:variant><vt:i4>${n}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${n}" baseType="lpstr">${folhas.map((x) => `<vt:lpstr>${xml(x.nome)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts><Company>Help Floripa</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>`],
    ["xl/workbook.xml", `${XML_DECL}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_R}"><workbookPr defaultThemeVersion="164011"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="16384" windowHeight="8192" activeTab="0"/></bookViews><sheets>${folhas.map((x, i) => `<sheet name="${xml(x.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${nomesDef.length ? `<definedNames>${nomesDef.join("")}</definedNames>` : ""}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ["xl/_rels/workbook.xml.rels", relsXml(`${wbRels.join("")}<Relationship Id="rId${n + 1}" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rId${n + 2}" Type="${REL}/theme" Target="theme/theme1.xml"/>`)],
    ["xl/styles.xml", STYLES],
    ["xl/theme/theme1.xml", TEMA],
    ...partes
  ];
  return zip(arquivos);
}

// Uma aba só (botão "Excel" de cada cartão): título, gráfico e tabela, sem capa.
export function gerarXlsx(cabecalho, linhas, aba = "Dados", grafico = null) {
  return gerarXlsxMulti([{ nome: aba, titulo: grafico?.titulo || aba, cabecalho, linhas, grafico }]);
}

// Baixa a planilha: nome-AAAA-MM-DD.xlsx (grafico opcional: { tipo, titulo })
export function baixarPlanilha(nome, cabecalho, linhas, aba, grafico) {
  baixar(nome, gerarXlsx(cabecalho, linhas, aba || nome, grafico));
}
// Baixa um .xlsx com várias abas (cada uma com seu gráfico) e, com opcoes.titulo, a capa "Resumo".
export function baixarPlanilhaMulti(nome, abas, opcoes) {
  baixar(nome, gerarXlsxMulti(abas, opcoes));
}
function baixar(nome, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${String(nome).replace(/[\\/:*?"<>|]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
