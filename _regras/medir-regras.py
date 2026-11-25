# Mede o "tamanho compilado" de cada arquivo em _regras/medir/ SEM mexer nas regras do ar.
# Uso (Cloud Shell, pasta hf):  python3 _regras/medir-regras.py
# Para cada arquivo: envia como regras novas, tenta criar uma "release" de teste com outro nome
# (hf-medida-N, que não é usada pelo Firestore), lê o tamanho na resposta e apaga tudo depois.
import glob, json, os, re, subprocess, urllib.request, urllib.error

PROJ = "helpfloripa-61e0d"
BASE = "https://firebaserules.googleapis.com/v1/"
API = BASE + "projects/" + PROJ
TOKEN = subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()

def chamar(metodo, url, corpo=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(url, data=dados, method=metodo, headers={
        "Authorization": "Bearer " + TOKEN, "x-goog-user-project": PROJ,
        "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")

pasta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "medir")
print(f"{'arquivo':32} {'texto':>8}  compilado")
for n, arq in enumerate(sorted(glob.glob(os.path.join(pasta, "*.rules")))):
    nome = os.path.basename(arq)
    texto = open(arq, encoding="utf-8").read()
    st, rs = chamar("POST", API + "/rulesets", {"source": {"files": [{"name": nome, "content": texto}]}})
    if st != 200:
        print(f"{nome:32} {len(texto.encode()):>8}  ERRO ao enviar: {str(rs)[:200]}"); continue
    rel = f"projects/{PROJ}/releases/hf-medida-{n}"
    st2, r2 = chamar("POST", API + "/releases", {"name": rel, "rulesetName": rs["name"]})
    if st2 == 200:
        res = "CABE (menos de 256000)"
        chamar("DELETE", BASE + rel)
    else:
        m = re.search(r"actual: (\d+)", str(r2))
        res = f"{int(m.group(1)):,}".replace(",", ".") if m else f"erro {st2}: {str(r2)[:160]}"
    chamar("DELETE", BASE + rs["name"])
    print(f"{nome:32} {len(texto.encode()):>8}  {res}")
print("Pronto. As regras do ar não foram mexidas.")
