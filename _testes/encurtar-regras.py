# Troca expressões que se repetem centenas de vezes por chamadas de funções curtas, sem mudar o que as regras fazem.
# Medido no Firebase (25/11/2026): cada letra de expressão custa ~2 bytes "compilados"; uma chamada de função custa
# ~36. Então "request.resource.data" (1.070 vezes) vira N(), "resource.data" vira R(), "request.auth.uid" vira U(),
# "request.time" vira T() e "/databases/$(database)/documents/col/$(id)" vira D('col', id).
# Uso: python3 encurtar-regras.py entrada.rules saida.rules [N,R,U,T,D]   (padrão: todas)
import re, sys

EMBRULHAR = "--embrulhar" in sys.argv
import os
MINREP = int(os.environ.get("HF_MINREP", "3"))
sys.argv = [a for a in sys.argv if a != "--embrulhar"]
ent, sai = sys.argv[1], sys.argv[2]
quais = set((sys.argv[3] if len(sys.argv) > 3 else "N,R,U,T,D").split(","))
LET_DENTRO = set((sys.argv[4] if len(sys.argv) > 4 else "N,R,U,T").split(","))
CHAMADA_FORA = set((sys.argv[5] if len(sys.argv) > 5 else "N,R,U,T").split(","))
s = open(ent, encoding="utf-8").read()

