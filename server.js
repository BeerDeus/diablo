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
            const donnees = { nom: document.querySelector('h1')?.innerText || "Build Inconnu", variantes: {} };
            const variantNoms = ["Legendary", "Uniques", "Mythic", "Selig Overpower", "Pit/Tower ONLY"];
            
            const textesOnglets = Array.from(document.querySelectorAll('button, [role="tab"], span, div'))
                .filter(el => el.innerText && variantNoms.includes(el.innerText.trim()) && el.children.length === 0)
                .map(el => el.innerText.trim());

            const nomsOngletsUnique = [...new Set(textesOnglets)];

            if (nomsOngletsUnique.length === 0) {
                nomsOngletsUnique.push("Actuelle");
            }

            // Référentiel des emplacements pour borner la recherche textuelle
            const slotsMotsCles = ["Helm", "Chest armor", "Gloves", "Pants", "Boots", "Amulet", "Ring 1", "Ring 2", "Bludgeoning weapon", "Slashing weapon", "Dual wield weapon 1", "Dual wield weapon 2"];

            for (const nomVariante of nomsOngletsUnique) {
                donnees.variantes[nomVariante] = {};
                
                if (nomVariante !== "Actuelle") {
                    const ongletVivant = Array.from(document.querySelectorAll('button, [role="tab"], span, div')).find(el => 
                        el.innerText && el.innerText.trim() === nomVariante && el.children.length === 0 && el.offsetWidth > 0
                    );
                    if (ongletVivant) {
                        ongletVivant.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        ongletVivant.click();
                        await wait(1200); 
                    }
                }
                
                document.querySelectorAll('span[title]').forEach(span => {
                    if (span.offsetWidth === 0 || span.offsetHeight === 0) return;

                    const parent = span.parentElement;
                    const childSpans = Array.from(parent.querySelectorAll('span[title]')).filter(s => s.offsetWidth > 0);
                    
                    if (childSpans.length >= 2) {
                        const slotName = childSpans[0].innerText.trim();
                        const itemNameEN = childSpans[1].innerText.trim();

                        // Remonter l'arbre DOM pour isoler le bloc parent exclusif à cet item
                        let card = parent;
                        while (card && card.parentElement) {
                            const parentText = card.parentElement.innerText || "";
                            const contientAutreSlot = slotsMotsCles.some(s => s !== slotName && parentText.includes(s));
                            if (contientAutreSlot) break;
                            card = card.parentElement;
                        }

                        // Collecte uniquement les éléments de texte purs (feuilles) pour éviter les blocs dupliqués
                        let rawLines = [];
                        if (card) {
                            card.querySelectorAll('*').forEach(el => {
                                if (el.children.length === 0 && el.innerText) {
                                    const text = el.innerText.trim();
                                    if (text && text !== slotName && text !== itemNameEN && text.length > 1) {
                                        rawLines.push(text);
                                    }
                                }
                            });
                        }

                        donnees.variantes[nomVariante][slotName] = { 
                            nomEN: itemNameEN,
                            stats: [...new Set(rawLines)].filter(t => t.length > 2 && t.length < 70) // Filtrage des textes valides
                        };
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