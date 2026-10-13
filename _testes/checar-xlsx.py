# Checagens de consistência que o validador de esquema não faz.
import sys, zipfile, re, posixpath
from lxml import etree
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "ct": "http://schemas.openxmlformats.org/package/2006/content-types", "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
      "c": "http://schemas.openxmlformats.org/drawingml/2006/chart"}
def col2n(s):
    n = 0
    for ch in s: n = n * 26 + ord(ch) - 64
    return n
erros = []
f = sys.argv[1]
z = zipfile.ZipFile(f)
assert z.testzip() is None
nomes = z.namelist()
if nomes[0] != "[Content_Types].xml": erros.append("[Content_Types].xml não é o primeiro")
if len(set(nomes)) != len(nomes): erros.append("partes repetidas no zip")
docs = {}
for n in nomes:
    try: docs[n] = etree.fromstring(z.read(n))
    except Exception as e: erros.append(f"XML mal formado {n}: {e}")
ct = docs["[Content_Types].xml"]
over = {o.get("PartName"): o.get("ContentType") for o in ct.findall("ct:Override", NS)}
defs = {d.get("Extension"): d.get("ContentType") for d in ct.findall("ct:Default", NS)}
for n in nomes:
    if "/" + n not in over and n.rsplit(".", 1)[-1] not in defs: erros.append(f"sem content type: {n}")
for p in over:
    if p[1:] not in nomes: erros.append(f"override para parte inexistente: {p}")
for n in nomes:
    if n.endswith(".rels"):
        base = posixpath.dirname(posixpath.dirname(n))
        for r in docs[n].findall("pr:Relationship", NS):
            if r.get("TargetMode") == "External": continue
            alvo = posixpath.normpath(posixpath.join(base, r.get("Target"))).lstrip("/")
            if alvo not in nomes: erros.append(f"rel quebrada {n} -> {alvo}")
        ids = [r.get("Id") for r in docs[n].findall("pr:Relationship", NS)]
        if len(ids) != len(set(ids)): erros.append(f"Id repetido em {n}")
wb = docs["xl/workbook.xml"]
abas = [s.get("name") for s in wb.findall("m:sheets/m:sheet", NS)]
ids = [s.get("sheetId") for s in wb.findall("m:sheets/m:sheet", NS)]
if len(set(a.lower() for a in abas)) != len(abas): erros.append(f"abas repetidas {abas}")
if len(set(ids)) != len(ids): erros.append("sheetId repetido")
for a in abas:
    if not a or len(a) > 31 or re.search(r"[\\/?*\[\]:]", a) or a.startswith("'") or a.endswith("'") or a.lower() == "history": erros.append(f"nome de aba inválido: {a!r}")
def ref_ok(fml, onde):
    m = re.match(r"^'((?:[^']|'')+)'!(\$?[A-Z]+\$?\d+(:\$?[A-Z]+\$?\d+)?|\$\d+:\$\d+)$", fml)
    if not m: erros.append(f"fórmula estranha em {onde}: {fml}"); return
    if m.group(1).replace("''", "'") not in abas: erros.append(f"fórmula aponta para aba inexistente em {onde}: {fml}")
for d in wb.findall("m:definedNames/m:definedName", NS):
    ref_ok(d.text, "definedName")
    ls = d.get("localSheetId")
    if ls is not None and int(ls) >= len(abas): erros.append(f"localSheetId inexistente {ls}")
pares = [(d.get("name"), d.get("localSheetId")) for d in wb.findall("m:definedNames/m:definedName", NS)]
if len(pares) != len(set(pares)): erros.append("nome definido repetido")
for n in nomes:
    if n.startswith("xl/charts/"):
        for fml in docs[n].iter("{%s}f" % NS["c"]): ref_ok(fml.text, n)
    if n.startswith("xl/worksheets/sheet"):
        ultima = 0
        for row in docs[n].findall("m:sheetData/m:row", NS):
            r = int(row.get("r"))
            if r <= ultima: erros.append(f"linhas fora de ordem {n} {r}")
            ultima = r; uc = 0
            for c in row.findall("m:c", NS):
                mm = re.match(r"^([A-Z]+)(\d+)$", c.get("r"))
                if int(mm.group(2)) != r: erros.append(f"célula na linha errada {n} {c.get('r')}")
                cn = col2n(mm.group(1))
                if cn <= uc: erros.append(f"células fora de ordem {n} {c.get('r')}")
                uc = cn
                t = "".join(c.itertext())
                if len(t) > 32767: erros.append(f"texto > 32767 em {n} {c.get('r')}")
        for hl in docs[n].findall("m:hyperlinks/m:hyperlink", NS):
            if hl.get("location"): ref_ok(hl.get("location"), n + " hyperlink")
        # células mescladas não podem se sobrepor
        cel = set()
        for mc in docs[n].findall("m:mergeCells/m:mergeCell", NS):
            a, b = mc.get("ref").split(":")
            ma, mb = re.match(r"([A-Z]+)(\d+)", a), re.match(r"([A-Z]+)(\d+)", b)
            for rr in range(int(ma.group(2)), int(mb.group(2)) + 1):
                for cc in range(col2n(ma.group(1)), col2n(mb.group(1)) + 1):
                    if (rr, cc) in cel: erros.append(f"mescla sobreposta {n} {mc.get('ref')}")
                    cel.add((rr, cc))
        mcs = docs[n].find("m:mergeCells", NS)
        if mcs is not None and int(mcs.get("count")) != len(mcs): erros.append(f"count de mergeCells errado {n}")
        # fórmulas: só referências desta aba
        for fo in docs[n].iter("{%s}f" % NS["m"]):
            if "!" in (fo.text or ""): erros.append(f"fórmula com outra aba {n}: {fo.text}")
        cols = docs[n].find("m:cols", NS)
        if cols is not None and len(cols) == 0: erros.append(f"<cols> vazio em {n}")
print("OK" if not erros else "\n".join(erros[:30]))
sys.exit(1 if erros else 0)
