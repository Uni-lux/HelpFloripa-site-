#!/usr/bin/env python3
# Gera corretor/contexto.json: o "corretor que aprende" (12/11/2026).
# Para cada grupo de palavras que se confundem (e/é, a/à/há, mas/mais, mal/mau, esta/está...), conta em textos de verdade
# quais palavras aparecem antes e depois de cada uma. No aparelho, o corretor compara essas contagens com a frase da pessoa
# (Bayes ingênuo) e escolhe a forma mais provável. Nada sai do aparelho.
# Fonte: obra completa de Machado de Assis (domínio público; corpus "machado" do NLTK, http://machado.mec.gov.br/).
# Uso: python3 gerar-contexto.py machado.txt ../../corretor/contexto.json [--avaliar]
import json, re, sys, unicodedata, random
from collections import Counter, defaultdict

GRUPOS = [["e", "é"], ["a", "à", "há"], ["as", "às"], ["mas", "mais"], ["mal", "mau"], ["esta", "está"], ["estas", "estás"],
  ["nos", "nós"], ["tem", "têm"], ["vem", "vêm"], ["pais", "país"], ["da", "dá"], ["de", "dê"], ["ai", "aí"], ["traz", "trás"],
  ["por", "pôr"], ["pode", "pôde"], ["sabia", "sábia"], ["secretaria", "secretária"], ["publico", "público"], ["pratica", "prática"],
  ["duvida", "dúvida"], ["historia", "história"], ["seria", "séria"], ["magoa", "mágoa"], ["analise", "análise"], ["medico", "médico"],
  ["fabrica", "fábrica"], ["valido", "válido"], ["transito", "trânsito"], ["serio", "sério"], ["sera", "será"], ["contem", "contém"],
  ["ate", "até"], ["so", "só"], ["la", "lá"], ["ja", "já"], ["ca", "cá"], ["ve", "vê"], ["le", "lê"], ["ha", "há"], ["pre", "pré"],
  ["numero", "número"], ["musica", "música"], ["pagina", "página"], ["ultimo", "último"], ["ultima", "última"], ["unico", "único"],
  ["unica", "única"], ["proximo", "próximo"], ["proxima", "próxima"], ["critica", "crítica"], ["politica", "política"],
  ["economia", "economia"], ["publica", "pública"], ["especifico", "específico"], ["pratico", "prático"], ["camera", "câmera"],
  ["influencia", "influência"], ["experiencia", "experiência"], ["referencia", "referência"], ["sabado", "sábado"],
  ["voce", "você"], ["porem", "porém"], ["tambem", "também"], ["alem", "além"], ["ninguem", "ninguém"], ["alguem", "alguém"],
  ["tres", "três"], ["mes", "mês"], ["pes", "pés"], ["nao", "não"], ["entao", "então"], ["sao", "são"], ["estao", "estão"],
  ["vao", "vão"], ["tao", "tão"], ["mae", "mãe"], ["pai", "pai"], ["irma", "irmã"], ["amanha", "amanhã"], ["manha", "manhã"]]
GRUPOS = [g for g in GRUPOS if len(set(g)) > 1]
sem = lambda s: "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
TOK = re.compile(r"[a-záàâãéêíóôõúüç]+(?:-[a-záàâãéêíóôõúüç]+)*|[.,;:!?]")
def frases(texto):
  for linha in texto.split("\n"):
    t = TOK.findall(linha.lower())
    if len(t) >= 3: yield t
def feats(t, i):
  g = lambda j: sem(t[j]) if 0 <= j < len(t) else "<>"
  return ["l:" + g(i - 1), "r:" + g(i + 1), "ll:" + g(i - 2) + "_" + g(i - 1), "rr:" + g(i + 1) + "_" + g(i + 2)]
membro = {w: gi for gi, g in enumerate(GRUPOS) for w in g}

def treinar(lista):
  cont = defaultdict(Counter); tot = Counter()
  for t in lista:
    for i, w in enumerate(t):
      if w in membro:
        tot[w] += 1
        for f in feats(t, i): cont[w][f] += 1
  # o mesmo corte do arquivo que vai para o site (assim a margem medida é a mesma do aparelho)
  for w in list(cont): cont[w] = Counter({f: c for f, c in cont[w].items() if c >= (2 if f[1] == ":" else 3)})
  return cont, tot

import math
def escolher(modelo, t, i, beta=4.0):
  # P(traço | forma) com mistura na frequência geral do traço (traço que ninguém viu pesa igual para todas)
  cont, tot = modelo
  g = GRUPOS[membro[t[i]]]; fs = feats(t, i)
  ger = modelo_geral(modelo, g)
  pont = {}
  for c in g:
    n = tot[c]
    s = math.log(n + 1)
    for f in fs:
      pf = (ger.get(f, 0) + 0.5) / (sum(tot[x] for x in g) + 50)
      if f not in ger: continue
      s += math.log((cont[c][f] + beta * pf) / (n + beta))
    pont[c] = s
  return sorted(pont.items(), key=lambda x: -x[1])
_ger = {}
def modelo_geral(modelo, g):
  k = g[0]
  if k not in _ger:
    c = Counter()
    for x in g: c.update(modelo[0][x])
    _ger[k] = c
  return _ger[k]

def calibrar(modelo, teste):
  # por grupo: margem mínima para acertar >= 99% (alta) e >= 93% (sugestão) nas frases que o modelo NÃO viu
  res = defaultdict(list)
  for t in teste:
    for i, w in enumerate(t):
      if w not in membro: continue
      g = GRUPOS[membro[w]]
      for plano in g:  # a pessoa pode ter escrito qualquer forma do grupo (sem acento, ou a outra palavra)
        if plano == w and sem(w) != w: continue
        if plano != w and plano != sem(plano): continue  # só se escreve "errado" sem acento
        t2 = t[:i] + [plano] + t[i + 1:]
        r = escolher(modelo, t, i) if plano == w else escolher(modelo, t2, i)
        best, s1 = r[0]; sp = dict(r)[plano]
        if best != plano: res[g[0]].append((s1 - sp, best == w))
  lim = {}
  for k, xs in res.items():
    def T(prec):
      for m in [1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15]:
        sel = [ok for mg, ok in xs if mg > m]
        if len(sel) >= 8 and sum(sel) / len(sel) >= prec: return m
      return None
    a, b = T(0.99), T(0.93)
    if a is not None or b is not None: lim[k] = [a if a is not None else 99, b if b is not None else (a if a is not None else 99)]
  return lim

def main():
  texto = open(sys.argv[1], encoding="utf-8").read()
  todas = list(frases(texto))
  random.seed(7); random.shuffle(todas)
  corte = len(todas) // 10
  lim = calibrar(treinar(todas[corte:]), todas[:corte])
  _ger.clear()
  for k, v in sorted(lim.items()): print(k, v)
  cont, tot = treinar(todas)
  # só grupos de verdade: todas as formas existem e aparecem nos textos (os outros o dicionário já resolve)
  grupos = [g for g in GRUPOS if g[0] in lim and all(tot[w] >= 5 for w in g)]
  lim = {g[0]: lim[g[0]] for g in grupos}
  saida = {"v": 1, "grupos": grupos, "lim": lim, "tot": {}, "f": {}}
  for g in grupos:
    for w in g:
      saida["tot"][w] = tot[w]
      saida["f"][w] = {f: c for f, c in cont[w].items() if c >= (2 if f[1] == ":" else 3)}
  json.dump(saida, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
  print("grupos", len(grupos), "traços", sum(len(x) for x in saida["f"].values()))

main()
