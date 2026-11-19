#!/usr/bin/env python3
# Gera scripts/corretor/fonte/contexto.json (o site usa a versão compacta, ver compactar.py): o "corretor que aprende" (12/11/2026).
# Para cada grupo de palavras que se confundem (e/é, a/à/há, mas/mais, mal/mau, esta/está...), conta em textos de verdade
# quais palavras aparecem antes e depois de cada uma. No aparelho, o corretor compara essas contagens com a frase da pessoa
# (Bayes ingênuo) e escolhe a forma mais provável. Nada sai do aparelho.
# Fontes (ver corretor/LEIA-ME.txt):
#   - obra completa de Machado de Assis (domínio público; corpus "machado" do NLTK, http://machado.mec.gov.br/);
#   - textos atuais do Brasil das árvores sintáticas Universal Dependencies (frases "# text =" dos .conllu):
#     UD_Portuguese-GSD, -Bosque (só a parte da Folha, ids "CF"), -PUD e -PetroGold (CC BY-SA 4.0/3.0),
#     -Porttinari e -DANTEStocks (CC BY 4.0), em github.com/UniversalDependencies.
# v5 (19/11/2026): pistas por HASHING. Cada pista ("l:casa") vira um número pelo FNV-1a de 32 bits (igual ao corretor.js)
# e esse número é a posição do peso numa tabela do grupo (tamanho = potência de 2 >= 4x as pistas; HF_FATOR muda). Não vai
# vocabulário: só a tabela de pesos (1 byte cada, escala por grupo). O treino já é feito nesse formato, então as pistas
# que caem na mesma posição são aprendidas juntas. HF_HASH=0 gera o formato antigo (v3) para comparar.
# Uso: python3 gerar-contexto.py fonte/contexto.json machado.txt:1 modernos.txt:6
#      depois: python3 compactar.py fonte/lexico.txt fonte/contexto.json ../../corretor 1.02 (o site usa os compactos)
import json, re, sys, unicodedata, random, os
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
  ["vao", "vão"], ["tao", "tão"], ["mae", "mãe"], ["pai", "pai"], ["irma", "irmã"], ["amanha", "amanhã"], ["manha", "manhã"],
  # 19/11/2026: palavras que existem as duas e se trocam (só entram se o treino acertar o bastante, ver calibrar)
  ["onde", "aonde"], ["haja", "aja"], ["conserto", "concerto"], ["cumprimento", "comprimento"], ["assento", "acento"],
  ["senso", "censo"], ["sexta", "cesta"], ["cela", "sela"]]
GRUPOS = [g for g in GRUPOS if len(set(g)) > 1]
sem = lambda s: "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
TOK = re.compile(r"[a-záàâãéêíóôõúüç]+(?:-[a-záàâãéêíóôõúüç]+)*|[.,;:!?]")
LIXO = re.compile(r"^rt\s+|https?://\S+|www\.\S+|[@#]\w+", re.I)
def frases(texto):
  for linha in texto.split("\n"):
    t = TOK.findall(LIXO.sub(" ", linha).lower())
    if len(t) >= 3: yield t
# Classe de cada palavra (substantivo, verbo...), tirada das árvores sintáticas (UPOS mais comum da palavra sem acento).
POS = {}
CLASSE = {"NOUN": "N", "PROPN": "N", "ADJ": "A", "VERB": "V", "AUX": "X", "ADV": "R", "DET": "D", "PRON": "P", "ADP": "E",
  "CCONJ": "C", "SCONJ": "S", "NUM": "M", "INTJ": "I", "PUNCT": "U"}
def carregar_pos(arquivos, maximo=12000):
  c = defaultdict(Counter)
  for f in arquivos:
    for l in open(f, encoding="utf-8"):
      if not l or l[0] in "#\n": continue
      x = l.split("\t")
      if len(x) < 4 or "-" in x[0] or "." in x[0]: continue
      k = CLASSE.get(x[3])
      if k: c[sem(x[1].lower())][k] += 1
  freq = sorted(c, key=lambda w: -sum(c[w].values()))[:maximo]
  for w in freq: POS[w] = c[w].most_common(1)[0][0]
# reserva pela terminação (igual ao corretor.js)
def classe(w):
  if w in POS: return POS[w]
  if w in ".,;:!?": return "U"
  if w.endswith("mente"): return "R"
  if re.search(r"(cao|coes|dade|dades|gem|ismo|ista|ncia|ncias|mento|mentos)$", w): return "N"
  if re.search(r"(ar|er|ir|ando|endo|indo)$", w): return "V"
  if re.search(r"(ado|ada|ados|adas|ido|ida|idos|idas|oso|osa|ivel|avel|ivo|iva|ico|ica)$", w): return "A"
  return "?"
