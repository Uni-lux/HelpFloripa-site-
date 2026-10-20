# Gera geo-cidades.json: { "codigo IBGE": [latitude, longitude] } do centro de cada município (5.571).
# Fonte: github.com/kelvins/municipios-brasileiros (MIT), dados públicos do IBGE.
# Uso: python3 -I scripts/geo/gerar-geo-cidades.py municipios.json  (o arquivo baixado da fonte)
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8-sig"))
saida = {str(x["codigo_ibge"]): [round(x["latitude"], 4), round(x["longitude"], 4)] for x in d}
open("geo-cidades.json", "w", encoding="utf-8").write(json.dumps(saida, separators=(",", ":")))
print(len(saida), "cidades")
