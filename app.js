// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

// Dictionnaire global pour stocker les aspects
let aspectsDict = {};

// Chargement de la base au démarrage
async function chargerDictionnaire() {
    try {
        const res = await fetch('http://localhost:3000/api/aspects');
        aspectsDict = await res.json();
    } catch (error) {
        console.error("Impossible de charger les traductions :", error);
    }
}
chargerDictionnaire();

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
        // On charge les builds de l'utilisateur dès qu'il est connecté
        chargerMesBuilds();
    } else {
        currentUser = null;
        loginBtn.style.display = 'inline';
        userInfo.style.display = 'none';
        document.getElementById('saved-builds-list').innerHTML = "Connectez-vous pour voir vos builds.";
    }
});

// Extraction des builds enregistrés dans Firestore correspondant au compte connecté
async function chargerMesBuilds() {
    const listDiv = document.getElementById('saved-builds-list');
    if (!listDiv) return;
    listDiv.innerHTML = "<p>Chargement de vos builds...</p>";

    try {
        const q = query(collection(db, "builds_diablo"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            listDiv.innerHTML = "<p style='color: #aaa;'>Aucun build sauvegardé pour le moment.</p>";
            return;
        }

        let html = "";
        window.buildsSauvegardes = {}; 

        querySnapshot.forEach((doc) => {
            const build = doc.data();
            window.buildsSauvegardes[doc.id] = build;
            html += `
                <div style="background: #2a2a2a; padding: 15px; border-left: 4px solid var(--d4-red); border-radius: 4px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #ffcc00; font-size: 1.1em;">${build.nom}</strong>
                    <button onclick="chargerBuildSurPage('${doc.id}')" style="padding: 8px 15px; font-size: 0.9em; background-color: #8b0000; color: white; border: none; cursor: pointer;">Afficher</button>
                </div>
            `;
        });
        
        listDiv.innerHTML = html;

    } catch (error) {
        console.error("Erreur lors du chargement de l'historique :", error);
        listDiv.innerHTML = "<p style='color:red;'>Erreur lors du chargement de vos builds.</p>";
    }
}

// Restitution d'un build historique sélectionné dans la zone d'affichage principale
window.chargerBuildSurPage = (buildId) => {
    const buildData = window.buildsSauvegardes[buildId];
    if (!buildData) return;

    window.activeBuildData = buildData;

    const tagsHTML = Object.keys(buildData.variantes).map(v => 
        `<span class="tag" style="cursor:pointer;" onclick="afficherVarianteGénérique(window.activeBuildData, '${v}')">${v}</span>`
    ).join('');
    
    const premiereVariante = Object.keys(buildData.variantes)[0];

    resultDiv.innerHTML = `
        <h2>${buildData.nom} (Chargé)</h2>
        <div class="variant-tags">${tagsHTML}</div>
        <div class="gear-list" id="gear-display"></div>
        <p id="firebaseStatus"></p>
    `;

    afficherVarianteGénérique(window.activeBuildData, premiereVariante);
};

// Moteur de rendu partagé gérant l'ordre d'affichage, les traductions et l'injection des descriptions
window.afficherVarianteGénérique = (buildData, varianteNom) => {
    const equipement = buildData.variantes[varianteNom];
    let gearHTML = '';
    
    const ordreEquipement = {
        "Helm": "Casque",
        "Chest armor": "Plastron",
        "Gloves": "Gants",
        "Pants": "Jambières",
        "Boots": "Bottes",
        "Amulet": "Amulette",
        "Ring 1": "Anneau 1",
        "Ring 2": "Anneau 2",
        "Bludgeoning weapon": "Arme contondante",
        "Slashing weapon": "Arme tranchante",
        "Dual wield weapon 1": "Arme à une main 1",
        "Dual wield weapon 2": "Arme à une main 2"
    };
    
    for (const [slotEN, slotFR] of Object.entries(ordreEquipement)) {
        if (equipement && equipement[slotEN]) {
            const item = equipement[slotEN];
            const infoAspect = aspectsDict[item.nomEN] || { 
                nomFR: item.nomEN, 
                description: "⚠️ Aspect manquant dans la base de données. À ajouter manuellement." 
            };

            gearHTML += `
                <div class="gear-item">
                    <strong style="color: #ffcc00;">${slotFR}</strong> <br>
                    <span style="color: #8b0000; font-weight: bold;">${infoAspect.nomFR}</span> <br>
                    <small style="color: #666;">(${item.nomEN})</small>
                    <p style="margin: 5px 0 0 0; font-size: 0.85em; font-style: italic; color: #aaa;">
                        ${infoAspect.description}
                    </p>
                </div>
            `;
        }
    }
    document.getElementById('gear-display').innerHTML = gearHTML;
};

// Fonction globale appelée par les boutons "Afficher"
window.chargerBuildSurPage = (buildId) => {
    const buildData = window.buildsSauvegardes[buildId];
    if(!buildData) return;

    window.afficherVariante = (varianteNom) => {
            const equipement = buildData.variantes[varianteNom];
            let gearHTML = '';
            
            // Dictionnaire pour forcer l'ordre d'affichage de haut en bas et traduire l'emplacement
            const ordreEquipement = {
                "Helm": "Casque",
                "Chest armor": "Plastron",
                "Gloves": "Gants",
                "Pants": "Jambières",
                "Boots": "Bottes",
                "Amulet": "Amulette",
                "Ring 1": "Anneau 1",
                "Ring 2": "Anneau 2",
                "Bludgeoning weapon": "Arme contondante",
                "Slashing weapon": "Arme tranchante",
                "Dual wield weapon 1": "Arme à une main 1",
                "Dual wield weapon 2": "Arme à une main 2"
            };
            
            // On boucle sur notre dictionnaire plutôt que sur les données brutes pour respecter l'ordre
            for (const [slotEN, slotFR] of Object.entries(ordreEquipement)) {
                // On vérifie si le build contient cet objet (pour éviter des erreurs si l'arme est vide)
                if (equipement[slotEN]) {
                    const item = equipement[slotEN];
                    const infoAspect = aspectsDict[item.nomEN] || { 
                        nomFR: item.nomEN, 
                        description: "⚠️ Aspect manquant dans la base de données. À ajouter manuellement." 
                    };

                    gearHTML += `
                        <div class="gear-item">
                            <strong style="color: #ffcc00;">${slotFR}</strong> <br>
                            <span style="color: var(--d4-red); font-weight: bold;">${infoAspect.nomFR}</span> <br>
                            <small style="color: #666;">(${item.nomEN})</small>
                            <p style="margin: 5px 0 0 0; font-size: 0.85em; font-style: italic; color: #aaa;">
                                ${infoAspect.description}
                            </p>
                        </div>
                    `;
                }
            }
            document.getElementById('gear-display').innerHTML = gearHTML;
        };

    const tagsHTML = Object.keys(buildData.variantes).map(v => 
        `<span class="tag" style="cursor:pointer;" onclick="afficherVariante('${v}')">${v}</span>`
    ).join('');
    
    const premiereVariante = Object.keys(buildData.variantes)[0];

    resultDiv.innerHTML = `
        <h2>${buildData.nom} (Chargé)</h2>
        <div class="variant-tags">${tagsHTML}</div>
        <div class="gear-list" id="gear-display"></div>
        <p id="firebaseStatus"></p>
    `;

    window.afficherVariante(premiereVariante);
};

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
        buildData.userId = currentUser.uid;

        // Enregistrement des données de build au niveau de la fenêtre globale pour les rendre accessibles aux onglets
        window.activeBuildData = buildData;

        const tagsHTML = Object.keys(buildData.variantes).map(v => 
            `<span class="tag" style="cursor:pointer;" onclick="afficherVarianteGénérique(window.activeBuildData, '${v}')">${v}</span>`
        ).join('');
        
        const premiereVariante = Object.keys(buildData.variantes)[0];

        resultDiv.innerHTML = `
            <h2>${buildData.nom}</h2>
            <div class="variant-tags">${tagsHTML}</div>
            <div class="gear-list" id="gear-display"></div>
            <p id="firebaseStatus"></p>
        `;

        afficherVarianteGénérique(window.activeBuildData, premiereVariante);

        document.getElementById('firebaseStatus').innerHTML = "Sauvegarde dans Firebase en cours...";
        const docRef = await addDoc(collection(db, "builds_diablo"), buildData);
        document.getElementById('firebaseStatus').innerHTML = 
            `<span class="success-msg">✓ Build sauvegardé avec succès ! (ID: ${docRef.id})</span>`;

        // Actualisation immédiate du panneau historique après un ajout
        if (typeof chargerMesBuilds === "function") chargerMesBuilds();

    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = `<p style="color: red; text-align:center;">Erreur : ${error.message}</p>`;
    }
});

