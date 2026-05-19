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

// Récupère le dictionnaire d'aspects depuis le serveur via un chemin relatif
async function chargerDictionnaire() {
    try {
        const res = await fetch('/api/aspects');
        aspectsDict = await res.json();
    } catch (error) {
        console.error("Impossible de charger les traductions :", error);
    }
}
chargerDictionnaire();

let statsDict = {};

// Chargement de la base de données des statistiques par objet
async function chargerDonneesStats() {
    try {
        const response = await fetch('stats.json');
        statsDict = await response.json();
    } catch (erreur) {
        console.error("Impossible de charger stats.json :", erreur);
    }
}
// Pense à appeler chargerDonneesStats() à l'initialisation de ton application
chargerDonneesStats();

// --- AJOUT : Dictionnaire pour les trempes ---
let tempersDict = {};

async function chargerDonneesTempers() {
    try {
        const response = await fetch('temper.json');
        tempersDict = await response.json();
    } catch (erreur) {
        console.error("Impossible de charger temper.json :", erreur);
    }
}
chargerDonneesTempers();

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
                    <div>
                        <button onclick="window.editerBuild('${doc.id}')" style="padding: 8px 15px; font-size: 0.9em; background-color: #2e7d32; color: white; border: none; cursor: pointer; margin-right: 5px; border-radius: 4px;">Modifier</button>
                        <button onclick="window.chargerBuildSurPage('${doc.id}')" style="padding: 8px 15px; font-size: 0.9em; background-color: #8b0000; color: white; border: none; cursor: pointer; border-radius: 4px;">Afficher</button>
                    </div>
                </div>
            `;
        });
        
        listDiv.innerHTML = html;

    } catch (error) {
        console.error("Erreur lors du chargement de l'historique :", error);
        listDiv.innerHTML = "<p style='color:red;'>Erreur lors du chargement de vos builds.</p>";
    }
}

// Charge un build existant dans l'éditeur pour le modifier
window.editerBuild = (buildId) => {
    const buildData = window.buildsSauvegardes[buildId];
    if (!buildData) return;

    currentBuildId = buildId;
    
    // On effectue une copie profonde pour ne pas altérer les données en cache
    currentManualBuild = JSON.parse(JSON.stringify(buildData));
    
    // Conversion du format Firestore (par slot EN) au format de l'éditeur (equipement: { SlotFR: ... })
    const dictEquipement = {
        "Helm": "Casque", "Chest armor": "Plastron", "Gloves": "Gants", "Pants": "Jambières", "Boots": "Bottes",
        "Amulet": "Amulette", "Ring 1": "Anneau 1", "Ring 2": "Anneau 2",
        "Bludgeoning weapon": "Arme contondante", "Slashing weapon": "Arme tranchante", 
        "Dual wield weapon 1": "Arme à une main 1", "Dual wield weapon 2": "Arme à une main 2"
    };

    for (const nomVar in currentManualBuild.variantes) {
        const varianteData = currentManualBuild.variantes[nomVar];
        const equipementReconstruit = {};
        
        if (!varianteData.aspectsPool) varianteData.aspectsPool = [];

        // Initialisation à vide des 12 slots pour correspondre à l'éditeur
        ordreEquipementComplet.forEach(slotFR => {
            let nbGemmes = 0;
            if (["Casque", "Plastron", "Jambières", "Arme tranchante", "Arme contondante"].includes(slotFR)) nbGemmes = 2;
            else if (["Anneau 1", "Anneau 2", "Amulette", "Arme à une main 1", "Arme à une main 2"].includes(slotFR)) nbGemmes = 1;

            equipementReconstruit[slotFR] = {
                aspectEN: "", stats: ["", "", "", ""], trempe: "", gemmes: Array(nbGemmes).fill("")
            };
        });

        // Remplissage avec les données trouvées dans Firestore
        for (const [keyEN, slotFR] of Object.entries(dictEquipement)) {
            if (varianteData[keyEN]) {
                const data = varianteData[keyEN];
                const statsPadded = [...data.stats, "", "", "", ""].slice(0, 4); // S'assure d'avoir 4 cases
                
                equipementReconstruit[slotFR] = {
                    aspectEN: (data.nomEN === "Vide (Aucun aspect assigné)" || !data.nomEN) ? "" : data.nomEN,
                    stats: statsPadded,
                    trempe: data.trempe || "",
                    gemmes: data.gemmes || equipementReconstruit[slotFR].gemmes
                };
                delete varianteData[keyEN];
            }
        }
        
        varianteData.equipement = equipementReconstruit;
    }

    document.getElementById('displayBuildName').textContent = currentManualBuild.nom;
    document.getElementById('buildEditor').style.display = 'block';
    document.getElementById('result').innerHTML = ''; 
    
    const premieresVariantes = Object.keys(currentManualBuild.variantes);
    if (premieresVariantes.length > 0) {
        window.selectionnerVariante(premieresVariantes[0]);
    } else {
        actualiserTagsVariantes();
    }
    
    window.scrollTo({ top: document.getElementById('buildEditor').offsetTop, behavior: 'smooth' });
};

// Charge un build historique ainsi que sa progression in-game autonome depuis Firebase
window.chargerBuildSurPage = async (buildId) => {
    const buildData = window.buildsSauvegardes[buildId];
    if (!buildData) return;

    window.activeBuildId = buildId;
    window.activeBuildData = buildData;
    window.currentTrackingData = {};

    // Chargement de l'état de progression indépendant (cases cochées et aspects placés)
    try {
        const docRef = doc(db, "builds_tracking", buildId);
        const docSnap = await getDoc(docRef);
        window.currentTrackingData = docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
        console.error("Erreur au chargement de la progression :", error);
    }

    const ordreVariantes = ["Legendary", "Uniques", "Mythic", "Selig Overpower", "Pit/Tower ONLY"];
    
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
        <h2>${buildData.nom} (Suivi en Direct)</h2>
        <div class="variant-tags">${tagsHTML}</div>
        <div id="tracking-aspects-pool"></div>
        <div class="gear-list" id="gear-display"></div>
    `;

    window.afficherVarianteGénérique(window.activeBuildData, premiereVariante);
};

