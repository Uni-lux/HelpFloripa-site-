// =====================================================
// Planilha do Excel (.xlsx) feita no próprio navegador, sem bibliotecas.
// Abre no Microsoft Excel, Google Planilhas, Numbers, LibreOffice e no celular,
// com cabeçalho em negrito, primeira linha fixa, filtro, colunas na largura do
// texto e, quando pedido, um gráfico nativo embutido (barras, colunas, linha ou pizza).
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
function chartXml(grafico, cabecalho, linhas, aba) {
  const { cats, sers } = series(cabecalho, linhas);
  if (!sers.length || !cats.length) return null;
  const A = refAba(aba);
  const ultima = linhas.length + 1; // linha 1 = cabeçalho
  const tipo = ["coluna", "barra", "linha", "pizza"].includes(grafico.tipo) ? grafico.tipo : "coluna";
  const pizza = tipo === "pizza", linha = tipo === "linha";
  const cor = (i) => CORES[i % CORES.length];
  const strCache = (arr) => `<c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${xml(v)}</c:v></c:pt>`).join("")}`;
  const numCache = (arr) => `<c:formatCode>General</c:formatCode><c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join("")}`;
  const catRef = `<c:cat><c:strRef><c:f>${xml(A)}!$A$2:$A$${ultima}</c:f><c:strCache>${strCache(cats)}</c:strCache></c:strRef></c:cat>`;
  const serXml = sers.map((sr, si) => {
    const L = coluna(sr.col);
    const tx = `<c:tx><c:strRef><c:f>${xml(A)}!$${L}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${xml(sr.nome)}</c:v></c:pt></c:strCache></c:strRef></c:tx>`;
    let visual = "";
    if (linha) visual = `<c:spPr><a:ln w="22225" cap="rnd"><a:solidFill><a:srgbClr val="${cor(si)}"/></a:solidFill><a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="${cor(si)}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:marker>`;
    else if (pizza) visual = cats.map((_, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${cor(i)}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join("");
    else visual = `<c:spPr><a:solidFill><a:srgbClr val="${cor(si)}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>`;
    const val = `<c:val><c:numRef><c:f>${xml(A)}!$${L}$2:$${L}$${ultima}</c:f><c:numCache>${numCache(sr.nums)}</c:numCache></c:numRef></c:val>`;
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

function drawingXml(linhaInicial) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${linhaInicial}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${linhaInicial + 18}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Gráfico 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
}

// Números em texto ("12", "3,5") viram número de verdade (somam e entram no gráfico).
// "0123" (CEP, telefone) continua texto.
const numerizar = (linhas) => linhas.map((l) => (l || []).map((v) => (typeof v === "string" && /^-?\d{1,9}([.,]\d+)?$/.test(v.trim()) && !/^-?0\d/.test(v.trim()) ? Number(v.trim().replace(",", ".")) : v)));

const XML_DECL = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const relsXml = (corpo) => `${XML_DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${corpo}</Relationships>`;
// Estilos: 0 = normal, 1 = cabeçalho (branco em negrito sobre azul).
const STYLES = `${XML_DECL}<styleSheet xmlns="${NS_MAIN}"><fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B7FAE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
// Tema mínimo do Office (as cores "theme" dos estilos e dos gráficos vêm daqui).
const TEMA = `${XML_DECL}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="2E86DE"/></a:accent1><a:accent2><a:srgbClr val="E8833A"/></a:accent2><a:accent3><a:srgbClr val="27AE60"/></a:accent3><a:accent4><a:srgbClr val="E6B800"/></a:accent4><a:accent5><a:srgbClr val="7C5CFF"/></a:accent5><a:accent6><a:srgbClr val="E0457B"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

function folhaXml(cabecalho, linhas, temChart) {
  const todas = [cabecalho, ...linhas];
  const nCols = Math.max(0, ...todas.map((l) => l.length));
  const celula = (v, r, c, cab) => {
    const ref = coluna(c) + (r + 1);
    if (!cab && typeof v === "number" && isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
    const t = String(v ?? "").slice(0, LIMITE_CELULA); if (!t) return "";
    return `<c r="${ref}"${cab ? ' s="1"' : ""} t="inlineStr"><is><t xml:space="preserve">${xml(t)}</t></is></c>`;
  };
  const linhasXml = todas.map((l, r) => {
    const cels = l.map((v, c) => celula(v, r, c, r === 0)).join("");
    return cels ? `<row r="${r + 1}">${cels}</row>` : "";
  }).join("");
  const larguras = Array.from({ length: nCols }, (_, c) => Math.min(60, Math.max(8, ...todas.map((l) => String(l[c] ?? "").length + 2))));
  const dim = nCols ? `A1:${coluna(nCols - 1)}${todas.length}` : "A1";
  return `${XML_DECL}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_R}"><dimension ref="${dim}"/>`
    + `<sheetViews><sheetView workbookViewId="0">${cabecalho.length ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' : ""}</sheetView></sheetViews>`
    + `<sheetFormatPr defaultRowHeight="15"/>`
    + (larguras.length ? `<cols>${larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "")
    + `<sheetData>${linhasXml}</sheetData>`
    + (cabecalho.length ? `<autoFilter ref="A1:${coluna(cabecalho.length - 1)}${todas.length}"/>` : "")
    + `<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>`
    + (temChart ? '<drawing r:id="rId1"/>' : "")
    + `</worksheet>`;
}

// Nome de aba válido no Excel: até 31 caracteres, sem \ / ? * [ ] :, sem apóstrofo
// nas pontas, não vazio e sem repetir (o Excel compara sem diferenciar maiúsculas).
function nomesDeAba(abas) {
  const usados = new Set();
  return abas.map((a, i) => {
    const limpo = (s) => String(s ?? "").replace(/[\\/?*[\]:]/g, " ").replace(/[\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "").trim();
    let base = limpo(a.nome).slice(0, 31).trim() || `Aba ${i + 1}`;
    if (base.toLowerCase() === "history") base = "Histórico";
    let n = base, k = 2;
    while (usados.has(n.toLowerCase())) n = `${base.slice(0, 31 - String(k).length - 1).trim()} ${k++}`;
    usados.add(n.toLowerCase());
    return n;
  });
}

// Várias abas num .xlsx só, cada uma com sua tabela e (opcional) seu gráfico.
// abas: [{ nome, cabecalho, linhas, grafico: { tipo: "coluna"|"barra"|"linha"|"pizza", titulo } }]
export function gerarXlsxMulti(abas) {
  abas = (abas && abas.length ? abas : [{ nome: "Dados", cabecalho: [], linhas: [] }])
    .map((a) => ({ ...a, cabecalho: (a.cabecalho || []).map((v) => String(v ?? "")), linhas: numerizar(a.linhas || []) }));
  const nomes = nomesDeAba(abas);
  const partes = [], ct = [], wbRels = [], filtros = [];
  abas.forEach((a, i) => {
    const idx = i + 1;
    const chart = a.grafico ? chartXml(a.grafico, a.cabecalho, a.linhas, nomes[i]) : null;
    partes.push([`xl/worksheets/sheet${idx}.xml`, folhaXml(a.cabecalho, a.linhas, !!chart)]);
    wbRels.push(`<Relationship Id="rId${idx}" Type="${REL}/worksheet" Target="worksheets/sheet${idx}.xml"/>`);
    ct.push(`<Override PartName="/xl/worksheets/sheet${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    if (a.cabecalho.length) filtros.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${xml(refAba(nomes[i]))}!$A$1:$${coluna(a.cabecalho.length - 1)}$${a.linhas.length + 1}</definedName>`);
    if (chart) {
      partes.push(
        [`xl/worksheets/_rels/sheet${idx}.xml.rels`, relsXml(`<Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing${idx}.xml"/>`)],
        [`xl/drawings/drawing${idx}.xml`, drawingXml(a.linhas.length + 2)],
        [`xl/drawings/_rels/drawing${idx}.xml.rels`, relsXml(`<Relationship Id="rId1" Type="${REL}/chart" Target="../charts/chart${idx}.xml"/>`)],
        [`xl/charts/chart${idx}.xml`, chart]
      );
      ct.push(`<Override PartName="/xl/drawings/drawing${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`, `<Override PartName="/xl/charts/chart${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
    }
  });
  const n = abas.length;
  const agora = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const tiposFixos = `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
    + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
    + `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
    + `<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`
    + `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`
    + `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`;
  const arquivos = [
    ["[Content_Types].xml", `${XML_DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${tiposFixos}${ct.join("")}</Types>`],
    ["_rels/.rels", relsXml(`<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/>`)],
    ["docProps/core.xml", `${XML_DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Help Floripa</dc:creator><cp:lastModifiedBy>Help Floripa</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${agora}</dcterms:modified></cp:coreProperties>`],
    ["docProps/app.xml", `${XML_DECL}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Planilhas</vt:lpstr></vt:variant><vt:variant><vt:i4>${n}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${n}" baseType="lpstr">${nomes.map((x) => `<vt:lpstr>${xml(x)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts><Company>Help Floripa</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>`],
    ["xl/workbook.xml", `${XML_DECL}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_R}"><workbookPr defaultThemeVersion="164011"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="16384" windowHeight="8192" activeTab="0"/></bookViews><sheets>${nomes.map((x, i) => `<sheet name="${xml(x)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${filtros.length ? `<definedNames>${filtros.join("")}</definedNames>` : ""}<calcPr calcId="191029"/></workbook>`],
    ["xl/_rels/workbook.xml.rels", relsXml(`${wbRels.join("")}<Relationship Id="rId${n + 1}" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rId${n + 2}" Type="${REL}/theme" Target="theme/theme1.xml"/>`)],
    ["xl/styles.xml", STYLES],
    ["xl/theme/theme1.xml", TEMA],
    ...partes
  ];
  return zip(arquivos);
}

// Uma aba só (botão "Excel" de cada cartão).
export function gerarXlsx(cabecalho, linhas, aba = "Dados", grafico = null) {
  return gerarXlsxMulti([{ nome: aba, cabecalho, linhas, grafico }]);
}

// Baixa a planilha: nome-AAAA-MM-DD.xlsx (grafico opcional: { tipo, titulo })
export function baixarPlanilha(nome, cabecalho, linhas, aba, grafico) {
  baixar(nome, gerarXlsx(cabecalho, linhas, aba || nome, grafico));
}
// Baixa um .xlsx com várias abas (cada uma com seu gráfico).
export function baixarPlanilhaMulti(nome, abas) {
  baixar(nome, gerarXlsxMulti(abas));
}
function baixar(nome, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${String(nome).replace(/[\\/:*?"<>|]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