# Proteger: blocos "match /colecao/..." que estão perto do limite de 1.000 expressões por gravação (e as funções que eles
# usam) ficam como estão. HF_PROTEGER="stories,negocios" (padrão: nenhum).
PROTEGER = [c for c in os.environ.get("HF_PROTEGER", "").split(",") if c]
def _fim(t, i):
    nivel, q = 1, None
    while True:
        c = t[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c in "'\"": q = c
        elif c == "{": nivel += 1
        elif c == "}":
            nivel -= 1
            if not nivel: return i
        i += 1
GUARDADOS = []
if PROTEGER:
    defs = {}
    for m in re.finditer(r"function\s+(\w+)\s*\([^)]*\)\s*\{", s):
        defs.setdefault(m.group(1), []).append((m.start(), _fim(s, m.end()) + 1))
    regioes, fila = [], []
    for col in PROTEGER:
        for m in re.finditer(r"match /" + re.escape(col) + r"/[^{]*\{[^}]*\}[^{]*\{|match /" + re.escape(col) + r"/\{[^}]*\}\s*\{", s):
            regioes.append((m.start(), _fim(s, m.end()) + 1))
    vistos = set()
    def chamadas(a, b):
        return set(re.findall(r"\b(\w+)\(", s[a:b])) & set(defs)
    for a, b in list(regioes): fila += list(chamadas(a, b))
    while fila:
        n = fila.pop()
        if n in vistos: continue
        vistos.add(n)
        for a, b in defs[n]:
            regioes.append((a, b)); fila += list(chamadas(a, b))
    regioes.sort()
    junt = []
    for a, b in regioes:
        if junt and a < junt[-1][1]: junt[-1] = (junt[-1][0], max(b, junt[-1][1]))
        else: junt.append((a, b))
    out, i = [], 0
    for a, b in junt:
        out.append(s[i:a]); out.append(f"\x00{len(GUARDADOS)}\x00"); GUARDADOS.append(s[a:b]); i = b
    out.append(s[i:]); s = "".join(out)
    print(f"protegidos: {len(junt)} trechos, {sum(len(g) for g in GUARDADOS)} letras, {len(vistos)} funções")

# nomes livres para as funções novas
def livre(base):
    n = base
    while re.search(r"\b" + re.escape(n) + r"\b", s): n += "_"
    return n
NOME = {k: livre(k + "q") for k in "NRUTD"}

# separa textos entre aspas para não mexer dentro deles
partes = re.split(r"""('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")""", s)
def trocar(rx, novo):
    for i in range(0, len(partes), 2):
        partes[i] = re.sub(rx, novo, partes[i])

EXPR = {"N": r"(?<![\w.])request\.resource\.data\b", "R": r"(?<![\w.])resource\.data\b",
        "U": r"(?<![\w.])request\.auth\.uid\b", "T": r"(?<![\w.])request\.time\b"}
TEXTO = {"N": "request.resource.data", "R": "resource.data", "U": "request.auth.uid", "T": "request.time"}
LET = {k: livre(k.lower() + "L") for k in "NRUT"}
r = "".join(partes)

TEXTOS = re.compile(r"""('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")""")
# 0) Cada "allow ...: if CONDIÇÃO;" com as expressões repetidas vira uma função no mesmo lugar (para poder usar "let").
def fim_da_condicao(t, i):
    nivel, q = 0, None
    while True:
        c = t[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c in "'\"": q = c
        elif c in "([{": nivel += 1
        elif c in ")]}": nivel -= 1
        elif c == ";" and nivel == 0: return i
        i += 1
if EMBRULHAR:
    out, i, n = [], 0, 0
    for m in re.finditer(r"(?m)^allow ([a-z, ]+): if ", r):
        if m.start() < i: continue
        a = m.end(); b = fim_da_condicao(r, a)
        cond = r[a:b]
        semtxt = "".join(TEXTOS.split(cond)[0::2])
        rep = sum(len(re.findall(EXPR[k], semtxt)) for k in "NRUT")
        if rep < MINREP: continue
        nome = livre(f"A{n}"); n += 1
        out.append(r[i:m.start()])
        out.append(f"function {nome}() {{\nreturn {cond};\n}}\nallow {m.group(1)}: if {nome}()")
        i = b
    out.append(r[i:]); r = "".join(out)

# 1) Dentro das funções: "let" no começo (só é avaliado se for usado e não conta como chamada a mais).
def fora_de_textos(t, f):
    ps = re.split(r"""('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")""", t)
    for i in range(0, len(ps), 2): ps[i] = f(ps[i])
    return "".join(ps)
def fim_do_bloco(t, i):  # i = posição logo depois do "{"; devolve a posição do "}" que fecha
    nivel, q = 1, None
    while True:
        c = t[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c in "'\"": q = c
        elif c == "{": nivel += 1
        elif c == "}":
            nivel -= 1
            if not nivel: return i
        i += 1
out, i = [], 0
for m in re.finditer(r"function\s+\w+\s*\([^)]*\)\s*\{", r):
    if m.start() < i: continue
    a = m.end(); b = fim_do_bloco(r, a)
    corpo = r[a:b]
    lets = []
    for k in "NRUT":
        if k not in quais or k not in LET_DENTRO: continue
        n = sum(len(re.findall(EXPR[k], x)) for x in TEXTOS.split(corpo)[0::2])
        if n >= 2:
            corpo = fora_de_textos(corpo, lambda x, k=k: re.sub(EXPR[k], LET[k], x))
            lets.append(f"let {LET[k]} = {TEXTO[k]};")
    out.append(r[i:a]); out.append(("\n" + "\n".join(lets) if lets else "") + corpo); i = b
out.append(r[i:]); r = "".join(out)

# 2) No resto (condições do allow): atalho por função
partes = re.split(r"""('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")""", r)
for k in "NRUT":
    if k in quais and k in CHAMADA_FORA: trocar(EXPR[k], NOME[k] + "()")
r = "".join(partes)

if "D" in quais:
    pre = "/databases/$(database)/documents/"
    out, i, n = [], 0, 0
    while True:
        j = r.find(pre, i)
        if j < 0: out.append(r[i:]); break
        m = re.match(r"([A-Za-z_][A-Za-z0-9_]*)/\$\(", r[j + len(pre):])
        if not m: out.append(r[i:j + len(pre)]); i = j + len(pre); continue
        k = j + len(pre) + m.end()          # depois de "$("
        nivel, p = 1, k
        while nivel:
            if r[p] == "(": nivel += 1
            elif r[p] == ")": nivel -= 1
            p += 1
        expr = r[k:p - 1]
        if p < len(r) and (r[p] == "/" or r[p].isalnum()):   # caminho com mais partes: deixa
            out.append(r[i:p]); i = p; continue
        out.append(r[i:j]); out.append(f"{NOME['D']}('{m.group(1)}', {expr})"); i = p; n += 1
    r = "".join(out)

funcs = {
    "N": f"function {NOME['N']}() {{ return request.resource.data; }}",
    "R": f"function {NOME['R']}() {{ return resource.data; }}",
    "U": f"function {NOME['U']}() {{ return request.auth.uid; }}",
    "T": f"function {NOME['T']}() {{ return request.time; }}",
    "D": f"function {NOME['D']}(c, i) {{ return /databases/$(database)/documents/$(c)/$(i); }}",
}
cab = "match /databases/{database}/documents {\n"
assert cab in r
usadas = [k for k in "NRUTD" if re.search(r"\b" + NOME[k] + r"\(", r)]
r = r.replace(cab, cab + "\n".join(funcs[k] for k in usadas) + ("\n" if usadas else ""), 1)
r = re.sub("\x00(\\d+)\x00", lambda m: GUARDADOS[int(m.group(1))], r)
open(sai, "w", encoding="utf-8").write(r)
print(f"{len(s.encode())} → {len(r.encode())} bytes ({','.join(sorted(quais))})")
