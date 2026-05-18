const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
// Permet à Express de servir directement app.js et les autres fichiers du dossier
app.use(express.static(__dirname));

// Renvoie le fichier index.html lorsque l'on arrive sur la racine du site
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
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
        
        await page.setViewport({ width: 1280, height: 1000 });
        await page.goto(url, { waitUntil: 'networkidle2' });

        const buildData = await page.evaluate(async () => {
            const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            
            const donnees = {
                nom: document.querySelector('h1')?.innerText || "Build Inconnu",
                variantes: {}
            };

            const variantNoms = ["Legendary", "Uniques", "Mythic", "Selig Overpower", "Pit/Tower ONLY"];
            
            // Extraction uniquement des textes des onglets disponibles pour éviter les éléments fantômes
            const textesOnglets = Array.from(document.querySelectorAll('button, [role="tab"], span, div'))
                .filter(el => el.innerText && variantNoms.includes(el.innerText.trim()) && el.children.length === 0)
                .map(el => el.innerText.trim());

            const nomsOngletsUnique = [...new Set(textesOnglets)];

            if (nomsOngletsUnique.length === 0) {
                donnees.variantes["Actuelle"] = {};
                document.querySelectorAll('span[title]').forEach(span => {
                    if (span.offsetWidth === 0 || span.offsetHeight === 0) return;
                    
                    const parent = span.parentElement;
                    const childSpans = parent.querySelectorAll('span[title]');
                    if (childSpans.length >= 2) {
                        donnees.variantes["Actuelle"][childSpans[0].innerText.trim()] = { nomEN: childSpans[1].innerText.trim() };
                    }
                });
                return donnees;
            }

            // On boucle sur les chaînes de texte extraites
            for (const nomVariante of nomsOngletsUnique) {
                donnees.variantes[nomVariante] = {};
                
                // On re-cherche le bouton vivant et visible dans le DOM actuel à chaque itération
                const ongletVivant = Array.from(document.querySelectorAll('button, [role="tab"], span, div')).find(el => 
                    el.innerText && el.innerText.trim() === nomVariante && el.children.length === 0 && el.offsetWidth > 0
                );

                if (ongletVivant) {
                    ongletVivant.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    ongletVivant.click();
                    
                    // Pause pour laisser React rafraîchir complètement la grille d'équipement
                    await wait(1200); 
                    
                    document.querySelectorAll('span[title]').forEach(span => {
                        if (span.offsetWidth === 0 || span.offsetHeight === 0) return;

                        const parent = span.parentElement;
                        const childSpans = Array.from(parent.querySelectorAll('span[title]')).filter(s => s.offsetWidth > 0);
                        
                        if (childSpans.length >= 2) {
                            const slotName = childSpans[0].innerText.trim();
                            const itemNameEN = childSpans[1].innerText.trim();
                            donnees.variantes[nomVariante][slotName] = { nomEN: itemNameEN };
                        }
                    });
                }
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