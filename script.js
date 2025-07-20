// Alternância da barra lateral
const toggleBtn = document.querySelector('.toggle-btn');
const sidebar = document.querySelector('.sidebar');

toggleBtn?.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Cálculo de preço
function calcularPreco() {
  const profissional = document.getElementById("profissional").value;
  const precoFinal = document.getElementById("precoFinal");

  const tabelaPrecos = {
    eletricista: 120,
    encanador: 110,
    faxineira: 100,
    pedreiro: 150,
    jardineiro: 90,
    diarista: 95
  };

  const gasolina = 25; // valor fixo

  if (profissional && tabelaPrecos[profissional]) {
    const total = tabelaPrecos[profissional] + gasolina;
    precoFinal.textContent = `Valor Total: R$ ${total.toFixed(2)}`;
    precoFinal.style.color = '#003366'; // azul escuro
  } else {
    precoFinal.textContent = `Valor Total: R$ 0,00`;
    precoFinal.style.color = '#888'; // cinza
  }
}

// Atualização dinâmica dos bairros conforme cidade
document.getElementById("cidade")?.addEventListener("change", function () {
  const cidade = this.value;
  const bairroSelect = document.getElementById("bairro");

  const bairros = {
    florianopolis: ["Centro", "Ingleses", "Trindade", "Campeche", "Estreito"],
    sao_jose: ["Kobrasol", "Barreiros", "Roçado", "Forquilhinhas", "Ipiranga"]
  };

  // Limpar opções anteriores
  bairroSelect.innerHTML = '<option value="">Selecione o bairro</option>';

  if (cidade && bairros[cidade]) {
    bairros[cidade].forEach(bairro => {
      const opt = document.createElement("option");
      opt.value = bairro.toLowerCase().replace(/\s/g, "_");
      opt.textContent = bairro;
      bairroSelect.appendChild(opt);
    });
  }
});

// Envio do formulário com feedback visual
document.getElementById("solicitarForm")?.addEventListener("submit", function (e) {
  e.preventDefault();

  const botao = this.querySelector("button[type='submit']");
  const precoFinal = document.getElementById("precoFinal");

  botao.disabled = true;
  botao.textContent = "Enviando...";

  setTimeout(() => {
    alert("✅ Sua solicitação foi enviada com sucesso!\nEm breve entraremos em contato.");
    this.reset();
    precoFinal.textContent = "Valor Total: R$ 0,00";
    precoFinal.style.color = "#888";
    botao.disabled = false;
    botao.textContent = "Solicitar Profissional";
  }, 1200);
});
