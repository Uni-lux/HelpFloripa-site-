# Troca expressões que se repetem centenas de vezes por chamadas de funções curtas, sem mudar o que as regras fazem.
# Medido no Firebase (25/11/2026): cada letra de expressão custa ~2 bytes "compilados"; uma chamada de função custa
# ~36. Então "request.resource.data" (1.070 vezes) vira N(), "resource.data" vira R(), "request.auth.uid" vira U(),
# "request.time" vira T() e "/databases/$(database)/documents/col/$(id)" vira D('col', id).
# Uso: python3 encurtar-regras.py entrada.rules saida.rules [N,R,U,T,D]   (padrão: todas)
import re, sys

ent, sai = sys.argv[1], sys.argv[2]
quais = set((sys.argv[3] if len(sys.argv) > 3 else "N,R,U,T,D").split(","))
s = open(ent, encoding="utf-8").read()

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

if "N" in quais: trocar(r"(?<![\w.])request\.resource\.data\b", NOME["N"] + "()")
if "R" in quais: trocar(r"(?<![\w.])resource\.data\b", NOME["R"] + "()")
if "U" in quais: trocar(r"(?<![\w.])request\.auth\.uid\b", NOME["U"] + "()")
if "T" in quais: trocar(r"(?<![\w.])request\.time\b", NOME["T"] + "()")
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
r = r.replace(cab, cab + "\n".join(funcs[k] for k in "NRUTD" if k in quais) + "\n", 1)
open(sai, "w", encoding="utf-8").write(r)
print(f"{len(s.encode())} → {len(r.encode())} bytes ({','.join(sorted(quais))})")
