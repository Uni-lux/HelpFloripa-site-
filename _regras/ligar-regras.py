# Liga no Firestore as regras que o "firebase deploy --only firestore:rules" já enviou.
# Uso (no Cloud Shell, dentro da pasta hf):  python3 _regras/ligar-regras.py
# Por quê: em 25/11/2026 o deploy compilou e enviou as regras, mas falhou no último passo com
# "409 ... releases/cloud.firestore already exists". Este script faz esse último passo direto na API:
# acha as regras mais novas enviadas (arquivo firestore-publicar.rules) e aponta o Firestore para elas.
import json, subprocess, sys, urllib.request, urllib.error

PROJ = "helpfloripa-61e0d"
API = "https://firebaserules.googleapis.com/v1/projects/" + PROJ
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

st, lista = chamar("GET", API + "/rulesets?pageSize=40")
if st != 200: sys.exit(f"Não consegui listar as regras enviadas ({st}): {lista}")
sets = sorted(lista.get("rulesets", []), key=lambda r: r.get("createTime", ""), reverse=True)
escolhido = None
for r in sets:
    st, cheio = chamar("GET", "https://firebaserules.googleapis.com/v1/" + r["name"])
    arqs = (cheio.get("source", {}) or {}).get("files", []) if st == 200 else []
    if any(a.get("name", "").endswith("firestore-publicar.rules") for a in arqs):
        escolhido = r; break
if not escolhido: sys.exit("Não achei as regras enviadas pelo deploy. Rode o deploy de novo e depois este script.")
print("Regras novas:", escolhido["name"], "· enviadas em", escolhido.get("createTime"))

REL = "projects/" + PROJ + "/releases/cloud.firestore"
st, atual = chamar("GET", "https://firebaserules.googleapis.com/v1/" + REL)
print("No ar antes:", atual.get("rulesetName") if st == 200 else f"(não consegui ler: {st})")
if st == 200 and atual.get("rulesetName") == escolhido["name"]:
    sys.exit("Essas regras já estão no ar. Nada a fazer.")

corpo = {"release": {"name": REL, "rulesetName": escolhido["name"]}, "updateMask": "rulesetName"}
st, res = chamar("PATCH", "https://firebaserules.googleapis.com/v1/" + REL, corpo)
if st == 404:
    st, res = chamar("POST", API + "/releases", {"name": REL, "rulesetName": escolhido["name"]})
if st != 200: sys.exit(f"Falhou ao ligar as regras ({st}): {res}")

st, depois = chamar("GET", "https://firebaserules.googleapis.com/v1/" + REL)
if st == 200 and depois.get("rulesetName") == escolhido["name"]:
    print("PRONTO: as regras novas estão no ar.")
else:
    sys.exit(f"Não confirmou ({st}): {depois}")
