// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

// Petit dictionnaire pour traduire automatiquement les items à la volée
const dicoFR = {
    "Wildbolt Aspect": "Aspect de l'Éclair Sauvage",
    "Juggernaut's Aspect": "Aspect du Mastodonte",
    "Gohr's Devastating Grips": "Poignes Dévastatrices de Gohr",
    "Melted Heart of Selig": "Cœur Fondu de Selig"
    // Tu pourras ajouter tes traductions ici
};

function traduire(texteEN) {
    return dicoFR[texteEN] || texteEN; // Retourne en FR si trouvé, sinon garde l'EN
}

// Nouvelle structure de l'API pour englober toutes les variantes et les slots d'équipement
app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;

    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Simulation de l'extraction des données basées sur l'interface de Mobalytics
        const buildData = {
            nom: "Barbare Trombe", 
            variantes: {
                "Legendary": {
                    "Helm": { nomEN: "Wildbolt Aspect", nomFR: traduire("Wildbolt Aspect") },
                    "Chest armor": { nomEN: "Juggernaut's Aspect", nomFR: traduire("Juggernaut's Aspect") },
                    "Gloves": { nomEN: "Steadfast Berserker's Aspect", nomFR: traduire("Steadfast Berserker's Aspect") },
                    "Pants": { nomEN: "Aspect of Coagulation", nomFR: traduire("Aspect of Coagulation") },
                    "Boots": { nomEN: "Battle Fervor's Aspect", nomFR: traduire("Battle Fervor's Aspect") },
                    "Amulet": { nomEN: "Crushing Aspect", nomFR: traduire("Crushing Aspect") },
                    "Ring 1": { nomEN: "Bold Chieftain's Aspect", nomFR: traduire("Bold Chieftain's Aspect") },
                    "Ring 2": { nomEN: "Heavy Hitting Aspect", nomFR: traduire("Heavy Hitting Aspect") },
                    "Bludgeoning weapon": { nomEN: "Aspect of Limitless Rage", nomFR: traduire("Aspect of Limitless Rage") },
                    "Slashing weapon": { nomEN: "Aspect of Channeling", nomFR: traduire("Aspect of Channeling") },
                    "Dual wield weapon 1": { nomEN: "Edgemaster's Aspect", nomFR: traduire("Edgemaster's Aspect") },
                    "Dual wield weapon 2": { nomEN: "Vehement Brawler's Aspect", nomFR: traduire("Vehement Brawler's Aspect") }
                },
                "Uniques": {
                    "Helm": { nomEN: "Harlequin Crest", nomFR: "Cimier Arlequin" },
                    "Gloves": { nomEN: "Gohr's Devastating Grips", nomFR: traduire("Gohr's Devastating Grips") }
                }
            }
        };

        res.json(buildData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la lecture du site" });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Serveur de Scraping démarré sur le port ${PORT}`));