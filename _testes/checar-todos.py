# Valida todos os .xlsx de uma pasta: Open XML SDK (Office 2007, 2016 e 365) + checar-xlsx.py + openpyxl.
# Uso: python3 checar-todos.py saida/xlsx   (rode dentro de _testes/, depois do npm install)
import sys, glob, json, subprocess, os
pasta = sys.argv[1] if len(sys.argv) > 1 else "saida/xlsx"
aqui = os.path.dirname(os.path.abspath(__file__))
ruim = 0
arquivos = sorted(glob.glob(os.path.join(pasta, "*.xlsx")))
if not arquivos: print(f"Nenhum .xlsx em {pasta}"); sys.exit(1)
for f in arquivos:
    linha = [os.path.basename(f)]
    for v in ["Office2007", "Office2016", "Microsoft365"]:
        r = subprocess.run(["npx", "--no-install", "ooxml-validator", f, "--officeVersion", v], capture_output=True, text=True, cwd=aqui)
        try: d = json.loads(r.stdout); ok = d.get("ok")
        except Exception: ok, d = False, {"errors": [r.stderr[:200]]}
        linha.append(f"{v}:{'ok' if ok else 'ERRO ' + str(d.get('errors', [])[:2])}")
        ruim += not ok
    c = subprocess.run([sys.executable, "-I", os.path.join(aqui, "checar-xlsx.py"), f], capture_output=True, text=True)
    linha.append("consistência:" + c.stdout.strip().replace("\n", " | ")); ruim += c.returncode != 0
    print("  ".join(linha))
print("TUDO OK" if not ruim else f"{ruim} PROBLEMA(S)")
sys.exit(1 if ruim else 0)