def feats(t, i):
  g = lambda j: sem(t[j]) if 0 <= j < len(t) else "<>"
  c = lambda j: classe(g(j)) if 0 <= j < len(t) else "<"
  return ["l:" + g(i - 1), "r:" + g(i + 1), "ll:" + g(i - 2) + "_" + g(i - 1), "rr:" + g(i + 1) + "_" + g(i + 2),
          "lp:" + c(i - 1), "rp:" + c(i + 1), "pp:" + c(i - 1) + "_" + c(i + 1), "rq:" + c(i + 1) + "_" + c(i + 2),
          "lq:" + c(i - 2) + "_" + c(i - 1), "rs:" + g(i + 1)[-3:], "ls:" + g(i - 1)[-3:]]
membro = {w: gi for gi, g in enumerate(GRUPOS) for w in g}

HASH = os.environ.get("HF_HASH", "1") != "0"
def fnv(s):
  h = 0x811c9dc5
  for b in s.encode("utf-8"):
    h ^= b; h = (h * 0x01000193) & 0xffffffff
  return h
def bits_para(n):
  b = 8
  while (1 << b) < n * float(os.environ.get("HF_FATOR", "4")): b += 1
  return b

MIN_TRACO = 3  # um traço só entra no modelo se apareceu pelo menos 3 vezes no grupo

def exemplos(lista):
  # por grupo: [(traços, forma certa, peso)]
  ex = defaultdict(list)
  for t, p in lista:
    for i, w in enumerate(t):
      if w in membro: ex[membro[w]].append((feats(t, i), w, p))
  return ex

class Hasher:
  # faz o papel do DictVectorizer: cada pista vira a coluna fnv(pista) & (tamanho - 1); pistas iguais na mesma frase somam
  def __init__(self, bits): self.bits = bits; self.mask = (1 << bits) - 1
  def transform(self, linhas):
    from scipy.sparse import csr_matrix
    ind, ptr, val = [], [0], []
    for d in linhas:
      cols = Counter(fnv(f) & self.mask for f in d)
      for c, v in sorted(cols.items()): ind.append(c); val.append(float(v))
      ptr.append(len(ind))
    return csr_matrix((val, ind, ptr), shape=(len(linhas), 1 << self.bits))

def treinar_grupo(xs):
  # regressão logística (aprende o peso de cada traço; a probabilidade sai calibrada)
  from sklearn.feature_extraction import DictVectorizer
  from sklearn.linear_model import LogisticRegression
  cont = Counter(f for fs, _, _ in xs for f in fs)
  linhas = [{f: 1 for f in fs if cont[f] >= MIN_TRACO} for fs, _, _ in xs]
  if HASH:
    dv = Hasher(bits_para(sum(1 for f in cont if cont[f] >= MIN_TRACO)))
    X = dv.transform(linhas)
  else:
    dv = DictVectorizer(); X = dv.fit_transform(linhas)
    if X.shape[1] == 0: return None
  y = [w for _, w, _ in xs]; pesos = [p for _, _, p in xs]
  if len(set(y)) < 2: return None
  m = LogisticRegression(C=float(os.environ.get("HF_C", "1.0")), max_iter=400)
  m.fit(X, y, sample_weight=pesos)
  return dv, m

def probabilidades(mod, fs):
  dv, m = mod
  p = m.predict_proba(dv.transform([{f: 1 for f in fs}]))[0]
  return dict(zip(m.classes_, p))

def calibrar(mods, teste):
  # por grupo: probabilidade mínima da outra forma para acertar >= 99,7% (corrige sozinho, com 30+ casos)
  # e >= 95% (sugestão), medida em frases que o modelo NÃO viu, como se a pessoa tivesse escrito sem acento
  res = defaultdict(list)
  for gi, xs in exemplos([(t, 1) for t in teste]).items():
    if gi not in mods: continue
    g = GRUPOS[gi]
    for fs, w, _ in xs:
      pr = probabilidades(mods[gi], fs)
      for plano in g:
        if plano != sem(plano): continue
        melhor = max((c for c in g if c != plano), key=lambda c: pr.get(c, 0))
        res[gi].append((pr.get(melhor, 0), melhor == w and plano != w))
  lim = {}
  for gi, xs in res.items():
    def T(prec, n):
      for corte in [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.98, 0.99, 0.995]:
        sel = [ok for pr, ok in xs if pr > corte]
        if len(sel) >= n and sum(sel) / len(sel) >= prec: return corte
      return 1
    a, b = T(0.997, 30), T(0.95, 8)
    if a < 1 or b < 1: lim[GRUPOS[gi][0]] = [a, min(a, b)]
  return lim

