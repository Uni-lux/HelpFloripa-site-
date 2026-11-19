#!/usr/bin/env python3
# Rede neural pequena do corretor (19/11/2026): lê a FRASE INTEIRA (até 20 palavras de cada lado) nos dois sentidos (GRU
# bidirecional) para escolher entre palavras que se confundem (e/é, mas/mais, onde/aonde...). Palavras viram números por
# hashing (FNV-1a, igual ao corretor.js); a palavra em dúvida vira um marcador do grupo. Treina com os mesmos textos e a
# mesma divisão do gerar-contexto.py, e compara com o modelo atual (hashing + regressão logística) em frases que nenhum viu.
# Uso: python3 treinar-neural.py avaliar machado.txt:1 modernos.txt:6 tatoeba.txt:1:x
import os, sys, random, math, time
from collections import Counter, defaultdict
import importlib.util
spec = importlib.util.spec_from_file_location("gc", os.path.join(os.path.dirname(os.path.abspath(__file__)), "gerar-contexto.py"))
gc = importlib.util.module_from_spec(spec); spec.loader.exec_module(gc)
import torch, torch.nn as nn

V = int(os.environ.get("HF_V", str(1 << 14)))   # posições da tabela de palavras
E = int(os.environ.get("HF_E", "24"))          # números por palavra
H = int(os.environ.get("HF_H", "48"))          # memória da GRU (cada sentido)
JAN = 20                                        # palavras de cada lado
TETO = int(os.environ.get("HF_TETO", "60000"))  # exemplos de treino por grupo
G = len(gc.GRUPOS)
torch.set_num_threads(4); torch.manual_seed(1)

def ids(t, i, gi):
  a, b = max(0, i - JAN), min(len(t), i + JAN + 1)
  out = []
  for j in range(a, b):
    out.append(V + gi if j == i else (gc.fnv(gc.sem(t[j])) & (V - 1)) or 1)
  return out, i - a

class Rede(nn.Module):
  def __init__(s):
    super().__init__()
    s.emb = nn.Embedding(V + G, E, padding_idx=0)
    s.gru = nn.GRU(E, H, batch_first=True, bidirectional=True)
    s.sai = nn.Linear(2 * H, G)
  def forward(s, x, pos, gi, lens):
    o, _ = s.gru(nn.utils.rnn.pack_padded_sequence(s.emb(x), lens.cpu(), batch_first=True, enforce_sorted=False))
    o, _ = nn.utils.rnn.pad_packed_sequence(o, batch_first=True)
    h = o[torch.arange(len(pos)), pos]
    return s.sai(h).gather(1, gi[:, None])[:, 0]

def lote(xs):
  L = max(len(x[0]) for x in xs)
  X = torch.zeros(len(xs), L, dtype=torch.long)
  for k, (t, p, g, y, w) in enumerate(xs): X[k, :len(t)] = torch.tensor(t)
  return (X, torch.tensor([x[1] for x in xs]), torch.tensor([x[2] for x in xs]), torch.tensor([len(x[0]) for x in xs]),
          torch.tensor([x[3] for x in xs], dtype=torch.float), torch.tensor([x[4] for x in xs], dtype=torch.float))

def exemplos_neural(lista, teto=None, seed=5):
  por = defaultdict(list)
  for t, p in lista:
    for i, w in enumerate(t):
      if w in gc.membro:
        gi = gc.membro[w]; x, pos = ids(t, i, gi)
        por[gi].append((x, pos, gi, 1.0 if w == gc.GRUPOS[gi][0] else 0.0, float(p), t, i, w))
  r = random.Random(seed); out = []
  for gi, xs in por.items():
    if teto and len(xs) > teto: r.shuffle(xs); xs = xs[:teto]
    out += xs
  return out

def treinar(tr, epocas=int(os.environ.get("HF_EPOCAS", "3"))):
  m = Rede(); opt = torch.optim.Adam(m.parameters(), lr=3e-3)
  dados = [(x[0], x[1], x[2], x[3], x[4]) for x in tr]
  passos = epocas * math.ceil(len(dados) / 256)
  ritmo = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=4e-3, total_steps=passos, pct_start=0.1)
  for ep in range(epocas):
    random.Random(ep).shuffle(dados); t0 = time.time(); soma = 0
    for k in range(0, len(dados), 256):
      X, P, Gi, Ln, Y, W = lote(dados[k:k + 256])
      z = m(X, P, Gi, Ln)
      loss = (nn.functional.binary_cross_entropy_with_logits(z, Y, reduction="none") * W).mean()
      opt.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step(); ritmo.step(); soma += loss.item()
    print(f"  época {ep + 1}: perda {soma / (len(dados) / 256):.4f} ({time.time() - t0:.0f} s)", flush=True)
  return m

