#!/usr/bin/env python3
# Compacta os dicionários do corretor para baixar menos (19/11/2026).
#  - lexico: palavras em ordem alfabética guardando só o que muda da anterior (1º caractere = quantas letras repete)
#    + a frequência de cada uma em faixas (ordem de uso com erro de até ~5%, q = 1.05)
#  - contexto: os grupos têm só 2 formas e o peso da 2ª é sempre o da 1ª com o sinal trocado: guarda um número só,
#    em centésimos inteiros, e as pistas ficam juntas por tipo (l, r, ll...) sem repetir o "l:" — sem perder nada.
# Uso: python3 compactar.py fonte/lexico.txt fonte/contexto.json ../../corretor 1.02
#      (gera lexico2.txt e contexto3.json + pesos3.bin (modelo v5, hashing; v3 antigo gera contexto2.json); q = 1.02 escolhido em 19/11/2026: comparado com o formato antigo em 8.448 textos
#      e 48.519 palavras erradas, 10 textos e 89 palavras (0,2%) tiveram outra sugestão, todos casos de quase empate)
#      [topo=N] guarda também as N mais usadas na ordem exata (testado; o ganho não pagou o tamanho)
import sys, json, math, os

def lexico(entrada, saida, q, topo=0):
  w = []
  vistos = set()
  for x in open(entrada, encoding="utf-8").read().split("\n"):
    x = x.strip()
    if x and x not in vistos: vistos.add(x); w.append(x)
  rank = {x: i for i, x in enumerate(w)}
  s = sorted(w)
  linhas, prev = [], ""
  for x in s:
    p = 0
    while p < min(len(x), len(prev), 60) and x[p] == prev[p]: p += 1
    linhas.append(chr(48 + p) + x[p:]); prev = x
  faixas = "".join(chr(48 + int(math.log(rank[x] + 1) / math.log(q))) for x in s)
  # as mais usadas também vão na ordem exata (decidem a maioria das sugestões; com faixa elas empatariam entre si)
  topo_txt = ("#topo\n" + "\n".join(w[:topo]) + "\n") if topo else ""
  open(saida, "w", encoding="utf-8").write("#hflex2 %s\n" % q + "\n".join(linhas) + "\n#faixas\n" + faixas + "\n" + topo_txt)
  return len(s)

def contexto(entrada, saida):
  d = json.load(open(entrada, encoding="utf-8"))
  if d.get("v") == 5:
    # v5 (hashing): a tabela de pesos vai como arquivo binário (1 byte por posição), o resto num JSON pequeno
    import base64
    pasta = os.path.dirname(saida)
    open(os.path.join(pasta, "pesos3.bin"), "wb").write(base64.b64decode(d.pop("tabela")))
    open(os.path.join(pasta, "contexto3.json"), "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    return
  m2 = {}
  for g, v in d["m"].items():
    assert len(v["c"]) == 2 and abs(v["b"][0] + v["b"][1]) < 1e-9
    por = {}
    for f, w in sorted(v["w"].items()):
      assert len(w) == 2 and abs(w[0] + w[1]) < 1e-9, (g, f)
      p, k = f.split(":", 1)
      assert "|" not in k and abs(w[0] * 100 - round(w[0] * 100)) < 1e-9  # pesos em centésimos: guarda x100 inteiro
      por.setdefault(p, []).append((k, w[0]))
    m2[g] = {"c": v["c"], "b": v["b"][0],
             "f": {p: "|".join(k for k, _ in l) for p, l in por.items()},
             "w": {p: ",".join(str(round(x * 100)) for _, x in l) for p, l in por.items()}}
  n = {**d, "v": 4, "m": m2}
  open(saida, "w", encoding="utf-8").write(json.dumps(n, ensure_ascii=False, separators=(",", ":")))

if __name__ == "__main__":
  lex, ctx, pasta = sys.argv[1:4]
  q = float(sys.argv[4]) if len(sys.argv) > 4 else 1.05
  topo = int(sys.argv[5]) if len(sys.argv) > 5 else 0
  print(lexico(lex, os.path.join(pasta, "lexico2.txt"), q, topo), "palavras")
  contexto(ctx, os.path.join(pasta, "contexto2.json"))