def avaliar(mods, lim, aval):
  # erros simulados em frases que o modelo NÃO viu (nem no treino nem na calibração): a pessoa escreveu a forma sem
  # acento/a outra palavra. Conta: corrigidos sozinho, sugeridos, trocas erradas (inclusive em palavra que estava certa).
  r = Counter()
  for gi, xs in exemplos([(t, 1) for t in aval]).items():
    g = GRUPOS[gi]
    if gi not in mods or g[0] not in lim: continue
    la, lm = lim[g[0]]
    for fs, w, _ in xs:
      pr = probabilidades(mods[gi], fs)
      for escrito in g:
        if escrito != sem(escrito): continue
        melhor = max((c for c in g if c != escrito), key=lambda c: pr.get(c, 0)); pm = pr.get(melhor, 0)
        conf = "alta" if la < 1 and pm > max(la, 0.9) else "media" if lm < 1 and pm > max(lm, 0.7) else None
        if escrito != w:
          r["erros"] += 1
          if conf == "alta": r["corrigidos" if melhor == w else "trocou_errado"] += 1
          elif conf == "media": r["sugeridos" if melhor == w else "sugestao_errada"] += 1
        else:
          r["certos"] += 1
          if conf == "alta": r["estragou_certo"] += 1
          elif conf == "media": r["sugeriu_no_certo"] += 1
  return r

def main():
  # gerar-contexto.py saida.json fonte.txt[:peso] [fonte2.txt[:peso] ...]
  random.seed(7)
  treino, teste = [], []
  import glob
  conllu = sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(sys.argv[2].split(":")[0])), "*.conllu")))
  carregar_pos(conllu); print("classes de", len(POS), "palavras (", len(conllu), "arquivos .conllu)")
  for arg in sys.argv[2:]:
    nome, _, peso = arg.partition(":")
    fr = list(frases(open(nome, encoding="utf-8").read()))
    random.shuffle(fr)
    corte = len(fr) // 10
    teste += fr[:corte]; treino += [(t, int(peso or 1)) for t in fr[corte:]]
    print(nome, len(fr), "frases, peso", peso or 1)
  if os.environ.get("HF_AVALIAR"):
    # 80% treino, 10% calibração, 10% avaliação (nada é gravado)
    aval = teste[: len(teste) // 2]; cal = teste[len(teste) // 2:]
    tr = treino[: len(treino) * 8 // 9]
    mods = {gi: m for gi, xs in exemplos(tr).items() if (m := treinar_grupo(xs))}
    lim = calibrar(mods, cal)
    print("AVALIACAO", dict(avaliar(mods, lim, aval)))
    return
  ex = exemplos(treino)
  mods = {gi: m for gi, xs in ex.items() if (m := treinar_grupo(xs))}
  lim = calibrar(mods, teste)
  for k, v in sorted(lim.items()): print(k, v)
  # modelo final com todas as frases
  ex = exemplos(treino + [(t, 1) for t in teste])
  lex = set(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonte/lexico.txt"), encoding="utf-8").read().split())
  saida = {"v": 5 if HASH else 3, "pos": "".join(f"{w}={k}," for w, k in POS.items()), "grupos": [], "lim": {}, "m": {}}
  tabela = bytearray()
  n = 0
  for gi, xs in sorted(ex.items()):
    g = GRUPOS[gi]
    # só grupos de verdade: todas as formas aparecem e as sem acento são palavras do dicionário ("nao", "voce" o dicionário já corrige)
    tot = Counter(w for _, w, _ in xs)
    if g[0] not in lim or not all(tot[w] >= 5 and w in lex for w in g): continue
    mod = treinar_grupo(xs)
    if not mod: continue
    dv, m = mod
    cls = list(m.classes_)
    coef = m.coef_ if len(cls) > 2 else [-m.coef_[0] / 2, m.coef_[0] / 2]
    inter = list(m.intercept_) if len(cls) > 2 else [-m.intercept_[0] / 2, m.intercept_[0] / 2]
    if HASH:
      # tabela do grupo: peso da 1ª forma (o da 2ª é o mesmo com o sinal trocado), 1 byte com escala do grupo
      w = [float(x) for x in coef[0]]
      mx = max(abs(x) for x in w) or 1
      escala = 127 / mx
      off = len(tabela)
      # pesos pequenos (< 0,05) viram 0, como no formato antigo: quase não mudam a resposta e o arquivo comprime melhor
      tabela += bytes((max(-127, min(127, round(x * escala))) & 255) if abs(x) >= 0.05 else 0 for x in w)
      usados = sum(1 for x in w if abs(x) >= 0.05 and round(x * escala) != 0)
      saida["grupos"].append(g); saida["lim"][g[0]] = lim[g[0]]
      saida["m"][g[0]] = {"c": cls, "b": round(float(inter[0]), 3), "bits": dv.bits, "off": off, "s": round(escala, 4)}
      n += usados
      continue
    pesos = {}
    for j, f in enumerate(dv.feature_names_):
      ws = [round(float(coef[c][j]), 2) for c in range(len(cls))]
      if max(abs(x) for x in ws) >= 0.05: pesos[f] = ws
    saida["grupos"].append(g); saida["lim"][g[0]] = lim[g[0]]
    saida["m"][g[0]] = {"c": cls, "b": [round(float(x), 3) for x in inter], "w": pesos}
    n += len(pesos)
  if HASH:
    import base64
    saida["tabela"] = base64.b64encode(bytes(tabela)).decode()
  json.dump(saida, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
  print("grupos", len(saida["grupos"]), "pesos", n)

main()
