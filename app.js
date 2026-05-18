// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

const importBtn = document.getElementById('importBtn');
const resultDiv = document.getElementById('result');

importBtn.addEventListener('click', async () => {
    const url = document.getElementById('buildUrl').value;
    
    if (!url) {
        alert("Veuillez entrer une URL");
        return;
    }

    resultDiv.innerHTML = "<p style='text-align:center;'>Magie en cours... Scraping du build...</p>";

    try {
        // 1. Appel au serveur Node.js local (modifie l'URL quand tu seras en ligne)
        const response = await fetch('http://localhost:3000/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) throw new Error("Erreur serveur lors de l'analyse");
        
        const buildData = await response.json();

        // 2. Affichage sur la page HTML
        const tagsHTML = buildData.variantesDisponibles.map(v => `<span class="tag">${v}</span>`).join('');
        
        resultDiv.innerHTML = `
            <h2>${buildData.nom}</h2>
            <div class="variant-tags">${tagsHTML}</div>
            
            <div class="gear-list">
                <div class="gear-item">
                    <strong>Casque :</strong> ${buildData.equipement.casque.nomFR} <br>
                    <small>(${buildData.equipement.casque.nomEN}) - <i>${buildData.equipement.casque.type}</i></small>
                </div>
                <div class="gear-item">
                    <strong>Torse :</strong> ${buildData.equipement.torse.nomFR} <br>
                    <small>(${buildData.equipement.torse.nomEN}) - <i>${buildData.equipement.torse.type}</i></small>
                </div>
                <div class="gear-item">
                    <strong>Gants :</strong> ${buildData.equipement.gants.nomFR} <br>
                    <small>(${buildData.equipement.gants.nomEN}) - <i>${buildData.equipement.gants.type}</i></small>
                </div>
            </div>
            <p id="firebaseStatus"></p>
        `;

        // 3. Sauvegarde automatique dans Firestore
        document.getElementById('firebaseStatus').innerHTML = "Sauvegarde dans Firebase en cours...";
        
        const docRef = await addDoc(collection(db, "builds_diablo"), buildData);
        
        document.getElementById('firebaseStatus').innerHTML = 
            `<span class="success-msg">✓ Build sauvegardé avec succès dans Firebase ! (ID: ${docRef.id})</span>`;

    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = `<p style="color: red; text-align:center;">Erreur : ${error.message}</p>`;
    }
});