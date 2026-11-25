# Encurta os NOMES das regras (funções, parâmetros, "let" e variáveis do match) sem mudar o que elas fazem.
# Por quê: o Firebase recusa regras cujo "executável compilado" passa de 256.000 bytes (25/11/2026: 353.213).
# Entrada: o arquivo compacto (compactar-regras.py). Não mexe em textos, campos (depois de ".") nem caminhos (depois de "/").
# Uso: python3 minificar-regras.py entrada.rules saida.rules
import re, sys
from collections import Counter

ent, sai = sys.argv[1], sys.argv[2]
s = open(ent, encoding="utf-8").read()

# Tokens: textos entre aspas | identificadores | qualquer outro caractere
TOK = re.compile(r"""('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|([A-Za-z_][A-Za-z0-9_]*)|(\s+|.)""", re.S)
toks = [(m.group(0), "s" if m.group(1) else "i" if m.group(2) else "o") for m in TOK.finditer(s)]
assert "".join(t for t, _ in toks) == s

def ant(i):  # token anterior que não é espaço
    j = i - 1
    while j >= 0 and toks[j][1] == "o" and toks[j][0].isspace(): j -= 1
    return toks[j][0] if j >= 0 else ""

def prox(i):
    j = i + 1
    while j < len(toks) and toks[j][1] == "o" and toks[j][0].isspace(): j += 1
    return toks[j][0] if j < len(toks) else ""

# Nomes definidos por nós: funções, parâmetros, let e variáveis {x} do match
definidos = set()
for i, (t, k) in enumerate(toks):
    if k != "i": continue
    a = ant(i)
    if a in ("function", "let"): definidos.add(t)
    if a == "{" and prox(i) in ("}", "="): definidos.add(t)  # {userId} / {document=**}
for m in re.finditer(r"function\s+\w+\s*\(([^)]*)\)", s):
    for p in m.group(1).split(","):
        if p.strip(): definidos.add(p.strip())
definidos.discard("database")   # {database} de cima: deixar como está

RESERVADAS = set("""allow match function return let if in is true false null service rules_version request resource
math string int float bool map list timestamp duration path latlng number hashing debug get exists getAfter existsAfter
read write create update delete list cloud firestore databases documents do else for while var const break case catch continue default new this throw try typeof void with yield as of on to or and not""".split())
assert not (definidos & RESERVADAS), definidos & RESERVADAS

# Quantas vezes cada nome aparece como nome (não depois de "." nem de "/")
uso = Counter()
for i, (t, k) in enumerate(toks):
    if k == "i" and t in definidos and ant(i) not in (".", "/"): uso[t] += 1

todos = {t for t, k in toks if k == "i"}
ocupados = (todos - definidos) | RESERVADAS
def nomes():
    alf = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for c in alf:
        yield c
    for c1 in alf:
        for c2 in alf + "0123456789_":
            yield c1 + c2
    for c1 in alf:
        for c2 in alf:
            for c3 in alf:
                yield c1 + c2 + c3
ger = (n for n in nomes() if n not in ocupados)
mapa = {nome: next(ger) for nome, _ in uso.most_common()}

out = []
for i, (t, k) in enumerate(toks):
    if k == "i" and t in mapa and ant(i) not in (".", "/"):
        out.append(mapa[t])
    else:
        out.append(t)
r = "".join(out)
# espaços sobrando dentro da linha
r = "\n".join(re.sub(r"[ \t]{2,}", " ", l).strip() for l in r.split("\n"))
open(sai, "w", encoding="utf-8").write(r)
print(f"{len(s.encode())} → {len(r.encode())} bytes · {len(mapa)} nomes encurtados")
