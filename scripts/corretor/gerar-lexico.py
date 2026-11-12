#!/usr/bin/env python3
# Gera corretor/lexico.txt: palavras do português do Brasil, da mais usada para a menos usada (uma por linha).
# Fontes (fora do repositório):
#   - dicionário VERO pt-BR (LibreOffice; pacote hunspell-pt-br, LGPL-3.0 / MPL-2.0): confere se a palavra existe
#   - FrequencyWords pt_br_full.txt (Hermit Dave, legendas do OpenSubtitles; conteúdo CC-BY-SA 4.0): ordem de uso
# Uso: apt-get install hunspell hunspell-pt-br
#      python3 gerar-lexico.py pt_br_full.txt ../../corretor/lexico.txt [limite=350000]
import re, subprocess, sys
freq, saida = sys.argv[1], sys.argv[2]
limite = int(sys.argv[3]) if len(sys.argv) > 3 else 350000
COLOQUIAIS = ["pra", "pro", "pros", "pras", "tá", "tô", "né", "cê", "tava", "tavam", "tão", "num", "numa", "dum", "duma",
  "vamo", "bora", "oi", "olá", "tchau", "valeu", "beleza", "show", "ok", "kkk", "rs", "aí", "pô", "uai", "ué", "tipo",
  "whatsapp", "instagram", "pix", "online", "delivery", "app", "site", "link", "post", "story", "stories", "flash", "help", "floripa",
  "freela", "freelances", "lanchonete", "uber", "ifood", "cep", "cpf", "cnpj", "selfie", "reels", "feed", "chat", "emoji", "emojis"]
pal = re.compile(r"^[a-záàâãéêíóôõúüç]+(-[a-záàâãéêíóôõúüç]+)*$")
lista, vistas = [], set()
with open(freq, encoding="utf-8") as f:
    for l in f:
        p = l.split()
        if len(p) < 2 or int(p[1]) < 1: continue
        w = p[0]
        if w in vistas or len(w) > 24 or not pal.match(w): continue
        vistas.add(w); lista.append(w)
        if len(lista) >= limite: break
r = subprocess.run(["hunspell", "-d", "pt_BR", "-G", "-i", "UTF-8"], input="\n".join(lista) + "\n", capture_output=True, text=True, encoding="utf-8")
certas = set(r.stdout.split())
saida_l = [w for w in lista if w in certas]
for w in COLOQUIAIS:
    if w not in certas: saida_l.append(w)
open(saida, "w", encoding="utf-8").write("\n".join(saida_l) + "\n")
print(len(lista), "conferidas,", len(saida_l), "no vocabulário")
