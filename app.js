// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Ta configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBmEzUp7iTllPhNI3X4yf0M-0phKgz47Es",
    authDomain: "questoria-2459c.firebaseapp.com",
    projectId: "questoria-2459c",
    storageBucket: "questoria-2459c.firebasestorage.app",
    messagingSenderId: "784834017736",
    appId: "1:784834017736:web:9325ca8ade1c13368868fd",
    measurementId: "G-SBDRYHXG61"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialisation de l'authentification Firebase
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
let currentUser = null;

const importBtn = document.getElementById('importBtn');
const resultDiv = document.getElementById('result');

// Gestion de la connexion avec Google
const loginBtn = document.getElementById('loginBtn');
const userInfo = document.getElementById('userInfo');

loginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Erreur de connexion :", error);
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loginBtn.style.display = 'none';
        userInfo.style.display = 'inline';
        userInfo.textContent = `Connecté : ${user.displayName}`;
    } else {
        currentUser = null;
        loginBtn.style.display = 'inline';
        userInfo.style.display = 'none';
    }
});

importBtn.addEventListener('click', async () => {
    const url = document.getElementById('buildUrl').value;
    
    if (!url) {
        alert("Veuillez entrer une URL");
        return;
    }

    if (!currentUser) {
        alert("Tu dois être connecté pour sauvegarder un build.");
        return;
    }

    resultDiv.innerHTML = "<p style='text-align:center;'>Magie en cours... Scraping du build...</p>";

    try {
        const response = await fetch('http://localhost:3000/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) throw new Error("Erreur serveur lors de l'analyse");
        
        const buildData = await response.json();
        
        // On affiche les données dans la console (F12) pour vérifier ce que le serveur nous envoie
        console.log("Données reçues du serveur :", buildData);

        // Sécurité : si la propriété variantes n'existe pas, on bloque l'exécution proprement
        if (!buildData.variantes) {
            throw new Error("Les données reçues sont invalides. As-tu bien redémarré server.js ?");
        }
        
        buildData.userId = currentUser.uid;

        window.afficherVariante = (varianteNom) => {
            const equipement = buildData.variantes[varianteNom];
            let gearHTML = '';
            
            for (const [slot, item] of Object.entries(equipement)) {
                gearHTML += `
                    <div class="gear-item">
                        <strong>${slot} :</strong> ${item.nomFR} <br>
                        <small>(${item.nomEN})</small>
                    </div>
                `;
            }
            document.getElementById('gear-display').innerHTML = gearHTML;
        };

        const tagsHTML = Object.keys(buildData.variantes).map(v => 
            `<span class="tag" style="cursor:pointer;" onclick="afficherVariante('${v}')">${v}</span>`
        ).join('');
        
        const premiereVariante = Object.keys(buildData.variantes)[0];

        resultDiv.innerHTML = `
            <h2>${buildData.nom}</h2>
            <div class="variant-tags">${tagsHTML}</div>
            <div class="gear-list" id="gear-display"></div>
            <p id="firebaseStatus"></p>
        `;

        window.afficherVariante(premiereVariante);

        document.getElementById('firebaseStatus').innerHTML = "Sauvegarde dans Firebase en cours...";
        
        const docRef = await addDoc(collection(db, "builds_diablo"), buildData);
        
        document.getElementById('firebaseStatus').innerHTML = 
            `<span class="success-msg">✓ Build sauvegardé avec succès ! (ID: ${docRef.id})</span>`;

    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = `<p style="color: red; text-align:center;">Erreur : ${error.message}</p>`;
    }
});