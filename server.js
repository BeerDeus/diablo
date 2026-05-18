const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Chargement de la base de données locale
const aspectsDbPath = path.join(__dirname, 'aspects.json');
let aspectsData = {};

if (fs.existsSync(aspectsDbPath)) {
    aspectsData = JSON.parse(fs.readFileSync(aspectsDbPath, 'utf8'));
}

// Envoi de la base de données JSON au site web
app.get('/api/aspects', (req, res) => {
    res.json(aspectsData);
});

app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;

    try {
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        
        // Définition d'une taille de fenêtre fixe pour garantir la visibilité des éléments
        await page.setViewport({ width: 1280, height: 1000 });
        await page.goto(url, { waitUntil: 'networkidle2' });

        const buildData = await page.evaluate(async () => {
            const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            
            const donnees = {
                nom: document.querySelector('h1')?.innerText || "Build Inconnu",
                variantes: {}
            };

            const variantNoms = ["Legendary", "Uniques", "Mythic", "Selig Overpower", "Pit/Tower ONLY"];
            
            // Collecte large des conteneurs de texte pour identifier les boutons d'onglets
            const elements = Array.from(document.querySelectorAll('button, [role="tab"], span, div')).filter(el => 
                el.innerText && variantNoms.includes(el.innerText.trim()) && el.children.length === 0
            );

            const onglets = [...new Set(elements)];

            if (onglets.length === 0) {
                donnees.variantes["Actuelle"] = {};
                document.querySelectorAll('span[title]').forEach(span => {
                    const parent = span.parentElement;
                    const childSpans = parent.querySelectorAll('span[title]');
                    if (childSpans.length >= 2) {
                        donnees.variantes["Actuelle"][childSpans[0].innerText.trim()] = { nomEN: childSpans[1].innerText.trim() };
                    }
                });
                return donnees;
            }

            // Boucle d'action sur chaque variante détectée
            for (const onglet of onglets) {
                const nomVariante = onglet.innerText.trim();
                donnees.variantes[nomVariante] = {};
                
                // Déclenchement d'une séquence de clics natifs pour forcer la mise à jour de l'état React
                onglet.scrollIntoView();
                onglet.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                onglet.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                onglet.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                
                // Temporisation essentielle pour laisser les composants se re-rendre
                await wait(800); 
                
                document.querySelectorAll('span[title]').forEach(span => {
                    const parent = span.parentElement;
                    const childSpans = parent.querySelectorAll('span[title]');
                    if (childSpans.length >= 2) {
                        const slotName = childSpans[0].innerText.trim();
                        const itemNameEN = childSpans[1].innerText.trim();
                        donnees.variantes[nomVariante][slotName] = { nomEN: itemNameEN };
                    }
                });
            }

            return donnees;
        });

        await browser.close();
        res.json(buildData);

    } catch (error) {
        console.error("Erreur de Scraping Puppeteer :", error);
        res.status(500).json({ error: "Erreur lors de la lecture dynamique du site" });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Serveur de Scraping démarré sur le port ${PORT}`));