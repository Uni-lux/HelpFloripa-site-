// Cidades e bairros
const bairrosPorCidade = {
  florianopolis: ["Centro", "Trindade", "Ingleses", "Campeche", "Estreito"],
  saojose: ["Kobrasol", "Barreiros", "Roçado", "Serraria", "Forquilhas"]
};

const cidadeSelect = document.getElementById("cidade");
const bairroSelect = document.getElementById("bairro");

if (cidadeSelect) {
  cidadeSelect.addEventListener("change", function () {
    const cidade = this.value;
    bairroSelect.innerHTML = "<option value=''>Selecione</option>";
    if (bairrosPorCidade[cidade]) {
      bairrosPorCidade[cidade].forEach((bairro) => {
        const option = document.createElement("option");
        option.value = bairro;
        option.textContent = bairro;
        bairroSelect.appendChild(option);
      });
    }
  });
}

// Cadastro simulado
const cadastrarForm = document.getElementById("cadastrarForm");
if (cadastrarForm) {
  cadastrarForm.addEventListener("submit", function (e) {
    e.preventDefault();
    alert("Cadastro enviado com sucesso! Em breve entraremos em contato.");
    cadastrarForm.reset();
    bairroSelect.innerHTML = "<option value=''>Selecione</option>";
  });
}
function calcularPreco() {
  const profissional = document.getElementById("profissional").value;
  const cidade = document.getElementById("cidade").value;
  const precoFinal = document.getElementById("precoFinal");

  const tabelaPrecos = {
    eletricista: 120,
    encanador: 110,
    faxineira: 100,
    pedreiro: 150,
    jardineiro: 90,
    diarista: 95
  };

  let gasolina = cidade === "saojose" ? 70 : 25;

  if (profissional && tabelaPrecos[profissional]) {
    const total = tabelaPrecos[profissional] + gasolina;
    precoFinal.textContent = `Valor Total: R$ ${total.toFixed(2)}`;
  } else {
    precoFinal.textContent = "Valor Total: R$ 0,00";
  }
}

document.getElementById("solicitarForm").addEventListener("submit", function(e) {
  e.preventDefault();
  alert("Sua solicitação foi enviada com sucesso! Em breve entraremos em contato.");
  this.reset();
  document.getElementById("precoFinal").textContent = "Valor Total: R$ 0,00";
});
