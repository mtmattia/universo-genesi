# Universo Genesi

Un sandbox che si genera da solo: parte da un Big Bang di idrogeno ed elio e, con sole leggi fisiche locali, produce stelle, supernove, tutti gli elementi chimici, pianeti e forme di vita elementari.

Apri `index.html` in un browser (nessuna installazione, nessun server). La versione principale gira sulla **GPU con WebGPU**: Chrome aggiornato su Android, Windows o Mac, oppure Safari su iOS 26. Senza WebGPU passa da sola a una versione su processore da 3.000 particelle.

## Cosa simula

- **Big Bang**: una sfera di idrogeno ed elio (75/25) con fluttuazioni di densità e flusso di Hubble. È un universo chiuso: si espande, rallenta e può ricollassare.
- **Gravità newtoniana esatta** tra tutte le coppie di particelle. Le forze vicine sono ricalcolate a ogni passo, quelle lontane distribuite su più passi.
- **Idrodinamica SPH**: pressione, compressione che scalda, onde d'urto, mescolamento chimico.
- **Raffreddamento radiativo**, più efficace con i metalli. Il gas molto denso diventa opaco.
- **Fusione nucleare** H → He → C → O → metalli → Fe con le energie di legame reali per nucleone.
- **Supernove** con una resa realistica di ossigeno, elementi alfa e ferro, più il processo r.
- **Tutti i 118 elementi**. Dieci canali di nucleosintesi sono seguiti per ogni particella: idrogeno, elio, carbonio, azoto, ossigeno, gruppo alfa, picco del ferro, processo s, processo r e spallazione da raggi cosmici. Le abbondanze dei singoli elementi si ottengono ripartendo ogni canale secondo le proporzioni misurate nel Sistema Solare. Gli elementi radioattivi a vita breve compaiono come tracce, quelli artificiali (Z ≥ 95) come assenti in natura.
- **Pianeti**: polveri fredde illuminate da stelle vicine, con temperatura di equilibrio T ∝ (L/d²)^¼. La zona abitabile è tra 273 e 373 K.
- **Vita** (la parte ipotetica del modello): nasce raramente su pianeti abitabili con acqua e molecole organiche, cresce, si diffonde con mutazioni e muore se la stella esplode.

## Come si usa

- Trascina per ruotare, rotella o pizzico per lo zoom, Shift+trascina o due dita per spostarti.
- Doppio clic (o doppio tocco) su una stella o un pianeta per seguirlo. Continuando a zoomare entri nel suo **sistema planetario**: orbite ricostruite con la terza legge di Keplero dai dati simulati. Tocca un pianeta per vederlo da vicino.
- La **tavola periodica** sotto la vista mostra la composizione dell'universo intero, dell'oggetto seguito o del Sole.
- Il menu *Particelle* va da 8.192 a 262.144. All'avvio la pagina misura la GPU e sceglie il numero più alto sostenibile.

## Limiti

Le leggi sono reali, le scale no: tempi e distanze sono compressi di molti ordini di grandezza e una particella rappresenta una massa enorme di gas. Le orbite nella vista del sistema sono ricostruite, non simulate punto per punto. L'origine della vita è una regola scelta, non derivata da leggi fisiche. Le abbondanze del Sistema Solare usate come riferimento vengono dalla tabella Kaye & Laby (atomi per Si = 1). Le quote s/r degli elementi pesanti sono approssimate.

## Struttura

| Percorso | Contenuto |
|---|---|
| `index.html` | Versione 4 (GPU), file unico pronto all'uso |
| `versioni/` | Tutte le versioni come file unici: v1 atomi, v2 nubi di gas, v3 universo sferico, v4 GPU |
| `src/v4/` | Sorgenti della v4: `engine.js` (shader WebGPU e motore), `elements.js` (tavola degli elementi), `core4.js` (ripiego su CPU), `page5.html` (interfaccia), `build5.py` (genera `index.html`) |
| `src/v1`–`src/v3` | Sorgenti delle versioni precedenti |
| `test/` | Prove automatiche con Playwright e Chromium (GPU software SwiftShader) |

Per rigenerare `index.html` dopo una modifica: `cd src/v4 && python3 build5.py`.

Per le prove: `npm i playwright`, poi `node test/runh.js 2000 2000 400` (fisica su GPU) oppure `node test/systest.js cpu 30000` (interfaccia e vista del sistema).