@torch.no_grad()
def logits(m, xs):
  m.eval(); out = []
  for k in range(0, len(xs), 1024):
    X, P, Gi, Ln, _, _ = lote([(x[0], x[1], x[2], x[3], 1.0) for x in xs[k:k + 1024]])
    out += m(X, P, Gi, Ln).tolist()
  return out

def prob_neural(z, gi):
  g = gc.GRUPOS[gi]; p1 = 1 / (1 + math.exp(-z))
  return {g[0]: p1, g[1]: 1 - p1}

def calibrar(itens):
  # itens: (gi, probs, forma certa) — mesmo critério do gerar-contexto.py (99,7% com 30+ casos / 97% com 8+)
  res = defaultdict(list)
  for gi, pr, w in itens:
    g = gc.GRUPOS[gi]
    for plano in g:
      if plano != gc.sem(plano): continue
      melhor = max((c for c in g if c != plano), key=lambda c: pr.get(c, 0))
      res[gi].append((pr.get(melhor, 0), melhor == w and plano != w))
  lim = {}
  for gi, xs in res.items():
    def T(prec, n):
      for corte in [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.98, 0.99, 0.995]:
        sel = [ok for p, ok in xs if p > corte]
        if len(sel) >= n and sum(sel) / len(sel) >= prec: return corte
      return 1
    a, b = T(0.997, 30), T(0.97, 8)
    if a < 1 or b < 1: lim[gi] = [a, min(a, b)]
  return lim

def avaliar(itens, lim):
  r = Counter()
  for gi, pr, w in itens:
    g = gc.GRUPOS[gi]
    if gi not in lim: continue
    la, lm = lim[gi]
    for escrito in g:
      if escrito != gc.sem(escrito): continue
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
  return dict(r)

def main():
  random.seed(7)
  import glob
  conllu = sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(sys.argv[2].split(":")[0])), "*.conllu")))
  gc.carregar_pos(conllu)
  treino, teste, extra = [], [], []
  for arg in sys.argv[2:]:
    nome, peso, marca = (arg.split(":") + ["", ""])[:3]
    fr = list(gc.frases(open(nome, encoding="utf-8").read())); random.shuffle(fr); corte = len(fr) // 10
    if marca == "x":
      extra += fr[:corte]
      if peso != "0": treino += [(t, int(peso or 1)) for t in fr[corte:]]
    else:
      teste += fr[:corte]; treino += [(t, int(peso or 1)) for t in fr[corte:]]
  # mesma divisão do "HF_AVALIAR" do gerar-contexto.py
  aval = teste[: len(teste) // 2]; cal = teste[len(teste) // 2:]
  tr = [x for x in treino if x[1] > 0]; random.Random(3).shuffle(tr); tr = tr[: len(tr) * 8 // 9]
  print("frases de treino", len(tr), flush=True)
  # 1) modelo atual (hashing + regressão logística) e 2) rede neural, avaliados nas MESMAS ocorrências
  mods = {gi: m for gi, xs in gc.exemplos(tr).items() if (m := gc.treinar_grupo(xs))}
  ex = exemplos_neural(tr, TETO); print("exemplos neurais", len(ex), flush=True)
  t0 = time.time(); m = treinar(ex); print("treino", round(time.time() - t0), "s", flush=True)
  def itens(frs):
    xs = [x for x in exemplos_neural([(t, 1) for t in frs]) if x[2] in mods]
    zs = logits(m, xs)
    h, n, j = [], [], []
    for x, z in zip(xs, zs):
      gi, w = x[2], x[7]; g = gc.GRUPOS[gi]
      ph = gc.probabilidades(mods[gi], gc.feats(x[5], x[6])); pn = prob_neural(z, gi)
      p1 = (ph.get(g[0], 0) + pn[g[0]]) / 2
      h.append((gi, ph, w)); n.append((gi, pn, w)); j.append((gi, {g[0]: p1, g[1]: 1 - p1}, w))
    return h, n, j
  C, A, X = itens(cal), itens(aval), itens(extra)
  for k, nome in enumerate(["ATUAL ", "NEURAL", "JUNTOS"]):
    lim = calibrar(C[k])
    print(nome, "aval ", avaliar(A[k], lim)); print(nome, "extra", avaliar(X[k], lim), flush=True)
  torch.save(m.state_dict(), os.environ.get("HF_SAIDA", "rede.pt"))
  print("parametros", sum(p.numel() for p in m.parameters()))

if __name__ == "__main__": main()
