# Uso: python3 preparar-tatoeba.py por_sentences.tsv tatoeba.txt  (arquivo de https://tatoeba.org/pt-br/downloads, CC BY 2.0 FR)
# Tira do Tatoeba (todas as variantes do português) as frases com cara de português de Portugal; o resto vai para o treino.
import re, sys
PT_PT = re.compile(r"\b(est(ou|á|ás|ava|avas|ávamos|amos|ão|ive|eve)|continu\w+|come[cç]\w+|and(o|a|as|am|ava)|fic\w+|pass\w+) a \w+(ar|er|ir)\b"
  r"|\b(telemóve\w*|autocarro\w*|comboio\w*|factos?|pequeno-almoço|casa de banho|raparig\w+|miúd\w+|fixe|ecrã\w*|equipa\w*|"
  r"frigorífico\w*|connosco|contact\w+|actua\w+|acç\w+|óptim\w+|direcç\w+|registo\w*|utente\w*|bica|sumo|talho|"
  r"tu (és|estás|tens|vais|podes|queres|sabes|foste|fizeste|disseste)|vós|vosso\w*|tomar o pequeno|apanhar o)\b"
  r"|\w*[éó][mn][aeiou]\w*", re.I)
ent, sai = sys.argv[1], sys.argv[2]
vistos, ok, fora = set(), 0, 0
with open(sai, "w", encoding="utf-8") as o:
  for l in open(ent, encoding="utf-8"):
    x = l.rstrip("\n").split("\t")
    if len(x) < 3: continue
    f = x[2].strip()
    if not f or f in vistos: continue
    vistos.add(f)
    if PT_PT.search(f): fora += 1; continue
    o.write(f + "\n"); ok += 1
print("ficaram", ok, "| tiradas (cara de Portugal)", fora)
