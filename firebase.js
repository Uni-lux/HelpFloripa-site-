// Importações do Firebase (versão mais recente via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Configuração do seu projeto
const firebaseConfig = {
  apiKey: "AIzaSyBbRxwW0RdSNxRtdC6vKt3Ql66Y1lyVvO8",
  authDomain: "helpfloripa-61e0d.firebaseapp.com",
  projectId: "helpfloripa-61e0d",
  storageBucket: "helpfloripa-61e0d.firebasestorage.app",
  messagingSenderId: "1011152435942",
  appId: "1:1011152435942:web:4746d789487866c9861927"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa os serviços que você vai usar
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Exporta para usar em outros arquivos
export { app, auth, db, storage };
