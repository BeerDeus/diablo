// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

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
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle2' });

        const buildData = await page.evaluate(() => {
            const donnees = {
                nom: document.querySelector('h1')?.innerText || "Build Inconnu",
                variantes: { "Actuelle": {} } 
            };

            // On récupère tous les span qui possèdent un attribut "title"
            const spans = document.querySelectorAll('span[title]');
            
            spans.forEach(span => {
                // On remonte au parent direct (la div qui englobe le slot et l'aspect)
                const parent = span.parentElement;
                
                // On vérifie si ce parent contient bien nos deux spans cibles
                const childSpans = parent.querySelectorAll('span[title]');
                
                if (childSpans.length >= 2) {
                    const slotName = childSpans[0].innerText.trim();
                    const itemNameEN = childSpans[1].innerText.trim();
                    
                    // On enregistre dans la variante "Actuelle"
                    donnees.variantes["Actuelle"][slotName] = {
                        nomEN: itemNameEN,
                        nomFR: itemNameEN 
                    };
                }
            });

            // Note pour les onglets de variantes :
            // Ce script récupère l'équipement affiché par défaut au chargement de la page.
            // Pour cliquer sur "Uniques" ou "Mythic", il faudra inspecter ces boutons 
            // spécifiquement pour trouver leurs classes et simuler un click() avant de refaire la boucle.

            return donnees;
        });

        await browser.close();

        for (const variante in buildData.variantes) {
            for (const slot in buildData.variantes[variante]) {
                const itemEN = buildData.variantes[variante][slot].nomEN;
                buildData.variantes[variante][slot].nomFR = traduire(itemEN);
            }
        }

        res.json(buildData);

    } catch (error) {
        console.error("Erreur de Scraping Puppeteer :", error);
        res.status(500).json({ error: "Erreur lors de la lecture dynamique du site" });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Serveur de Scraping démarré sur le port ${PORT}`));