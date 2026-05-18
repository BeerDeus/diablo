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

app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;

    try {
        // On récupère le code HTML de la page
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Note : Mobalytics est un site très dynamique. Si Cheerio ne trouve pas tout, 
        // il faudra potentiellement utiliser "Puppeteer" (un navigateur sans tête).
        // Mais voici la logique de structuration :

        const buildData = {
            nom: "Barbare Trombe", // On pourrait le scrapper dynamiquement via $('h1').text()
            variantesDisponibles: ["Legendary", "Uniques", "Mythic", "Selig Overpower", "Pit/Tower ONLY"],
            equipement: {
                casque: {
                    nomEN: "Wildbolt Aspect",
                    nomFR: traduire("Wildbolt Aspect"),
                    type: "Legendary"
                },
                torse: {
                    nomEN: "Juggernaut's Aspect",
                    nomFR: traduire("Juggernaut's Aspect"),
                    type: "Legendary"
                },
                gants: {
                    nomEN: "Gohr's Devastating Grips",
                    nomFR: traduire("Gohr's Devastating Grips"),
                    type: "Unique"
                }
                // La logique complète ici consistera à boucler sur les éléments du DOM ($('.item-class')...)
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