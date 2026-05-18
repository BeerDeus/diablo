// app.js - Imports mis à jour
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
// Dictionnaire global pour suivre les aspects possédés par l'utilisateur connecté
let userAspects = {};

// Initialisation dans l'objet global pour garantir la persistance au rafraîchissement
window.userAspects = {};

async function chargerAspectsUtilisateur() {
    if (!currentUser) return;
    try {
        const docRef = doc(db, "user_aspects", currentUser.uid);
        const docSnap = await getDoc(docRef);
        // Synchronisation directe avec l'instance globale
        window.userAspects = docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
        console.error("Erreur lors du chargement des aspects utilisateur :", error);
    }
}

// Met à jour un champ spécifique d'un aspect et sauvegarde la progression globale
window.majAspectUtilisateur = async (aspectName, champ, valeur) => {
    if (!currentUser) return;
    
    if (!window.userAspects[aspectName]) {
        window.userAspects[aspectName] = { obtenu: false, valeur: "", maxed: false };
    }
    
    window.userAspects[aspectName][champ] = valeur;

    try {
        await setDoc(doc(db, "user_aspects", currentUser.uid), window.userAspects);
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de l'aspect :", error);
    }
};

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginBtn.style.display = 'none';
        userInfo.style.display = 'inline';
        userInfo.textContent = `Connecté : ${user.displayName}`;
        // Chargement du suivi global puis de la liste des builds
        await chargerAspectsUtilisateur();
        chargerMesBuilds();
    } else {
        currentUser = null;
        loginBtn.style.display = 'inline';
        userInfo.style.display = 'none';
        document.getElementById('saved-builds-list').innerHTML = "Connectez-vous pour voir vos builds.";
        userAspects = {};
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

    // Ordre de tri de référence calqué sur le site Mobalytics
    const ordreVariantes = ["Legendary", "Uniques", "Mythic", "Selig Overpower", "Pit/Tower ONLY"];
    
    // Tri forcé des clés pour contrer la réorganisation alphabétique de Firebase
    const variantesTriees = Object.keys(buildData.variantes).sort((a, b) => {
        const idxA = ordreVariantes.indexOf(a);
        const idxB = ordreVariantes.indexOf(b);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    const tagsHTML = variantesTriees.map(v => 
        `<span class="tag" style="cursor:pointer;" onclick="window.afficherVarianteGénérique(window.activeBuildData, '${v}')">${v}</span>`
    ).join('');
    
    const premiereVariante = variantesTriees[0];

    resultDiv.innerHTML = `
        <h2>${buildData.nom} (Chargé)</h2>
        <div class="variant-tags">${tagsHTML}</div>
        <div class="gear-list" id="gear-display"></div>
        <p id="firebaseStatus"></p>
    `;

    window.afficherVarianteGénérique(window.activeBuildData, premiereVariante);
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

            const suivi = window.userAspects[item.nomEN] || { obtenu: false, valeur: "", maxed: false };

            // Nouveau comportement : Seule la couleur de la bordure change, l'opacité reste à 100%
            const cardStyle = suivi.obtenu 
                ? "border-left: 4px solid #4CAF50; transition: all 0.3s;" 
                : "border-left: 4px solid #8b0000; transition: all 0.3s;";

            let descFormattee = infoAspect.description
                .replace(/\[([^\]]+)\]%\[x\]/g, '<span style="color: #ff8800; font-weight: bold; white-space: nowrap;">[$1]%[x]</span>')
                .replace(/\[([^\]]+)\]%\[\+\]/g, '<span style="color: #4da6ff; font-weight: bold; white-space: nowrap;">[$1]%[+]</span>')
                .replace(/\[([^\]]+)\]/g, '<span style="color: #ffcc00; font-weight: bold; white-space: nowrap;">[$1]</span>');

            gearHTML += `
                <div class="gear-item" style="${cardStyle}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong style="color: #ffcc00;">${slotFR}</strong> <br>
                            <span style="color: #8b0000; font-weight: bold;">${infoAspect.nomFR}</span> <br>
                            <small style="color: #666;">(${item.nomEN})</small>
                        </div>
                        <label style="font-size: 0.85em; color: #aaa; cursor: pointer; display: flex; align-items: center; gap: 5px; user-select: none;">
                            <input type="checkbox" data-aspect="${item.nomEN}" ${suivi.obtenu ? 'checked' : ''} 
                                onchange="window.majAspectUtilisateur(this.dataset.aspect, 'obtenu', this.checked); 
                                const card = this.closest('.gear-item');
                                card.style.borderLeftColor = this.checked ? '#4CAF50' : '#8b0000';"> Possédé
                        </label>
                    </div>
                    
                    <p style="margin: 10px 0 14px 0; font-size: 0.88em; color: #eee; line-height: 1.4; background: #151515; padding: 8px; border-radius: 4px; border: 1px solid #252525;">
                        ${descFormattee}
                    </p>
                    
                    <div style="display: flex; gap: 10px; align-items: center; background: #222; padding: 6px 10px; border-radius: 4px; margin-top: auto;">
                        <span style="font-size: 0.8em; color: #bbb;">Ma valeur :</span>
                        <input type="text" data-aspect="${item.nomEN}" value="${suivi.valeur || ''}" placeholder="Ex: 45%" 
                            style="width: 75px; padding: 4px; background: #333; color: white; border: 1px solid #555; border-radius: 3px; font-size: 0.85em; text-align: center;" 
                            onchange="window.majAspectUtilisateur(this.dataset.aspect, 'valeur', this.value)">
                        
                        <label style="font-size: 0.8em; color: #ffcc00; cursor: pointer; display: flex; align-items: center; gap: 4px; margin-left: auto; user-select: none;">
                            <input type="checkbox" data-aspect="${item.nomEN}" ${suivi.maxed ? 'checked' : ''} 
                                onchange="window.majAspectUtilisateur(this.dataset.aspect, 'maxed', this.checked)"> Max (Perfect)
                        </label>
                    </div>
                </div>
            `;
        }
    }
    document.getElementById('gear-display').innerHTML = gearHTML;
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

        window.activeBuildData = buildData;

        // Ordre de tri de référence calqué sur le site Mobalytics
        const ordreVariantes = ["Legendary", "Uniques", "Mythic", "Selig Overpower", "Pit/Tower ONLY"];
        
        // Tri forcé des clés dès l'importation pour un affichage propre immédiat
        const variantesTriees = Object.keys(buildData.variantes).sort((a, b) => {
            const idxA = ordreVariantes.indexOf(a);
            const idxB = ordreVariantes.indexOf(b);
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });

        const tagsHTML = variantesTriees.map(v => 
            `<span class="tag" style="cursor:pointer;" onclick="window.afficherVarianteGénérique(window.activeBuildData, '${v}')">${v}</span>`
        ).join('');
        
        const premiereVariante = variantesTriees[0];

        resultDiv.innerHTML = `
            <h2>${buildData.nom}</h2>
            <div class="variant-tags">${tagsHTML}</div>
            <div class="gear-list" id="gear-display"></div>
            <p id="firebaseStatus"></p>
        `;

        window.afficherVarianteGénérique(window.activeBuildData, premiereVariante);

        document.getElementById('firebaseStatus').innerHTML = "Sauvegarde dans Firebase en cours...";
        const docRef = await addDoc(collection(db, "builds_diablo"), buildData);
        document.getElementById('firebaseStatus').innerHTML = 
            `<span class="success-msg">✓ Build sauvegardé avec succès ! (ID: ${docRef.id})</span>`;

        if (typeof chargerMesBuilds === "function") chargerMesBuilds();

    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = `<p style="color: red; text-align:center;">Erreur : ${error.message}</p>`;
    }
});