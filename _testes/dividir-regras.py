# Divide o firestore.rules em partes de até ~12.800 bytes para colar no console do Firebase.
# - corta sempre em fim de linha, de preferência numa linha vazia ou no fim de um bloco;
# - cada parte termina com a linha "// ===== FIM DA PARTE X DE N =====" (comentário: pode ser colado junto);
# - confere que as partes juntas (sem as linhas de fim) dão EXATAMENTE o arquivo, byte a byte;
# - grava também o arquivo remontado COM as linhas de fim (o que fica no console se colar tudo),
#   em _testes/saida/, para rodar os testes de regras nele:
#   node testes-regras.mjs saida/remontado-com-marcas.rules
# Uso: python3 dividir-regras.py [../firestore.rules] [pasta de saída]   (padrão: ../_regras)
import os, sys, re, hashlib
aqui = os.path.dirname(os.path.abspath(__file__))
origem = sys.argv[1] if len(sys.argv) > 1 else os.path.join(aqui, "..", "firestore.rules")
saida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(aqui, "..", "_regras")
LIMITE = 12800
dados = open(origem, "rb").read()
linhas = dados.splitlines(keepends=True)
marca = lambda x, n: f"// ===== FIM DA PARTE {x} DE {n} =====\n".encode()
TAM_MARCA = len(marca(99, 99))

def dividir():
    partes, atual, tam = [], [], 0
    for i, l in enumerate(linhas):
        if atual and tam + len(l) + TAM_MARCA > LIMITE:
            # volta até um ponto bom (linha vazia ou fim de bloco) nas últimas ~60 linhas
            corte = len(atual)
            for k in range(len(atual) - 1, max(0, len(atual) - 60), -1):
                t = atual[k].strip()
                if t == b"" or t == b"}":
                    corte = k + 1; break
            partes.append(atual[:corte]); atual = atual[corte:]; tam = sum(map(len, atual))
        atual.append(l); tam += len(l)
    if atual: partes.append(atual)
    return partes

partes = dividir()
n = len(partes)
os.makedirs(saida, exist_ok=True)
for f in os.listdir(saida):
    if re.match(r"parte-\d+-de-\d+\.txt$", f): os.remove(os.path.join(saida, f))
textos = []
for x, p in enumerate(partes, 1):
    corpo = b"".join(p)
    if not corpo.endswith(b"\n"): corpo += b"\n"   # a linha de fim precisa começar numa linha nova
    t = corpo + marca(x, n)
    textos.append(t)
    open(os.path.join(saida, f"parte-{x}-de-{n}.txt"), "wb").write(t)

# Conferência 1: tirando as linhas de fim, as partes juntas são exatamente o arquivo.
juntas = b"".join(re.sub(rb"// ===== FIM DA PARTE \d+ DE \d+ =====\n$", b"", t) for t in textos)
if not dados.endswith(b"\n"): juntas = juntas[:-1]
exato = juntas == dados
# Conferência 2: o que fica no console colando as partes em ordem (com as linhas de fim).
com_marcas = b"".join(textos)
conf = os.path.join(aqui, "saida"); os.makedirs(conf, exist_ok=True)   # fora do git
open(os.path.join(conf, "remontado-com-marcas.rules"), "wb").write(com_marcas)
open(os.path.join(conf, "remontado-sem-marcas.rules"), "wb").write(juntas)
print(f"arquivo: {len(dados)} bytes, {len(linhas)} linhas, sha256 {hashlib.sha256(dados).hexdigest()[:16]}")
for x, t in enumerate(textos, 1):
    ult = [l for l in t.decode().splitlines() if l.strip()][-2].strip()
    print(f"  parte {x} de {n}: {len(t):>6} bytes, {t.count(b'\n'):>4} linhas · termina antes do fim em: {ult[:70]}")
print("maior parte:", max(map(len, textos)), "bytes (limite", LIMITE, ")")
print("partes juntas == arquivo (byte a byte):", "SIM" if exato else "NÃO")
print("sha256 remontado:", hashlib.sha256(juntas).hexdigest()[:16])
sys.exit(0 if exato and max(map(len, textos)) <= LIMITE else 1)
