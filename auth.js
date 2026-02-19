(function () {
  const STORAGE_KEY = "helpFloripaUser";

  function getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("[Auth] Falha ao ler usuário", error);
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function requireCadastro(actionText) {
    if (getUser()) return true;
    alert(`Para ${actionText}, se cadastra primeiro.`);
    window.location.href = "cadastre-se.html";
    return false;
  }

  function getInitials(name) {
    if (!name) return "HF";
    const parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "HF";
  }

  function injectProfileStyles() {
    if (document.getElementById("perfilUsuarioStyles")) return;

    const style = document.createElement("style");
    style.id = "perfilUsuarioStyles";
    style.textContent = `
      .profile-fab {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 9999;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: 2px solid #00adee;
        overflow: hidden;
        cursor: pointer;
        background: #111;
        color: #fff;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      }

      .profile-fab img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .profile-fab span {
        font-size: 14px;
        letter-spacing: 0.5px;
      }

      .profile-card {
        position: fixed;
        top: 76px;
        right: 16px;
        z-index: 9999;
        width: min(320px, calc(100vw - 32px));
        background: #0f0f0f;
        color: #f1f1f1;
        border: 1px solid #00adee66;
        border-radius: 14px;
        padding: 14px;
        box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
        display: none;
      }

      .profile-card h4 {
        margin: 0 0 10px;
        color: #00adee;
      }

      .profile-card p {
        margin: 6px 0;
        font-size: 14px;
      }

      .profile-card .actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .profile-card .actions button {
        flex: 1;
        border: none;
        border-radius: 8px;
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 700;
      }

      .profile-card .actions .edit {
        background: #00adee;
        color: #000;
      }

      .profile-card .actions .logout {
        background: #252525;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  function buildProfileButton() {
    const user = getUser();
    if (!user) return;
    if (document.getElementById("perfilUsuarioBtn")) return;

    injectProfileStyles();

    const fab = document.createElement("button");
    fab.id = "perfilUsuarioBtn";
    fab.className = "profile-fab";
    fab.type = "button";
    fab.title = "Perfil";

    if (user.fotoUrl) {
      const img = document.createElement("img");
      img.src = user.fotoUrl;
      img.alt = `Foto de perfil de ${user.nome || "usuário"}`;
      fab.appendChild(img);
    } else {
      const initials = document.createElement("span");
      initials.textContent = getInitials(user.nome);
      fab.appendChild(initials);
    }

    const card = document.createElement("div");
    card.id = "perfilUsuarioCard";
    card.className = "profile-card";
    card.innerHTML = `
      <h4>Meu perfil</h4>
      <p><strong>Nome:</strong> ${user.nome || "-"}</p>
      <p><strong>Telefone:</strong> ${user.telefone || "-"}</p>
      <p><strong>Cidade:</strong> ${user.cidade || "-"}</p>
      <p><strong>Área:</strong> ${user.classe || "-"}</p>
      <div class="actions">
        <button type="button" class="edit" id="perfilEditarBtn">Editar</button>
        <button type="button" class="logout" id="perfilSairBtn">Sair</button>
      </div>
    `;

    fab.addEventListener("click", function () {
      card.style.display = card.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", function (event) {
      if (!card.contains(event.target) && !fab.contains(event.target)) {
        card.style.display = "none";
      }
    });

    document.body.appendChild(fab);
    document.body.appendChild(card);

    const editBtn = document.getElementById("perfilEditarBtn");
    const sairBtn = document.getElementById("perfilSairBtn");

    if (editBtn) {
      editBtn.addEventListener("click", function () {
        window.location.href = "cadastrar.html";
      });
    }

    if (sairBtn) {
      sairBtn.addEventListener("click", function () {
        const shouldLogout = confirm("Deseja remover este perfil deste aparelho?");
        if (shouldLogout) {
          clearUser();
          window.location.reload();
        }
      });
    }
  }

  function prefillFormById(formId) {
    const user = getUser();
    if (!user) return;
    const form = document.getElementById(formId);
    if (!form) return;

    Object.keys(user).forEach((key) => {
      const field = form.querySelector(`[name="${key}"], #${key}`);
      if (field && !field.value) {
        field.value = user[key];
      }
    });
  }

  window.HelpAuth = {
    getUser,
    saveUser,
    clearUser,
    requireCadastro,
    buildProfileButton,
    prefillFormById
  };

  document.addEventListener("DOMContentLoaded", function () {
    buildProfileButton();
  });
})();
