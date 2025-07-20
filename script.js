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
