# Gera a versão COMPACTA do firestore.rules para publicar no console (sem comentários, linhas vazias e recuo).
# Por quê: o Firebase recusa regras com mais de 256 KB de texto ("Erro ao salvar regras - Ocorreu um erro desconhecido").
# O firestore.rules do repositório continua com os comentários (é a fonte); o que vai para o console é o compacto.
# Tira só o que está FORA de aspas: "//" dentro de texto (ex.: 'https?://') fica.
# Uso: python3 compactar-regras.py [../firestore.rules] [saida/firestore-compacto.rules]
import os, sys
aqui = os.path.dirname(os.path.abspath(__file__))
origem = sys.argv[1] if len(sys.argv) > 1 else os.path.join(aqui, "..", "firestore.rules")
destino = sys.argv[2] if len(sys.argv) > 2 else os.path.join(aqui, "saida", "firestore-compacto.rules")

def sem_comentario(linha):
    aspas = None
    i = 0
    while i < len(linha):
        c = linha[i]
        if aspas:
            if c == "\\": i += 2; continue
            if c == aspas: aspas = None
        elif c in "'\"":
            aspas = c
        elif linha.startswith("//", i):
            return linha[:i]
        i += 1
    if aspas: raise SystemExit(f"aspas sem fechar: {linha!r}")
    return linha

texto = open(origem, encoding="utf-8").read()
saida = []
for l in texto.split("\n"):
    l = sem_comentario(l).strip()
    if l: saida.append(l)
compacto = "\n".join(saida) + "\n"
os.makedirs(os.path.dirname(destino), exist_ok=True)
open(destino, "w", encoding="utf-8").write(compacto)
a, b = len(texto.encode()), len(compacto.encode())
print(f"original: {a} bytes · compacto: {b} bytes ({b * 100 // a}%) · limite do Firebase: 262144 bytes")
sys.exit(0 if b < 262144 else 1)