window.afficherVariante = (varianteNom) => {
            const equipement = buildData.variantes[varianteNom];
            let gearHTML = '';
            
            // Dictionnaire pour forcer l'ordre d'affichage de haut en bas et traduire l'emplacement
            const ordreEquipement = {
                "Helm": "Casque",
                "Chest armor": "Plastron",
                "Gloves": "Gants",
                "Pants": "Jambières",
                "Boots": "Bottes",
                "Amulet": "Amulette",
                "Ring 1": "Anneau 1",
                "Ring 2": "Anneau 2",
                "Bludgeoning weapon": "Arme contondante",
                "Slashing weapon": "Arme tranchante",
                "Dual wield weapon 1": "Arme à une main 1",
                "Dual wield weapon 2": "Arme à une main 2"
            };
            
            // On boucle sur notre dictionnaire plutôt que sur les données brutes pour respecter l'ordre
            for (const [slotEN, slotFR] of Object.entries(ordreEquipement)) {
                // On vérifie si le build contient cet objet (pour éviter des erreurs si l'arme est vide)
                if (equipement[slotEN]) {
                    const item = equipement[slotEN];
                    const infoAspect = aspectsDict[item.nomEN] || { 
                        nomFR: item.nomEN, 
                        description: "⚠️ Aspect manquant dans la base de données. À ajouter manuellement." 
                    };

                    gearHTML += `
                        <div class="gear-item">
                            <strong style="color: #ffcc00;">${slotFR}</strong> <br>
                            <span style="color: var(--d4-red); font-weight: bold;">${infoAspect.nomFR}</span> <br>
                            <small style="color: #666;">(${item.nomEN})</small>
                            <p style="margin: 5px 0 0 0; font-size: 0.85em; font-style: italic; color: #aaa;">
                                ${infoAspect.description}
                            </p>
                        </div>
                    `;
                }
            }
            document.getElementById('gear-display').innerHTML = gearHTML;
        };