// Rendu interactif de suivi : synchronise le codex global et permet le placement libre des aspects
window.afficherVarianteGénérique = (buildData, varianteNom) => {
    window.activeTrackingVariant = varianteNom;
    const varianteInfo = buildData.variantes[varianteNom];
    if (!varianteInfo) return;

    // Initialisation du modèle de données de suivi local pour cette variante
    if (!window.currentTrackingData[varianteNom]) {
        window.currentTrackingData[varianteNom] = { equipement: {} };
    }
    const trackingVariante = window.currentTrackingData[varianteNom];

    const ordreEquipement = {
        "Helm": "Casque", "Chest armor": "Plastron", "Gloves": "Gants", "Pants": "Jambières", "Boots": "Bottes",
        "Amulet": "Amulette", "Ring 1": "Anneau 1", "Ring 2": "Anneau 2",
        "Bludgeoning weapon": "Arme contondante", "Slashing weapon": "Arme tranchante",
        "Dual wield weapon 1": "Arme à une main 1", "Dual wield weapon 2": "Arme à une main 2"
    };

    // Rendu de la réserve d'aspects globale (Phase 1 adaptée au suivi)
    const pool = varianteInfo.aspectsPool || [];
    let poolHTML = `
        <div style="background: #1a1a1a; padding: 15px; border-radius: 6px; margin-bottom: 25px; border: 1px solid #333;">
            <h3 style="color: #ffcc00; margin-top: 0; font-size: 1.05em;">Aspects requis pour la variante ${varianteNom} :</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
    `;

    if (pool.length === 0) {
        poolHTML += `<p style="color: #777; font-style: italic; font-size: 0.85em; grid-column: span 12;">Aucun aspect enregistré dans la réserve de ce build.</p>`;
    } else {
        pool.forEach((item) => {
            const infoAspect = aspectsDict[item.key];
            if (infoAspect) {
                const suiviGlobal = window.userAspects[item.key] || { obtenu: false };
                poolHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; background: #222; padding: 8px; border-radius: 4px; border-left: 3px solid ${suiviGlobal.obtenu ? '#4CAF50' : '#8b0000'}; font-size: 0.8em;">
                        <div style="flex: 1; margin-right: 10px;">
                            <strong style="color: #fff;">${infoAspect.nomFR}</strong>
                            <div style="color: #aaa; font-size: 0.85em; margin-top: 2px; line-height: 1.25;">${infoAspect.description || ''}</div>
                        </div>
                        <label style="color: #4CAF50; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                            <input type="checkbox" ${suiviGlobal.obtenu ? 'checked' : ''} 
                                onchange="window.majAspectUtilisateur('${item.key}', 'obtenu', this.checked); window.afficherVarianteGénérique(window.activeBuildData, '${varianteNom}');"> OK
                        </label>
                    </div>`;
            }
        });
    }
    poolHTML += `</div></div>`;
    document.getElementById('tracking-aspects-pool').innerHTML = poolHTML;

    // Rendu modulaire des pièces d'équipement (Champs verrouillés + Checkboxes)
    let gearHTML = '';

    for (const [slotEN, slotFR] of Object.entries(ordreEquipement)) {
        const item = varianteInfo[slotEN] || { nomEN: "", stats: [], trempe: "", gemmes: [] };
        
        // Structure de suivi par défaut si absente du document Firestore de tracking
        if (!trackingVariante.equipement[slotEN]) {
            trackingVariante.equipement[slotEN] = {
                aspectAssigné: "",
                statsObtenues: Array(item.stats.length).fill(false),
                trempeObtenue: false,
                gemmesObtenues: Array(item.gemmes ? item.gemmes.length : 0).fill(false)
            };
        }
        const trackSlot = trackingVariante.equipement[slotEN];

        // Remplissage du menu déroulant local avec uniquement les aspects possédés ou déjà assignés
        let optionsAspects = `<option value="">-- Assigner un aspect de la réserve --</option>`;
        pool.forEach(p => {
            const suiviGlobal = window.userAspects[p.key] || { obtenu: false };
            
            // Filtre : On n'affiche l'aspect que si tu l'as "OK" (obtenu) OU s'il est déjà assigné sur cette pièce
            if (suiviGlobal.obtenu || trackSlot.aspectAssigné === p.key) {
                const info = aspectsDict[p.key];
                if (info) {
                    optionsAspects += `<option value="${p.key}" ${trackSlot.aspectAssigné === p.key ? 'selected' : ''}>${info.nomFR}</option>`;
                }
            }
        });

        // Affichage de la description dynamique si un aspect est sélectionné sur cette pièce de stuff
        const infoAspectAssigné = aspectsDict[trackSlot.aspectAssigné];
        let blocAspectHTML = '';
        if (infoAspectAssigné) {
            let descFormattee = infoAspectAssigné.description
                .replace(/\[([^\]]+)\]%\[x\]/g, '<span style="color: #ff8800; font-weight: bold; white-space: nowrap;">[$1]%[x]</span>')
                .replace(/\[([^\]]+)\]%\[\+\]/g, '<span style="color: #4da6ff; font-weight: bold; white-space: nowrap;">[$1]%[+]</span>')
                .replace(/\[([^\]]+)\]/g, '<span style="color: #ffcc00; font-weight: bold; white-space: nowrap;">[$1]</span>');

            blocAspectHTML = `
                <div style="margin-top: 10px; background: #151515; padding: 8px; border-radius: 4px; border: 1px solid #252525;">
                    <p style="margin: 0; font-size: 0.85em; color: #eee; line-height: 1.4;">${descFormattee}</p>
                </div>`;
        }

        // Section Statistiques cibles fixes + Checkbox d'obtention
        let statsHTML = '';
        if (item.stats && item.stats.length > 0) {
            statsHTML += `<div style="margin-top: 12px; border-top: 1px dashed #333; padding-top: 8px;">
                <span style="font-size: 0.75em; text-transform: uppercase; color: #ffcc00; font-weight: bold;">Stats cibles :</span>
                <ul style="margin: 4px 0 0 0; padding-left: 0; list-style: none; font-size: 0.85em;">`;
            
            item.stats.forEach((stat, i) => {
                const coche = trackSlot.statsObtenues[i] || false;
                statsHTML += `
                    <li style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; color: ${coche ? '#4CAF50' : '#ccc'};">
                        <span style="${coche ? 'text-decoration: line-through; color: #777;' : ''}">• ${stat}</span>
                        <label style="cursor: pointer; font-size: 0.85em; display: flex; align-items: center; gap: 4px; user-select: none;">
                            <input type="checkbox" ${coche ? 'checked' : ''} onchange="window.majTrackingProgression('${slotEN}', 'statsObtenues', ${i}, this.checked)"> OK
                        </label>
                    </li>`;
            });
            statsHTML += `</ul></div>`;
        }

        // Section Trempe fixe + Checkbox
        let trempeHTML = '';
        if (item.trempe) {
            const cocheTrempe = trackSlot.trempeObtenue || false;
            trempeHTML += `
                <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 0.85em; color: ${cocheTrempe ? '#4CAF50' : '#ccc'};">
                    <span style="${cocheTrempe ? 'text-decoration: line-through; color: #777;' : ''}"><strong style="color: #a04040;">Trempe :</strong> ${item.trempe}</span>
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 4px; user-select: none;">
                        <input type="checkbox" ${cocheTrempe ? 'checked' : ''} onchange="window.majTrackingProgression('${slotEN}', 'trempeObtenue', null, this.checked)"> OK
                    </label>
                </div>`;
        }

        // Section Gemmes fixes + Checkbox
        let gemmesHTML = '';
        if (item.gemmes && item.gemmes.length > 0) {
            gemmesHTML += `<div style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px; font-size: 0.85em;">`;
            item.gemmes.forEach((gemme, idx) => {
                if (gemme.trim() !== "") {
                    const cocheGemme = trackSlot.gemmesObtenues[idx] || false;
                    gemmesHTML += `
                        <div style="display: flex; align-items: center; justify-content: space-between; color: ${cocheGemme ? '#4CAF50' : '#ccc'};">
                            <span style="${cocheGemme ? 'text-decoration: line-through; color: #777;' : ''}"><strong style="color: #2e7d32;">Gemme ${idx+1} :</strong> ${gemme}</span>
                            <label style="cursor: pointer; display: flex; align-items: center; gap: 4px; user-select: none;">
                                <input type="checkbox" ${cocheGemme ? 'checked' : ''} onchange="window.majTrackingProgression('${slotEN}', 'gemmesObtenues', ${idx}, this.checked)"> OK
                            </label>
                        </div>`;
                }
            });
            gemmesHTML += `</div>`;
        }

        // Indicateur d'achèvement (Calcul du pourcentage global de l'objet)
        let totalElements = (item.stats ? item.stats.length : 0) + (item.trempe ? 1 : 0) + (item.gemmes ? item.gemmes.filter(g => g.trim() !== "").length : 0);
        let elementsObtenus = 0;
        if (item.stats) trackSlot.statsObtenues.forEach(b => { if(b) elementsObtenus++; });
        if (item.trempe && trackSlot.trempeObtenue) elementsObtenus++;
        if (item.gemmes) trackSlot.gemmesObtenues.forEach(b => { if(b) elementsObtenus++; });
        
        let pcent = totalElements > 0 ? Math.round((elementsObtenus / totalElements) * 100) : 100;
        let borderSlotColor = pcent === 100 ? '#4CAF50' : (pcent > 0 ? '#ffcc00' : '#444');

        gearHTML += `
            <div class="gear-item" style="border-left: 4px solid ${borderSlotColor}; background: #111; padding: 15px; border-radius: 6px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: #ffcc00; font-size: 1.05em;">${slotFR}</strong>
                        <span style="font-size: 0.8em; font-weight: bold; color: ${borderSlotColor};">${pcent}%</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <select onchange="window.majTrackingAspect('${slotEN}', this.value)" style="width: 100%; padding: 6px; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; font-size: 0.85em;">
                            ${optionsAspects}
                        </select>
                    </div>
                    ${blocAspectHTML}
                    ${statsHTML}
                    ${trempeHTML}
                    ${gemmesHTML}
                </div>
            </div>`;
    }

    document.getElementById('gear-display').innerHTML = gearHTML;
};

// Enregistre l'assignation en direct de l'aspect sur la pièce d'équipement du joueur
window.majTrackingAspect = async (slotEN, aspectKey) => {
    if (!window.activeBuildId || !window.activeTrackingVariant || !currentUser) return;
    
    // Injection de l'ID utilisateur pour valider les règles de sécurité Firebase
    window.currentTrackingData.userId = currentUser.uid;
    
    window.currentTrackingData[window.activeTrackingVariant].equipement[slotEN].aspectAssigné = aspectKey;
    window.afficherVarianteGénérique(window.activeBuildData, window.activeTrackingVariant);

    try {
        await setDoc(doc(db, "builds_tracking", window.activeBuildId), window.currentTrackingData);
    } catch (error) {
        console.error("Erreur de sauvegarde de l'aspect en tracking :", error);
    }
};

window.majTrackingProgression = async (slotEN, type, index, coche) => {
    if (!window.activeBuildId || !window.activeTrackingVariant || !currentUser) return;
    
    // Injection de l'ID utilisateur pour valider les règles de sécurité Firebase
    window.currentTrackingData.userId = currentUser.uid;
    
    const trackSlot = window.currentTrackingData[window.activeTrackingVariant].equipement[slotEN];
    
    if (index !== null) {
        trackSlot[type][index] = coche;
    } else {
        trackSlot[type] = coche;
    }

    window.afficherVarianteGénérique(window.activeBuildData, window.activeTrackingVariant);

    try {
        await setDoc(doc(db, "builds_tracking", window.activeBuildId), window.currentTrackingData);
    } catch (error) {
        console.error("Erreur de sauvegarde du suivi de progression :", error);
    }
};

// Initialisation des variables pour l'éditeur manuel
let currentManualBuild = null;
let activeVariant = null;
let slotCiblePourAspect = null;
let currentBuildId = null; // NOUVEAU: Stocke l'ID du build en cours d'édition

// Création d'un nouveau build
document.getElementById('createBuildBtn').addEventListener('click', () => {
    const nom = document.getElementById('newBuildName').value;
    if (!nom) return alert("Veuillez entrer un nom pour le build.");
    
    currentBuildId = null; // On réinitialise l'ID car c'est une nouvelle création
    currentManualBuild = { nom: nom, variantes: {} };
    document.getElementById('displayBuildName').textContent = nom;
    document.getElementById('buildEditor').style.display = 'block';
    actualiserTagsVariantes();
});

const ordreEquipementComplet = [
    "Casque", "Plastron", "Gants", "Jambières", "Bottes", 
    "Amulette", "Anneau 1", "Anneau 2", 
    "Arme contondante", "Arme tranchante", "Arme à une main 1", "Arme à une main 2"
];

// Initialisation d'une variante avec son pool d'aspects et ses slots vides
// Gestion de l'ajout d'une variante avec les règles de gemmes et de trempe configurées
document.getElementById('addVariantBtn').addEventListener('click', () => {
    const nomVar = document.getElementById('newVariantName').value;
    if (!nomVar || !currentManualBuild) return;
    
    if (!currentManualBuild.variantes[nomVar]) {
        currentManualBuild.variantes[nomVar] = {
            aspectsPool: [],
            equipement: {}
        };
        
        ordreEquipementComplet.forEach(slot => {
            // Attribution dynamique du nombre d'emplacements de gemmes autorisés
            let nbGemmes = 0;
            if (["Casque", "Plastron", "Jambières", "Arme tranchante", "Arme contondante"].includes(slot)) {
                nbGemmes = 2;
            } else if (["Anneau 1", "Anneau 2", "Amulette", "Arme à une main 1", "Arme à une main 2"].includes(slot)) {
                nbGemmes = 1;
            }

            currentManualBuild.variantes[nomVar].equipement[slot] = {
                aspectEN: "",
                stats: ["", "", "", ""],
                trempe: "", // Une seule trempe par équipement
                gemmes: Array(nbGemmes).fill("") // Tableau dimensionné selon les règles du slot
            };
        });
    }
    
    document.getElementById('newVariantName').value = '';
    window.selectionnerVariante(nomVar);
});

// Mise à jour de l'affichage des onglets de variantes
function actualiserTagsVariantes() {
    const tagsDiv = document.getElementById('variantEditorTags');
    tagsDiv.innerHTML = Object.keys(currentManualBuild.variantes).map(v => 
        `<span class="tag" style="cursor:pointer; ${v === activeVariant ? 'border: 1px solid white; background-color: var(--d4-red);' : ''}" onclick="window.selectionnerVariante('${v}')">${v}</span>`
    ).join('');
}

window.selectionnerVariante = (nomVar) => {
    activeVariant = nomVar;
    actualiserTagsVariantes();
    afficherEditeurVariante();
};

// Moteur de rendu de l'éditeur d'équipement
function afficherEditeurVariante() {
    if (!activeVariant) {
        document.getElementById('variantContent').style.display = 'none';
        return;
    }
    document.getElementById('variantContent').style.display = 'block';
    
    const varianteActuelle = currentManualBuild.variantes[activeVariant];
    const slots = varianteActuelle.equipement;
    
    let aspectContainer = document.getElementById('aspectsPoolContainer');
    if (!aspectContainer) {
        aspectContainer = document.createElement('div');
        aspectContainer.id = 'aspectsPoolContainer';
        const gearSlotEditor = document.getElementById('gearSlotEditor');
        gearSlotEditor.parentNode.insertBefore(aspectContainer, gearSlotEditor);
    }
    
    let htmlAspects = '';
    htmlAspects += `<div style="background: #1a1a1a; padding: 15px; border-radius: 6px; margin-bottom: 25px; border: 1px solid #333;">
                <h3 style="color: #ffcc00; margin-top: 0; font-size: 1.05em;">Aspects requis pour cette variante :</h3>`;
    
    if (varianteActuelle.aspectsPool.length === 0) {
        htmlAspects += `<p style="color: #777; font-style: italic; font-size: 0.85em;">Aucun aspect ajouté. Utilisez la barre de recherche ci-dessus.</p>`;
    } else {
        htmlAspects += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">`;
        varianteActuelle.aspectsPool.forEach((item, index) => {
            const infoAspect = aspectsDict[item.key];
            if (infoAspect) {
                htmlAspects += `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; background: #222; padding: 8px; border-radius: 4px; border-left: 3px solid var(--d4-red); font-size: 0.8em;">
                        <div style="flex: 1; margin-right: 10px;">
                            <strong style="color: #fff; font-size: 0.9em;">${infoAspect.nomFR}</strong> 
                            <div style="color: #aaa; font-size: 0.85em; margin-top: 2px; line-height: 1.25;">${infoAspect.description || 'Pas de description'}</div>
                        </div>
                        <label style="color: #4CAF50; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                            <input type="checkbox" ${item.possede ? 'checked' : ''} onchange="window.basculerPossessionAspect(${index})"> OK
                        </label>
                    </div>`;
            }
        });
        htmlAspects += `</div>`;
    }
    htmlAspects += `</div>`;
    
    aspectContainer.innerHTML = htmlAspects;
    
    let htmlGear = '';
    ordreEquipementComplet.forEach(slot => {
        // Définition des variables requises pour lire les données et générer les ID
        const data = slots[slot];
        const slotId = slot.replace(/\s+/g, '-');

        // Génération de 4 listes d'autocomplétion filtrées (une par champ de statistique)
        let datalistsHtml = '';
        for (let i = 0; i < 4; i++) {
            datalistsHtml += `<datalist id="stats-list-${slotId}-${i}">`;
            if (statsDict[slot]) {
                Object.entries(statsDict[slot]).forEach(([cleEN, infoStat]) => {
                    // On vérifie si cette statistique est déjà sélectionnée dans un autre champ de cet objet
                    const estDejaSelectionnee = data.stats.some((autreStat, indexAutre) => {
                        if (indexAutre === i || !autreStat) return false;
                        return autreStat.includes(infoStat.nomFR);
                    });
                    
                    if (!estDejaSelectionnee) {
                        // Utilise uniquement nomFR puisque la plage y est déjà intégrée
                        datalistsHtml += `<option value="${infoStat.nomFR}">`;
                    }
                });
            }
            datalistsHtml += `</datalist>`;
        }
        
        // --- NOUVEAU : Génération de la liste d'autocomplétion pour la trempe (Bilingue) ---
        const mapTemperSlots = {
            "Casque": "Helms", "Plastron": "Chest Armor", "Gants": "Gloves", 
            "Jambières": "Pants", "Bottes": "Boots", "Amulette": "Amulets", 
            "Anneau 1": "Rings", "Anneau 2": "Rings",
            "Arme contondante": "Weapons", "Arme tranchante": "Weapons", 
            "Arme à une main 1": "Weapons", "Arme à une main 2": "Weapons"
        };
        const mappedTemperSlot = mapTemperSlots[slot];
        
        let temperDatalistHtml = `<datalist id="temper-list-${slotId}">`;
        Object.entries(tempersDict).forEach(([nomRecette, infos]) => {
            if (infos.slots && infos.slots.includes(mappedTemperSlot)) {
                infos.affixes.forEach(affixe => {
                    // La 'value' est le français qui s'affiche, le contenu texte est l'anglais pour la recherche
                    temperDatalistHtml += `<option value="${affixe.fr} [${nomRecette}]">${affixe.en}</option>`;
                });
            }
        });
        temperDatalistHtml += `</datalist>`;
        // -------------------------------------------------------------------------

        let optionsAspects = `<option value="">-- Assigner un aspect de la réserve --</option>`;
        
        varianteActuelle.aspectsPool.forEach(item => {
            if (item.possede) {
                const info = aspectsDict[item.key];
                if (info) {
                    optionsAspects += `<option value="${item.key}" ${data.aspectEN === item.key ? 'selected' : ''}>${info.nomFR}</option>`;
                }
            }
        });

        let gemmesHtml = '';
        if (data.gemmes && data.gemmes.length > 0) {
            gemmesHtml += `<div style="grid-column: span 2; display: grid; grid-template-columns: repeat(${data.gemmes.length}, 1fr); gap: 8px;">`;
            data.gemmes.forEach((g, idx) => {
                gemmesHtml += `<input type="text" placeholder="Gemme ${idx + 1}" value="${g}" onchange="window.majGemme('${slot}', ${idx}, this.value)" style="padding: 8px; font-size: 0.85em; background: #222; border: 1px solid #2e7d32; color: white; border-radius: 4px;">`;
            });
            gemmesHtml += `</div>`;
        }

        htmlGear += `
            ${datalistsHtml}
            ${temperDatalistHtml}
            <div class="gear-item" style="border-left: 4px solid #444; margin-bottom: 15px; background: #111; padding: 15px; border-radius: 6px;">
                <div style="margin-bottom: 10px;"><strong style="color: #ffcc00; font-size: 1.05em;">${slot}</strong></div>
                <div style="margin-bottom: 12px;">
                    <select onchange="window.majAspectSlot('${slot}', this.value)" style="width: 100%; padding: 8px; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px;">${optionsAspects}</select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div style="grid-column: span 2;"><span style="color: #aaa; font-size: 0.8em;">Statistiques cibles :</span></div>
                    ${data.stats.map((s, i) => `<input type="text" list="stats-list-${slotId}-${i}" placeholder="Statistique ${i+1}" value="${s}" onchange="window.majChamp('${slot}', 'stats', ${i}, this.value)" style="padding: 8px; font-size: 0.85em; background: #222; border: 1px solid #444; color: white; border-radius: 4px;">`).join('')}
                </div>
                <div style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div style="grid-column: span 2;"><span style="color: #aaa; font-size: 0.8em;">Trempe & Gemmes :</span></div>
                    <input type="text" list="temper-list-${slotId}" placeholder="Trempe unique (Recherche automatique)" value="${data.trempe || ''}" onchange="window.majChamp('${slot}', 'trempe', null, this.value)" style="padding: 8px; font-size: 0.85em; background: #222; border: 1px solid #500; color: white; border-radius: 4px; grid-column: span 2;">
                    ${gemmesHtml}
                </div>
            </div>`;
    });
    
    document.getElementById('gearSlotEditor').innerHTML = htmlGear;
}

// Met à jour la valeur d'un emplacement spécifique de gemme
window.majGemme = (slot, index, valeur) => {
    if (!activeVariant) return;
    currentManualBuild.variantes[activeVariant].equipement[slot].gemmes[index] = valeur;
};

// Assigne ou désasigne l'aspect choisi au slot d'équipement
window.majAspectSlot = (slot, aspectKey) => {
    if (!activeVariant) return;
    currentManualBuild.variantes[activeVariant].equipement[slot].aspectEN = aspectKey;
};

// Gestion de la cible pour l'aspect
window.definirSlotCible = (slot) => {
    slotCiblePourAspect = slot;
    const searchInput = document.getElementById('aspectSearch');
    searchInput.placeholder = `Rechercher un aspect pour : ${slot}...`;
    searchInput.style.borderColor = "#ffcc00";
    searchInput.focus();
    window.scrollTo({ top: document.getElementById('variantContent').offsetTop, behavior: 'smooth' });
};

// Système de recherche d'aspects en direct
document.getElementById('aspectSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('aspectSearchResults');
    
    if (query.length < 2) {
        resultsDiv.innerHTML = '';
        return;
    }
    
    const resultats = Object.entries(aspectsDict).filter(([key, val]) => 
        val.nomFR.toLowerCase().includes(query) || key.toLowerCase().includes(query)
    ).slice(0, 15);
    
    resultsDiv.innerHTML = resultats.map(([key, val]) => {
        // Sécurisation de la clé d'aspect pour éviter les erreurs de syntaxe JS avec les apostrophes
        const safeKey = key.replace(/'/g, "\\'");
        return `
        <div style="padding: 10px; border-bottom: 1px solid #444; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'" onclick="window.assignerAspect('${safeKey}')">
            <strong style="color: #8b0000;">${val.nomFR}</strong> <small style="color: #888;">(${key})</small>
        </div>
        `;
    }).join('');
});

// Ajoute l'aspect sélectionné à la liste globale en haut du build
window.assignerAspect = (aspectKey) => {
    if (!activeVariant) return;
    
    const varianteActuelle = currentManualBuild.variantes[activeVariant];
    
    // Évite les doublons dans la liste globale
    const existeDeja = varianteActuelle.aspectsPool.some(a => a.key === aspectKey);
    if (!existeDeja) {
        varianteActuelle.aspectsPool.push({
            key: aspectKey,
            possede: false
        });
    }
    
    // Réinitialisation du champ de recherche d'aspects
    const searchInput = document.getElementById('aspectSearch');
    searchInput.value = '';
    document.getElementById('aspectSearchResults').innerHTML = '';
    
    afficherEditeurVariante();
};

// Bascule l'état coché / décoché d'un aspect de la réserve
// Gère l'état de possession et purge l'aspect des équipements si décoché, puis rafraîchit l'interface
window.basculerPossessionAspect = (index) => {
    if (!activeVariant) return;
    const varianteActuelle = currentManualBuild.variantes[activeVariant];
    const aspect = varianteActuelle.aspectsPool[index];
    
    if (aspect) {
        aspect.possede = !aspect.possede;
        
        // Sécurité : si l'aspect n'est plus possédé, on le retire des slots où il était assigné
        if (!aspect.possede) {
            for (const slot in varianteActuelle.equipement) {
                if (varianteActuelle.equipement[slot].aspectEN === aspect.key) {
                    varianteActuelle.equipement[slot].aspectEN = "";
                }
            }
        }
        
        // Rafraîchissement de la vue pour mettre à jour les listes déroulantes
        afficherEditeurVariante();
    }
};
// Met à jour les valeurs des stats, trempes ou gemmes et rafraîchit l'éditeur pour actualiser les filtres
window.majChamp = (slot, type, index, valeur) => {
    if (!activeVariant) return;
    
    const cible = currentManualBuild.variantes[activeVariant].equipement[slot];
    
    if (index !== null) {
        cible[type][index] = valeur;
    } else {
        cible[type] = valeur;
    }
    
    // Relance le rendu pour masquer immédiatement la statistique choisie des autres champs
    if (type === 'stats') {
        afficherEditeurVariante();
    }
};

// Sauvegarde du build manuel dans Firebase - Enregistre toujours les 12 emplacements et la réserve
document.getElementById('saveBuildBtn').addEventListener('click', async () => {
    if (!currentUser) {
        alert("Tu dois être connecté pour sauvegarder un build.");
        return;
    }

    const buildAExporter = {
        nom: currentManualBuild.nom,
        userId: currentUser.uid,
        variantes: {}
    };

    const dictInversé = {
        "Casque": "Helm", "Plastron": "Chest armor", "Gants": "Gloves", "Jambières": "Pants", "Bottes": "Boots",
        "Amulette": "Amulet", "Anneau 1": "Ring 1", "Anneau 2": "Ring 2",
        "Arme contondante": "Bludgeoning weapon", "Arme tranchante": "Slashing weapon", 
        "Arme à une main 1": "Dual wield weapon 1", "Arme à une main 2": "Dual wield weapon 2"
    };

    for (const [nomVar, varianteInfo] of Object.entries(currentManualBuild.variantes)) {
        buildAExporter.variantes[nomVar] = {};
        
        // Sauvegarde de la réserve d'aspects globale de la variante
        buildAExporter.variantes[nomVar].aspectsPool = varianteInfo.aspectsPool || [];

        for (const [slotFR, data] of Object.entries(varianteInfo.equipement)) {
            const slotEN = dictInversé[slotFR];
            
            buildAExporter.variantes[nomVar][slotEN] = { 
                nomEN: data.aspectEN || "", 
                stats: data.stats.filter(s => s.trim() !== ""), 
                trempe: data.trempe || "",
                gemmes: data.gemmes || []
            };
        }
    }

    // NOUVELLE LOGIQUE D'ENREGISTREMENT (Création vs Mise à jour)
    try {
        if (currentBuildId) {
            await setDoc(doc(db, "builds_diablo", currentBuildId), buildAExporter);
            alert(`✓ Build "${buildAExporter.nom}" mis à jour avec succès !`);
        } else {
            await addDoc(collection(db, "builds_diablo"), buildAExporter);
            alert(`✓ Build "${buildAExporter.nom}" créé et sauvegardé avec succès !`);
        }
        document.getElementById('buildEditor').style.display = 'none';
        chargerMesBuilds();
    } catch (error) {
        console.error("Erreur de sauvegarde :", error);
        alert("Erreur lors de la sauvegarde.");
    }
});