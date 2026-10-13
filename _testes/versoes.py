# Garante que todo arquivo .js/.css alterado (em relação ao HEAD) tenha o ?v= aumentado
# exatamente uma vez em todos os lugares que o importam. Repete até estabilizar (cascata).
import re, subprocess, glob, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
def head(f):
    try: return subprocess.run(["git", "show", f"HEAD:{f}"], capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError: return None
arquivos = glob.glob("*.js") + glob.glob("*.html") + glob.glob("*.css")
while True:
    mudados = [f for f in arquivos if f.endswith((".js", ".css")) and head(f) != open(f, encoding="utf-8").read()]
    feito = False
    for alvo in mudados:
        pat = re.compile(r'((?<![\w.-])(?:\./)?' + re.escape(alvo) + r')\?v=(\d+)')
        for f in arquivos:
            atual = open(f, encoding="utf-8").read(); antes = head(f) or ""
            v_antes = {m.group(2) for m in pat.finditer(antes)}
            def troca(m):
                v = int(m.group(2))
                return f"{m.group(1)}?v={v + 1}" if m.group(2) in v_antes and str(v + 1) not in v_antes else m.group(0)
            if not v_antes: continue
            # só aumenta se ainda está igual ao do HEAD
            novo = pat.sub(lambda m: troca(m) if m.group(2) in v_antes else m.group(0), atual)
            if novo != atual:
                open(f, "w", encoding="utf-8").write(novo); feito = True; print(f"{f}: {alvo} {sorted(v_antes)} -> +1")
    if not feito: break
# sem ?v (importação direta) também é avisado
for alvo in mudados:
    for f in arquivos:
        if re.search(r'["\'](?:\./)?' + re.escape(alvo) + r'["\']', open(f, encoding="utf-8").read()): print("SEM ?v:", f, "->", alvo)
print("alterados:", mudados)
