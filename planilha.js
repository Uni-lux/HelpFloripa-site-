// =====================================================
// Planilha do Excel (.xlsx) feita no próprio navegador, sem bibliotecas.
// Abre direto no Excel, Google Planilhas, Numbers e no celular, com
// cabeçalho em negrito, primeira linha fixa, colunas na largura do texto
// e, quando pedido, um gráfico nativo embutido (barras, colunas, linha ou pizza).
// =====================================================
const enc = new TextEncoder();
const xml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

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
  for (const [nome, texto] of arquivos) {
    const n = enc.encode(nome), dados = enc.encode(texto), crc = crc32(dados);
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(dados.length), ...u32(dados.length), ...u16(n.length), ...u16(0)]);
    partes.push(local, n, dados);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(dados.length), ...u32(dados.length), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), n);
    pos += local.length + n.length + dados.length;
  }
  const tamCentral = central.reduce((a, b) => a + b.length, 0);
  const fim = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(arquivos.length), ...u16(arquivos.length), ...u32(tamCentral), ...u32(pos), ...u16(0)]);
  return new Blob([...partes, ...central, fim], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const coluna = (i) => { let s = ""; i++; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };

// Paleta do gráfico (mesma família das cores do painel, legível no Excel claro).
const CORES = ["2E86DE", "E8833A", "27AE60", "E6B800", "7C5CFF", "E0457B", "00ADEE", "EF4444", "16A085", "8E44AD"];

// Colunas numéricas viram séries do gráfico; a 1ª coluna são os rótulos (categorias).
function series(cabecalho, linhas) {
  const cats = linhas.map((l) => String(l[0] ?? ""));
  const sers = [];
  for (let c = 1; c < cabecalho.length; c++) {
    const nums = linhas.map((l) => { const v = l[c]; if (typeof v === "number" && isFinite(v)) return v; const t = String(v ?? "").trim(); return /^-?\d/.test(t) ? Number(t.replace(/\./g, "").replace(",", ".")) : null; });
    if (nums.some((v) => v != null && isFinite(v))) sers.push({ col: c, nome: String(cabecalho[c] ?? "Série"), nums: nums.map((v) => (v == null || !isFinite(v) ? 0 : v)) });
  }
  return { cats, sers };
}

function chartXml(grafico, cabecalho, linhas) {
  const { cats, sers } = series(cabecalho, linhas);
  if (!sers.length || !cats.length) return null;
  const lastRow = linhas.length + 1; // linha 1 = cabeçalho
  const tipo = grafico.tipo || "coluna";
  const pizza = tipo === "pizza";
  const strCache = (arr) => `<c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${xml(v)}</c:v></c:pt>`).join("")}`;
  const numCache = (arr) => `<c:formatCode>General</c:formatCode><c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join("")}`;
  const catRef = `<c:cat><c:strRef><c:f>Dados!$A$2:$A$${lastRow}</c:f><c:strCache>${strCache(cats)}</c:strCache></c:strRef></c:cat>`;
  const serXml = sers.map((sr, si) => {
    const L = coluna(sr.col);
    const tx = `<c:tx><c:strRef><c:f>Dados!$${L}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${xml(sr.nome)}</c:v></c:pt></c:strCache></c:strRef></c:tx>`;
    const fill = pizza ? "" : `<c:spPr><a:solidFill><a:srgbClr val="${CORES[si % CORES.length]}"/></a:solidFill></c:spPr>`;
    const dPts = pizza ? cats.map((_, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${CORES[i % CORES.length]}"/></a:solidFill></c:spPr></c:dPt>`).join("") : "";
    const marker = tipo === "linha" ? `<c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="${CORES[si % CORES.length]}"/></a:solidFill></c:spPr></c:marker>` : "";
    const linhaCor = tipo === "linha" ? `<c:spPr><a:ln w="22225"><a:solidFill><a:srgbClr val="${CORES[si % CORES.length]}"/></a:solidFill></a:ln></c:spPr>` : "";
    const val = `<c:val><c:numRef><c:f>Dados!$${L}$2:$${L}$${lastRow}</c:f><c:numCache>${numCache(sr.nums)}</c:numCache></c:numRef></c:val>`;
    const smooth = tipo === "linha" ? `<c:smooth val="0"/>` : "";
    return `<c:ser><c:idx val="${si}"/><c:order val="${si}"/>${tx}${fill}${linhaCor}${dPts}${marker}${catRef}${val}${smooth}</c:ser>`;
  }).join("");
  const eixos = (horiz) => `<c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${horiz ? "l" : "b"}"/><c:crossAx val="2"/></c:catAx><c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${horiz ? "b" : "l"}"/><c:majorGridlines/><c:crossAx val="1"/></c:valAx>`;
  let plot;
  if (pizza) plot = `<c:pieChart><c:varyColors val="1"/>${serXml}<c:firstSliceAng val="0"/></c:pieChart>`;
  else if (tipo === "linha") plot = `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${serXml}<c:marker val="1"/><c:axId val="1"/><c:axId val="2"/></c:lineChart>${eixos(false)}`;
  else { const dir = tipo === "barra" ? "bar" : "col"; plot = `<c:barChart><c:barDir val="${dir}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${serXml}<c:gapWidth val="80"/><c:axId val="1"/><c:axId val="2"/></c:barChart>${eixos(dir === "bar")}`; }
  const titulo = grafico.titulo ? `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr b="1" sz="1200"/></a:pPr><a:r><a:rPr lang="pt-BR" b="1" sz="1200"/><a:t>${xml(grafico.titulo)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>` : `<c:autoTitleDeleted val="1"/>`;
  const legenda = sers.length > 1 || pizza ? `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:chart>${titulo}<c:plotArea><c:layout/>${plot}</c:plotArea>${legenda}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;
}

function drawingXml(startRow) {
  const to = startRow + 18;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${startRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${to}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Grafico 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
}

export function gerarXlsx(cabecalho, linhas, aba = "Dados", grafico = null) {
  const todas = [cabecalho, ...linhas];
  const larg = cabecalho.map((_, c) => Math.min(60, Math.max(8, ...todas.map((l) => String(l[c] ?? "").length + 2))));
  const celula = (v, r, c, cab) => {
    const ref = coluna(c) + (r + 1);
    if (!cab && typeof v === "number" && isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
    const t = String(v ?? ""); if (!t) return "";
    return `<c r="${ref}" t="inlineStr"${cab ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(t)}</t></is></c>`;
  };
  const linhasXml = todas.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => celula(v, r, c, r === 0)).join("")}</row>`).join("");
  // O gráfico (quando houver dados numéricos) entra logo abaixo da tabela.
  const chart = grafico ? chartXml(grafico, cabecalho, linhas) : null;
  const folha = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${larg.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${linhasXml}</sheetData>${cabecalho.length ? `<autoFilter ref="A1:${coluna(cabecalho.length - 1)}${todas.length}"/>` : ""}${chart ? '<drawing r:id="rId1"/>' : ""}</worksheet>`;
  const nomeAba = xml(String(aba).replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Dados");
  const tipos = [
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
  ];
  if (chart) tipos.push(`<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`, `<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
  const arquivos = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${tipos.join("")}</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nomeAba}" sheetId="1" r:id="rId1"/></sheets>${cabecalho.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${nomeAba}'!$A$1:$${coluna(cabecalho.length - 1)}$${todas.length}</definedName></definedNames>` : ""}</workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B7FAE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ["xl/worksheets/sheet1.xml", folha]
  ];
  if (chart) {
    const startRow = linhas.length + 2; // uma linha em branco depois da tabela
    arquivos.push(
      ["xl/worksheets/_rels/sheet1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`],
      ["xl/drawings/drawing1.xml", drawingXml(startRow)],
      ["xl/drawings/_rels/drawing1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`],
      ["xl/charts/chart1.xml", chart]
    );
  }
  return zip(arquivos);
}

const numerizar = (linhas) => linhas.map((l) => l.map((v) => (typeof v === "string" && /^-?\d{1,9}([.,]\d+)?$/.test(v.trim()) && !/^0\d/.test(v.trim()) ? Number(v.replace(",", ".")) : v)));

const CONTENT_FIXO = `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`;
const RELS_RAIZ = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B7FAE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
const relsSimples = (corpo) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${corpo}</Relationships>`;

function folhaXml(cabecalho, linhas, temChart) {
  const todas = [cabecalho, ...linhas];
  const larg = cabecalho.map((_, c) => Math.min(60, Math.max(8, ...todas.map((l) => String(l[c] ?? "").length + 2))));
  const celula = (v, r, c, cab) => { const ref = coluna(c) + (r + 1); if (!cab && typeof v === "number" && isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`; const t = String(v ?? ""); if (!t) return ""; return `<c r="${ref}" t="inlineStr"${cab ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(t)}</t></is></c>`; };
  const linhasXml = todas.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => celula(v, r, c, r === 0)).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${larg.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${linhasXml}</sheetData>${cabecalho.length ? `<autoFilter ref="A1:${coluna(cabecalho.length - 1)}${todas.length}"/>` : ""}${temChart ? '<drawing r:id="rId1"/>' : ""}</worksheet>`;
}

// Várias abas num .xlsx só, cada uma com sua tabela e (opcional) seu gráfico.
// abas: [{ nome, cabecalho, linhas, grafico }]
export function gerarXlsxMulti(abas) {
  abas = (abas && abas.length ? abas : [{ nome: "Dados", cabecalho: [], linhas: [] }]).map((a) => ({ ...a, linhas: numerizar(a.linhas || []) }));
  const usados = new Set();
  const nomeAba = (s, i) => { let n = xml(String(s || `Aba ${i + 1}`).replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || `Aba ${i + 1}`); let base = n, k = 2; while (usados.has(n.toLowerCase())) { n = `${base.slice(0, 27)} ${k++}`; } usados.add(n.toLowerCase()); return n; };
  const nomes = abas.map((a, i) => nomeAba(a.nome, i));
  const sheetParts = [], extraParts = [], wbRels = [], ct = [];
  abas.forEach((a, i) => {
    const idx = i + 1;
    const chart = a.grafico ? chartXml(a.grafico, a.cabecalho, a.linhas) : null;
    sheetParts.push([`xl/worksheets/sheet${idx}.xml`, folhaXml(a.cabecalho, a.linhas, !!chart)]);
    wbRels.push(`<Relationship Id="rId${idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx}.xml"/>`);
    ct.push(`<Override PartName="/xl/worksheets/sheet${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    if (chart) {
      extraParts.push(
        [`xl/worksheets/_rels/sheet${idx}.xml.rels`, relsSimples(`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${idx}.xml"/>`)],
        [`xl/drawings/drawing${idx}.xml`, drawingXml(a.linhas.length + 2)],
        [`xl/drawings/_rels/drawing${idx}.xml.rels`, relsSimples(`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${idx}.xml"/>`)],
        [`xl/charts/chart${idx}.xml`, chart]
      );
      ct.push(`<Override PartName="/xl/drawings/drawing${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`, `<Override PartName="/xl/charts/chart${idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
    }
  });
  const stylesRid = `rId${abas.length + 1}`;
  const arquivos = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${CONTENT_FIXO}${ct.join("")}</Types>`],
    ["_rels/.rels", RELS_RAIZ],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nomes.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", relsSimples(`${wbRels.join("")}<Relationship Id="${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`)],
    ["xl/styles.xml", STYLES],
    ...sheetParts, ...extraParts
  ];
  return zip(arquivos);
}

// Baixa a planilha: nome-AAAA-MM-DD.xlsx (grafico opcional: { tipo, titulo })
export function baixarPlanilha(nome, cabecalho, linhas, aba, grafico) {
  baixar(nome, gerarXlsx(cabecalho, numerizar(linhas), aba || nome, grafico));
}
// Baixa um .xlsx com várias abas (cada uma com seu gráfico).
export function baixarPlanilhaMulti(nome, abas) {
  baixar(nome, gerarXlsxMulti(abas));
}
function baixar(nome, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
