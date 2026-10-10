# Universo Genesi

Un sandbox che si genera da solo: parte da un Big Bang di idrogeno ed elio e, con sole leggi fisiche locali, produce stelle, supernove, tutti gli elementi chimici, pianeti e forme di vita elementari.

Apri `index.html` in un browser (nessuna installazione, nessun server). La versione principale gira sulla **GPU con WebGPU**: Chrome aggiornato su Android, Windows o Mac, oppure Safari su iOS 26. Senza WebGPU passa da sola a una versione su processore da 3.000 particelle.

## Cosa simula

- **Big Bang**: una sfera di idrogeno ed elio (75/25) e materia oscura, con fluttuazioni di densità e flusso di Hubble.
- **Materia oscura**: metà delle particelle e l'84% della massa, come nell'universo reale. Sente solo la gravità e forma gli aloni in cui il gas cade.
- **Energia oscura**: una costante cosmologica che a grande distanza accelera l'espansione. Si può spegnere: senza, l'universo può ricollassare.
- **Gravità newtoniana esatta** tra tutte le coppie di particelle. Le forze vicine sono ricalcolate a ogni passo, quelle lontane distribuite su più passi.
- **Idrodinamica SPH**: pressione, compressione che scalda, onde d'urto, mescolamento chimico.
- **Raffreddamento radiativo**, più efficace con i metalli. Il gas molto denso diventa opaco.
- **Fusione nucleare** H → He → C → O → metalli → Fe con le energie di legame reali per nucleone.
- **Nascita e morte delle stelle**: il gas oltre una soglia di densità si contrae e si accende; quando un combustibile finisce il nucleo si contrae e accende il successivo.
- **Resti stellari**: le stelle piccole diventano **nane bianche** (con nebulosa planetaria e processo s), le grandi esplodono come **supernove** lasciando **stelle di neutroni** o **buchi neri**.
- **Supernove Ia** dalle nane bianche (ferro) e **kilonove** dalle stelle di neutroni (oro, platino, uranio).
- **Buchi neri** che inghiottono il gas entro il raggio di Bondi, si fondono tra loro e, nei momenti di massima crescita, scaldano la regione come i quasar.
- **Tutti i 118 elementi**. Dieci canali di nucleosintesi sono seguiti per ogni particella: idrogeno, elio, carbonio, azoto, ossigeno, gruppo alfa, picco del ferro, processo s, processo r e spallazione da raggi cosmici. Le abbondanze dei singoli elementi si ottengono ripartendo ogni canale secondo le proporzioni misurate nel Sistema Solare. Gli elementi radioattivi a vita breve compaiono come tracce, quelli artificiali (Z ≥ 95) come assenti in natura.
- **Pianeti**: polveri fredde illuminate da stelle vicine, con temperatura di equilibrio T ∝ (L/d²)^¼. La zona abitabile è tra 273 e 373 K.
- **Vita** (la parte ipotetica del modello): nasce raramente su pianeti abitabili con acqua e molecole organiche, cresce, si diffonde con mutazioni e muore se la stella esplode.

## Come si usa

- **Seme**: ogni universo nasce da un numero. Stesso seme, stesso Big Bang. Il link con `#s` seguito dal numero (per esempio `index.html#s4242`) apre sempre quell'universo.
- **Tocca una galassia** per selezionarla: la camera ci vola e una scheda mostra stelle, pianeti, buchi neri e resti stellari. *Prossima galassia ›* passa alla successiva.
- **Tocca una stella** per selezionare il suo sistema, poi *Entra* per vedere le orbite. Tocca un **pianeta** per vederlo da vicino.
- **Vista interna** (*Dentro*): nel nucleo di una stella vedi la catena protone-protone, il ciclo CNO, la tripla alfa e le fusioni successive fino al ferro; in una nube fredda o su un pianeta vedi nascere H₂, acqua, metano, ammoniaca e aminoacidi, e le cellule se c'è vita. Le reazioni sono accelerate, ma quali avvengono dipende da temperatura e composizione della particella simulata.
- Trascina per ruotare, rotella o pizzico per lo zoom, Shift+trascina o due dita per spostarti.
- La **tavola periodica** sotto la vista mostra la composizione dell'universo intero, dell'oggetto selezionato o del Sole.
- Il menu *Particelle* va da 8.192 a 262.144. All'avvio la pagina misura la GPU e sceglie il numero più alto sostenibile.

## Limiti

La relatività generale non è simulata: la gravità dei buchi neri è newtoniana e l'orizzonte è solo disegnato. Il seme fissa le condizioni iniziali: la stessa GPU riproduce lo stesso universo, ma l'evoluzione è caotica e su dispositivi diversi può divergere col tempo. Le leggi sono reali, le scale no: tempi e distanze sono compressi di molti ordini di grandezza e una particella rappresenta una massa enorme di gas. Le orbite nella vista del sistema sono ricostruite, non simulate punto per punto. L'origine della vita è una regola scelta, non derivata da leggi fisiche. Le abbondanze del Sistema Solare usate come riferimento vengono dalla tabella Kaye & Laby (atomi per Si = 1). Le quote s/r degli elementi pesanti sono approssimate.

## Struttura

| Percorso | Contenuto |
|---|---|
| `index.html` | Versione 7 (esplorabile, vista interna), file unico pronto all'uso |
| `versioni/` | Tutte le versioni come file unici: v1 atomi, v2 nubi di gas, v3 universo sferico, v4 GPU, v5 materia oscura e buchi neri, v6 esplorabile con seme, v7 vista interna |
| `src/v7/` | Sorgenti della v7 (vista interna, camera fluida, buchi neri con profondità): `engine3.js`, `page8.html`, `build8.py` |
| `src/v6/` | Sorgenti della v6: `engine3.js`, `page7.html`, `build7.py` |
| `src/v5/` | Sorgenti della v5: `engine2.js` (motore con tipi di particella), `page6.html`, `build6.py` |
| `src/v4/` | Sorgenti della v4: `engine.js` (shader WebGPU e motore), `elements.js` (tavola degli elementi), `core4.js` (ripiego su CPU), `page5.html` (interfaccia), `build5.py` (genera `index.html`) |
| `src/v1`–`src/v3` | Sorgenti delle versioni precedenti |
| `test/` | Prove automatiche con Playwright e Chromium (GPU software SwiftShader) |

Per rigenerare `index.html` dopo una modifica: `cd src/v7 && python3 build8.py`.

Per le prove: `npm i playwright`, poi `node test/runh.js 2000 2000 400` (fisica su GPU) oppure `node test/systest.js cpu 30000` (interfaccia e vista del sistema).
