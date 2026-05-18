/**
 * Zstain Pro - Application Web
 * Logique corrigée : on part toujours d'une pastille L0 (brute) et on maquille
 * pour approcher la teinte cible. Le closest match sert à identifier le groupe
 * de départ et l'effort de maquillage nécessaire.
 */

const ZSTAIN_DATA = [
    { code: "A1L0", description: "Pastille brute A1 (niveau 0)", groupe: "A1", niveau: 0, L: 85.47, a: 1.87, b: 18.55, deltaE_consecutif: null },
    { code: "A1L1", description: "A1 - 1ère couche de maquillage", groupe: "A1", niveau: 1, L: 84.43, a: 2.15, b: 17.17, deltaE_consecutif: 1.27 },
    { code: "A1L2", description: "A1 - 2ème couche de maquillage", groupe: "A1", niveau: 2, L: 83.94, a: 2.49, b: 17.77, deltaE_consecutif: 1.70 },
    { code: "A2L0", description: "Pastille brute A2 (niveau 0)", groupe: "A2", niveau: 0, L: 82.80, a: 2.41, b: 19.70, deltaE_consecutif: 2.17 },
    { code: "A2L1", description: "A2 - 1ère couche de maquillage", groupe: "A2", niveau: 1, L: 82.37, a: 2.97, b: 22.07, deltaE_consecutif: 2.46 },
    { code: "A3L0", description: "Pastille brute A3 (niveau 0)", groupe: "A3", niveau: 0, L: 81.23, a: 4.47, b: 21.90, deltaE_consecutif: 1.22 },
    { code: "A3L1", description: "A3 - 1ère couche de maquillage", groupe: "A3", niveau: 1, L: 78.88, a: 5.77, b: 23.50, deltaE_consecutif: 3.00 },
    { code: "A3L2", description: "A3 - 2ème couche de maquillage", groupe: "A3", niveau: 2, L: 77.13, a: 5.47, b: 25.48, deltaE_consecutif: 3.20 },
];

const L_MAX_TEINTIER = Math.max(...ZSTAIN_DATA.map(r => r.L));

const PROTOCOLE_MAQUILLAGE = {
    0: { nom: "Glaçage seul", preparation: "Nettoyage IPA 96 %", couches: "Aucune", produit: "Lustre Paste Neutral (L-N)", controle: "—", cuisson: "Glaçage Lustre NL (cuisson de connexion)" },
    1: { nom: "Painting — 1 couche", preparation: "Nettoyage IPA 96 %", couches: "1 couche Body Shade", produit: "GC Initial IQ Lustre Pastes ONE", controle: "Mesure Optishade (ΔE cible = 1.2 à 1.5)", cuisson: "1 cuisson effets + glaçage" },
    2: { nom: "Painting — 2 couches", preparation: "Nettoyage IPA 96 %", couches: "2 couches Body Shade successives", produit: "GC Initial IQ Lustre Pastes ONE", controle: "Mesure Optishade (ΔE cible = 1.2 à 1.5)", cuisson: "2 cuissons effets + glaçage" },
};

const COFFRET_DATA = {
    mapping: { "A1": "L-A", "A2": "L-B", "A3": "L-C" },
    stains: {
        "A1": [
            { code: "SPS-1", nom: "White", usage: "Points blancs, hypoplasies" },
            { code: "SPS-2", nom: "White FLUO", usage: "Fluorescence blanche" },
            { code: "SPS-7", nom: "Yellow", usage: "Caractérisation jaune légère" },
        ],
        "A2": [
            { code: "SPS-7", nom: "Yellow", usage: "Caractérisation jaune" },
            { code: "SPS-8", nom: "Orange", usage: "Caractérisation orange" },
            { code: "SPS-13", nom: "Brown", usage: "Caractérisation brune" },
        ],
        "A3": [
            { code: "SPS-8", nom: "Orange", usage: "Caractérisation orange" },
            { code: "SPS-13", nom: "Brown", usage: "Caractérisation brune" },
            { code: "SPS-19", nom: "Grey", usage: "Ombrage, âge" },
            { code: "SPS-20", nom: "Dark Brown", usage: "Caractérisation marquée" },
        ],
    },
    enamel: {
        "A1": [
            { code: "L-8", nom: "Enamel Effect 8", usage: "Émail clair" },
            { code: "L-9", nom: "Enamel Effect 9", usage: "Émail très clair" },
            { code: "L-10", nom: "Enamel Effect 10", usage: "Émail blanc" },
        ],
        "A2": [
            { code: "L-6", nom: "Enamel Effect 6", usage: "Émail moyen" },
            { code: "L-8", nom: "Enamel Effect 8", usage: "Émail clair" },
            { code: "L-9", nom: "Enamel Effect 9", usage: "Émail très clair" },
        ],
        "A3": [
            { code: "L-3", nom: "Enamel Effect 3", usage: "Émail translucide" },
            { code: "L-6", nom: "Enamel Effect 6", usage: "Émail moyen" },
            { code: "L-OP", nom: "Enamel Opal", usage: "Effet opalescent" },
        ],
    },
    liquides: [
        { code: "L-DIL", nom: "Diluting Liquide", usage: "Dilution des pâtes", volume: "8ml" },
        { code: "L-REF", nom: "Refreshing Liquide", usage: "Rafraîchissement", volume: "8ml" },
        { code: "L-NFL", nom: "Lustre Paste Neutral FLUO", usage: "Fluorescence", volume: "4g" },
    ],
    outils: [
        { code: "BR-00", nom: "Pinceau 00", usage: "Détails fins" },
        { code: "BR-2", nom: "Pinceau n°2", usage: "Application couches" },
        { code: "MD", nom: "Mixing Dish", usage: "Mélange" },
    ],
};

// ============================================================================
// COLORIMÉTRIE
// ============================================================================

function chroma(a, b) { return Math.sqrt(a * a + b * b); }

function deltaE_cie76(L1, a1, b1, L2, a2, b2) {
    const dL = L2 - L1, da = a2 - a1, db = b2 - b1;
    return Math.sqrt(dL * dL + da * da + db * db);
}

function deltaE_ciede2000(L1, a1, b1, L2, a2, b2) {
    const C1 = Math.sqrt(a1**2 + b1**2), C2 = Math.sqrt(a2**2 + b2**2);
    const C_bar = (C1 + C2) / 2.0;
    const G = 0.5 * (1 - Math.sqrt(Math.pow(C_bar, 7) / (Math.pow(C_bar, 7) + Math.pow(25, 7))));
    const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
    const C1p = Math.sqrt(a1p**2 + b1**2), C2p = Math.sqrt(a2p**2 + b2**2);
    let h1p = Math.atan2(b1, a1p) * 180 / Math.PI; if (h1p < 0) h1p += 360;
    let h2p = Math.atan2(b2, a2p) * 180 / Math.PI; if (h2p < 0) h2p += 360;
    const dLp = L2 - L1, dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p !== 0) {
        if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
        else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
        else dhp = h2p - h1p + 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(Math.PI * dhp / 360);
    const Lbp = (L1 + L2) / 2.0, Cbp = (C1p + C2p) / 2.0;
    let Hbp = h1p + h2p;
    if (C1p * C2p !== 0) {
        if (Math.abs(h1p - h2p) <= 180) Hbp = (h1p + h2p) / 2.0;
        else if (h1p + h2p < 360) Hbp = (h1p + h2p + 360) / 2.0;
        else Hbp = (h1p + h2p - 360) / 2.0;
    }
    const T = (1 - 0.17 * Math.cos(Math.PI * (Hbp - 30) / 180)
        + 0.24 * Math.cos(Math.PI * (2 * Hbp) / 180)
        + 0.32 * Math.cos(Math.PI * (3 * Hbp + 6) / 180)
        - 0.20 * Math.cos(Math.PI * (4 * Hbp - 63) / 180));
    const SL = 1 + (0.015 * (Lbp - 50)**2) / Math.sqrt(20 + (Lbp - 50)**2);
    const SC = 1 + 0.045 * Cbp;
    const SH = 1 + 0.015 * Cbp * T;
    const dtheta = 30 * Math.exp(-Math.pow((Hbp - 275) / 25, 2));
    const RC = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
    const RT = -Math.sin(Math.PI * (2 * dtheta) / 180) * RC;
    const t1 = dLp / SL, t2 = dCp / SC, t3 = dHp / SH;
    return Math.sqrt(t1**2 + t2**2 + t3**2 + RT * t2 * t3);
}

function findClosestMatch(L, a, b, useCIEDE2000) {
    const measuredChroma = chroma(a, b);
    const matches = ZSTAIN_DATA.map(ref => {
        const de = useCIEDE2000
            ? deltaE_ciede2000(L, a, b, ref.L, ref.a, ref.b)
            : deltaE_cie76(L, a, b, ref.L, ref.a, ref.b);
        return { ref, deltaE: de };
    });
    matches.sort((x, y) => x.deltaE - y.deltaE);
    const best = matches[0];
    const ref = best.ref;
    const deltaL = L - ref.L, deltaa = a - ref.a, deltab = b - ref.b;
    const deltaC = measuredChroma - chroma(ref.a, ref.b);
    const de76 = deltaE_cie76(L, a, b, ref.L, ref.a, ref.b);
    const deltaH = Math.sqrt(Math.max(0, de76**2 - deltaL**2 - deltaC**2));
    const refChroma = chroma(ref.a, ref.b);
    const effortSaturation = refChroma > 0 ? Math.abs(deltaC) / refChroma * 100 : 0;
    let saturationDirection;
    if (deltaC > 0.5) saturationDirection = "Augmenter la saturation";
    else if (deltaC < -0.5) saturationDirection = "Diminuer la saturation";
    else saturationDirection = "Saturation quasi identique";
    return {
        measured: { L, a, b, chroma: measuredChroma },
        bestMatch: ref,
        deltaE: best.deltaE,
        deltaL, deltaa, deltab, deltaC, deltaH,
        effortSaturation,
        saturationDirection,
        allMatches: matches,
    };
}

function interpretDeltaE(deltaE) {
    if (deltaE < 1.0) return { text: "Imperceptible - Accord parfait", class: "perfect" };
    if (deltaE < 1.2) return { text: "Très faible - Seuil de perceptibilité", class: "good" };
    if (deltaE < 2.0) return { text: "Faible - Perceptible par un expert", class: "good" };
    if (deltaE < 3.5) return { text: "Modéré - Perceptible par un observateur moyen", class: "moderate" };
    if (deltaE < 5.0) return { text: "Moyen - Différence visible", class: "moderate" };
    return { text: "Fort - Couleurs clairement différentes", class: "poor" };
}

// ============================================================================
// CONVERSION LAB → RGB
// ============================================================================

function labToRgb(L, a, b) {
    const Xn = 95.047, Yn = 100.0, Zn = 108.883;
    const fy = (L + 16.0) / 116.0;
    const fx = a / 500.0 + fy;
    const fz = fy - b / 200.0;
    const delta = 6.0 / 29.0;
    function f_inv(t) { return t > delta ? t**3 : 3 * (delta**2) * (t - 4.0/29.0); }
    const X = Xn * f_inv(fx) / 100.0;
    const Y = Yn * f_inv(fy) / 100.0;
    const Z = Zn * f_inv(fz) / 100.0;
    let r =  3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
    let g = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
    let b_ =  0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
    function gamma(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * (c ** (1.0/2.4)) - 0.055; }
    r = gamma(r); g = gamma(g); b_ = gamma(b_);
    function clamp(v) { return Math.max(0, Math.min(255, Math.round(v * 255))); }
    return { r: clamp(r), g: clamp(g), b: clamp(b_) };
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// DÉTERMINATION DU POINT DE DÉPART L0 ET NOMBRE DE COUCHES
// ============================================================================

function determinerStrategie(result) {
    const dent = result.measured;
    const best = result.bestMatch;
    
    // Le closest match détermine directement le groupe de départ et le nombre de couches
    // Ex: A3L1 → départ A3L0 + 1 couche de maquillage
    const l0 = ZSTAIN_DATA.find(r => r.code === best.groupe + "L0");
    const deltaDepuisL0 = l0 ? deltaE_cie76(dent.L, dent.a, dent.b, l0.L, l0.a, l0.b) : 0;
    
    return {
        pointDepart: l0,
        deltaDepuisL0: deltaDepuisL0,
        niveauRecommande: best.niveau,
        groupeDepart: best.groupe,
    };
}

// ============================================================================
// INTERFACE
// ============================================================================

function populateTable() {
    const tbody = document.querySelector('#table-refs tbody');
    tbody.innerHTML = '';
    ZSTAIN_DATA.forEach(ref => {
        const tr = document.createElement('tr');
        tr.dataset.code = ref.code;
        tr.innerHTML = `<td><strong>${ref.code}</strong></td><td>${ref.description}</td><td>${ref.L.toFixed(2)}</td><td>${ref.a.toFixed(2)}</td><td>${ref.b.toFixed(2)}</td><td>${ref.deltaE_consecutif ? ref.deltaE_consecutif.toFixed(2) : '—'}</td>`;
        tbody.appendChild(tr);
    });
}

function renderTeintier(bestCode, measured) {
    const grid = document.getElementById('teintier-grid');
    grid.innerHTML = '';

    if (measured) {
        const mRgb = labToRgb(measured.L, measured.a, measured.b);
        const mHex = rgbToHex(mRgb.r, mRgb.g, mRgb.b);
        const mDiv = document.createElement('div');
        mDiv.className = 'pastille-item measured';
        mDiv.innerHTML = `
            <div class="pastille-circle" style="background:${mHex};">
                <span class="match-badge-icon" style="background:#3b82f6;">PATIENT</span>
            </div>
            <div class="pastille-code">Mesuré</div>
            <div class="pastille-lab">L${measured.L.toFixed(1)} a${measured.a.toFixed(1)} b${measured.b.toFixed(1)}</div>
        `;
        grid.appendChild(mDiv);
    }

    ZSTAIN_DATA.forEach(ref => {
        const rgb = labToRgb(ref.L, ref.a, ref.b);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const isBest = ref.code === bestCode;
        const div = document.createElement('div');
        div.className = `pastille-item ${isBest ? 'best-match' : ''}`;
        div.innerHTML = `
            <div class="pastille-circle" style="background:${hex};">
                ${isBest ? '<span class="match-badge-icon">MATCH</span>' : ''}
            </div>
            <div class="pastille-code">${ref.code}</div>
            <div class="pastille-lab">L${ref.L.toFixed(1)} a${ref.a.toFixed(1)} b${ref.b.toFixed(1)}</div>
        `;
        grid.appendChild(div);
    });
}

function renderComparison(measured, ref) {
    const mRgb = labToRgb(measured.L, measured.a, measured.b);
    const rRgb = labToRgb(ref.L, ref.a, ref.b);
    document.getElementById('comp-measured-img').style.background = rgbToHex(mRgb.r, mRgb.g, mRgb.b);
    document.getElementById('comp-ref-img').style.background = rgbToHex(rRgb.r, rRgb.g, rRgb.b);
    document.getElementById('comp-measured-lab').textContent = `L*=${measured.L.toFixed(1)} a*=${measured.a.toFixed(1)} b*=${measured.b.toFixed(1)}`;
    document.getElementById('comp-ref-lab').textContent = `L*=${ref.L.toFixed(1)} a*=${ref.a.toFixed(1)} b*=${ref.b.toFixed(1)}`;
}

function renderEffortBars(result, strategie) {
    const dent = result.measured;
    const l0 = strategie.pointDepart;
    
    // Écarts calculés par rapport au point de départ L0 (pas le closest match)
    const deltaL = dent.L - l0.L;
    const deltaa = dent.a - l0.a;
    const deltab = dent.b - l0.b;
    const deltaC = chroma(dent.a, dent.b) - chroma(l0.a, l0.b);
    const de76 = deltaE_cie76(dent.L, dent.a, dent.b, l0.L, l0.a, l0.b);
    const deltaH = Math.sqrt(Math.max(0, de76**2 - deltaL**2 - deltaC**2));
    
    const params = [
        { key: 'L', name: 'Luminosité', val: deltaL, thresholds: [1, 2.5] },
        { key: 'a', name: 'Rouge-Vert', val: deltaa, thresholds: [0.8, 2] },
        { key: 'b', name: 'Jaune-Bleu', val: deltab, thresholds: [0.8, 2] },
        { key: 'C', name: 'Saturation', val: deltaC, thresholds: [1, 2.5] },
        { key: 'H', name: 'Teinte', val: deltaH, thresholds: [1.5, 3] },
    ];
    
    params.forEach(p => {
        const row = document.querySelector(`.effort-row[data-param="${p.key}"]`);
        const valEl = document.getElementById(`effort-${p.key}-val`);
        const barEl = document.getElementById(`effort-${p.key}-bar`);
        const markerEl = document.getElementById(`effort-${p.key}-marker`);
        const guideEl = document.getElementById(`effort-${p.key}-guide`);
        
        const sev = Math.abs(p.val) <= p.thresholds[0] ? 'ok' : (Math.abs(p.val) <= p.thresholds[1] ? 'warning' : 'danger');
        row.className = `effort-row ${sev}`;
        valEl.textContent = `${p.val > 0 ? '+' : ''}${p.val.toFixed(2)}`;
        
        const maxRange = p.key === 'L' ? 5 : (p.key === 'H' ? 5 : 4);
        const pct = Math.max(-maxRange, Math.min(maxRange, p.val));
        const widthPct = Math.abs(pct) / maxRange * 50;
        barEl.style.width = widthPct + '%';
        barEl.style.left = pct >= 0 ? '50%' : (50 - widthPct) + '%';
        markerEl.style.left = (50 + (pct / maxRange) * 50) + '%';
        
        guideEl.textContent = genererGuideEffort(p.key, p.val, l0, dent);
    });
}

function genererGuideEffort(param, valeur, l0, dent) {
    const abs = Math.abs(valeur);
    let guide = '';
    
    // Les barres servent d'information visuelle sur le vecteur global.
    // Les conseils segmentaires ont été remplacés par le protocole holistique.
    
    if (param === 'L') {
        guide = valeur > 0 
            ? `L* supérieur : la dent est plus claire que ${l0.code}.`
            : `L* inférieur : la dent est plus foncée que ${l0.code}.`;
    } else if (param === 'a') {
        guide = valeur > 0
            ? `a* positif : décalage vers le rouge/warm.`
            : `a* négatif : décalage vers le vert/froid.`;
    } else if (param === 'b') {
        guide = valeur > 0
            ? `b* positif : décalage vers le jaune.`
            : `b* négatif : décalage vers le bleu (moins jaune).`;
    } else if (param === 'C') {
        guide = valeur > 0
            ? `C* supérieur : dent plus saturée que ${l0.code}.`
            : `C* inférieur : dent moins saturée que ${l0.code}.`;
    } else if (param === 'H') {
        guide = `Décalage de teinte (Hue) détecté. Analyser la direction globale a*+b*.`;
    }
    
    if (abs < 0.5) guide += ` Écart faible — le Body Shade du groupe absorbe cette différence.`;
    else guide += ` Voir le protocole holistique pour l'ajustement concret.`;
    
    return guide;
}

function renderCoffret(groupe, niveau) {
    const card = document.getElementById('coffret-card');
    card.style.display = 'block';
    const bodyCode = COFFRET_DATA.mapping[groupe] || "L-N";
    document.getElementById('coffret-body-name').textContent = `Lustre Paste ONE Body Shade ${bodyCode}`;
    document.getElementById('coffret-body-desc').textContent = niveau === 0 
        ? `Pas de Body Shade nécessaire — glaçage seul (L-N)`
        : `Teinte corps pour groupe ${groupe} — ${niveau} couche(s) recommandée(s)`;
    
    const stainsList = document.getElementById('coffret-stains');
    stainsList.innerHTML = '';
    (COFFRET_DATA.stains[groupe] || []).forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `<code>${s.code}</code> <span>${s.nom} — ${s.usage}</span>`;
        stainsList.appendChild(li);
    });
    
    const enamelList = document.getElementById('coffret-enamel');
    enamelList.innerHTML = '';
    (COFFRET_DATA.enamel[groupe] || []).forEach(e => {
        const li = document.createElement('li');
        li.innerHTML = `<code>${e.code}</code> <span>${e.nom} — ${e.usage}</span>`;
        enamelList.appendChild(li);
    });
    
    const liquidesList = document.getElementById('coffret-liquides');
    liquidesList.innerHTML = '';
    COFFRET_DATA.liquides.forEach(l => {
        const li = document.createElement('li');
        li.innerHTML = `<code>${l.code}</code> ${l.nom} <span>(${l.volume})</span>`;
        liquidesList.appendChild(li);
    });
    
    const outilsList = document.getElementById('coffret-outils');
    outilsList.innerHTML = '';
    COFFRET_DATA.outils.forEach(o => {
        const li = document.createElement('li');
        li.innerHTML = `<code>${o.code}</code> ${o.nom} <span>— ${o.usage}</span>`;
        outilsList.appendChild(li);
    });
}

function classerDirectionChromatique(deltaL, deltaa, deltab) {
    const directions = [];
    if (Math.abs(deltaL) > 0.5) directions.push(deltaL > 0 ? "plus claire" : "plus foncée");
    if (Math.abs(deltaa) > 0.3) directions.push(deltaa > 0 ? "plus rouge/warm" : "plus verte/froide");
    if (Math.abs(deltab) > 0.3) directions.push(deltab > 0 ? "plus jaune" : "moins jaune (bleutée)");
    if (directions.length === 0) return "très proche";
    return directions.join(", ");
}

function recommanderSPS(deltaL, deltaa, deltab, groupe) {
    const sps = [];
    // Body Shade corrige le gros du vecteur L+a+b
    // Les SPS servent à affiner la direction chromatique résiduelle
    if (deltaa > 0.3 && deltab > 0.3) {
        sps.push("SPS-8 Orange (warm global, cervical + moyen)");
        if (groupe === "A3") sps.push("SPS-13 Brown (profondeur, 1/3 cervical)");
    } else if (deltaa > 0.3 && deltab < -0.3) {
        sps.push("SPS-14 Pink (rouge sans jaune, zones cervicales)");
        sps.push("SPS-17 Blue-Grey (incisal, translucidité)");
    } else if (deltaa < -0.3 && deltab > 0.3) {
        sps.push("SPS-7 Yellow (jaune sans rouge, moyen)");
        sps.push("L-9 / L-10 (effets clairs, casser le warm)");
    } else if (deltaa < -0.3 && deltab < -0.3) {
        sps.push("SPS-17 Blue-Grey (froid, incisal)");
        sps.push("L-OP opalescent (neutraliser le chroma)");
    } else if (deltaa > 0.3) {
        sps.push("SPS-14 Pink (cervical)");
    } else if (deltaa < -0.3) {
        sps.push("L-6 / L-8 (effets neutres, éviter warm)");
    } else if (deltab > 0.3) {
        sps.push("SPS-7 Yellow (cervical + moyen)");
    } else if (deltab < -0.3) {
        sps.push("SPS-17 Blue-Grey (incisal)");
        sps.push("L-9 / L-10 (effets clairs/blancs)");
    }
    if (deltaL < -2.0 && sps.length > 0) {
        sps.unshift("⚠️ Attention : la dent est nettement plus foncée. Privilégier Body Shade épais AVANT tout SPS stain.");
    }
    if (deltaL > 1.5 && sps.length > 0) {
        sps.unshift("⚠️ Attention : la dent est plus claire. Appliquer Body Shade TRÈS FIN ou diluer. Les SPS stains foncés risquent de sur-assombrir.");
    }
    return sps;
}

function genererAjustementEmail(deltaL, deltaC) {
    if (deltaL < -2 && deltaC > 0) return "L-3 ou L-6 (émail translucide/moyen) — la dent est foncée ET saturée, l'émail doit rester naturel.";
    if (deltaL < -2 && deltaC < 0) return "L-OP opalescent + L-3 — casser le chroma tout en gardant de la profondeur.";
    if (deltaL > 1) return "L-9 / L-10 (émail très clair/blanc) — compenser la clarté en incisal.";
    return "L-6 / L-8 (émail standard) — ajustement classique.";
}

function generateProtocol(result, strategie) {
    const dent = result.measured;
    const best = result.bestMatch;
    const l0 = strategie.pointDepart;
    const proto = PROTOCOLE_MAQUILLAGE[strategie.niveauRecommande];
    const interp = interpretDeltaE(result.deltaE);
    
    const deltaL = dent.L - l0.L;
    const deltaa = dent.a - l0.a;
    const deltab = dent.b - l0.b;
    const deltaC = chroma(dent.a, dent.b) - chroma(l0.a, l0.b);
    
    const direction = classerDirectionChromatique(deltaL, deltaa, deltab);
    const spsList = recommanderSPS(deltaL, deltaa, deltab, l0.groupe);
    const emailRec = genererAjustementEmail(deltaL, deltaC);
    
    let protocol = `> RÉSULTAT DU MATCHING\n`;
    protocol += `  Closest match : ${best.code} (${best.description})\n`;
    protocol += `  ΔE avec la pastille la plus proche : ${result.deltaE.toFixed(2)} — ${interp.text}\n\n`;
    
    protocol += `> DIAGNOSTIC CHROMATIQUE GLOBAL\n`;
    protocol += `  ═══════════════════════════════════════════════════════════\n\n`;
    protocol += `  La dent du patient est ${direction} que ${l0.code}.\n`;
    protocol += `  Direction vectorielle : ΔL=${deltaL.toFixed(2)}, Δa=${deltaa > 0 ? '+' : ''}${deltaa.toFixed(2)}, Δb=${deltab > 0 ? '+' : ''}${deltab.toFixed(2)}.\n\n`;
    protocol += `  Le closest match ${best.code} indique que ${best.niveau} couche(s) de Body Shade\n`;
    protocol += `  ${COFFRET_DATA.mapping[l0.groupe]} constituent la BASE maquillage adaptée.\n`;
    protocol += `  Le Body Shade modifie L*, a* ET b* simultanément — on ne peut pas dissocier ces effets.\n\n`;
    protocol += `  ═══════════════════════════════════════════════════════════\n\n`;
    
    protocol += `> PROTOCOLE EN 3 PHASES (approche holistique)\n\n`;
    
    protocol += `  PHASE 1 — BODY SHADE (correction globale L*+a*+b*)\n`;
    protocol += `  ─────────────────────────────────────────────────────────\n`;
    protocol += `  Produit : ${COFFRET_DATA.mapping[l0.groupe]}\n`;
    protocol += `  Nombre de couches : ${strategie.niveauRecommande} (${proto.couches})\n`;
    protocol += `  Préparation : ${proto.preparation}\n\n`;
    protocol += `  → Objectif : le Body Shade corrige le GROS du décalage chromatique.\n`;
    if (deltaL < -1.5) {
        protocol += `  → La dent est NETTEMENT PLUS FONCÉE : appliquer Body Shade en couche ÉPAISSE, non dilué.\n`;
    } else if (deltaL > 1.0) {
        protocol += `  → La dent est PLUS CLAIRE : appliquer Body Shade en couche TRÈS FINE ou diluer 50%.\n`;
    } else {
        protocol += `  → Luminosité proche : appliquer Body Shade en couche STANDARD.\n`;
    }
    protocol += `  → Ne PAS chercher à corriger a* ou b* séparément à ce stade.\n\n`;
    
    if (strategie.niveauRecommande > 0) {
        protocol += `  PHASE 2 — CARACTÉRISATION SPS (affinement)\n`;
        protocol += `  ─────────────────────────────────────────────────────────\n`;
        if (spsList.length === 0) {
            protocol += `  → Aucun SPS stain spécifique nécessaire après Body Shade.\n`;
            protocol += `    Le résidu chromatique est faible ; passer directement à la Phase 3.\n`;
        } else {
            protocol += `  → Après la couche Body Shade, affiner la direction chromatique avec :\n`;
            spsList.forEach(s => { protocol += `    • ${s}\n`; });
        }
        protocol += `\n  → RÈGLE D'OR : un SPS stain modifie a*, b* ET C* en même temps.\n`;
        protocol += `    Ne jamais cumuler SPS foncé + Body Shade épais sans contrôle Optishade intermédiaire.\n\n`;
    }
    
    protocol += `  PHASE 3 — ÉMAIL + GLAÇAGE (finalisation)\n`;
    protocol += `  ─────────────────────────────────────────────────────────\n`;
    protocol += `  → Effet émail recommandé : ${emailRec}\n`;
    protocol += `  → Glaçage : Lustre Paste Neutral (L-N) ou Neutral FLUO (L-NFL)\n`;
    protocol += `  → Cuisson finale selon protocole Artis®\n\n`;
    
    protocol += `> ÉTAPES CONCRÈTES\n`;
    protocol += `  1. Usiner la prothèse en zircone ${l0.groupe} (4Y-PSZ)\n`;
    protocol += `  2. Frittage + nettoyage IPA 96%\n`;
    if (strategie.niveauRecommande === 0) {
        protocol += `  3. Application L-N + glaçage (pas de Body Shade)\n`;
    } else if (strategie.niveauRecommande === 1) {
        protocol += `  3. 1 couche Body Shade ${COFFRET_DATA.mapping[l0.groupe]} (ajuster épaisseur)\n`;
        protocol += `  4. Séchage → contrôle Optishade (ΔE cible 1.2–1.5)\n`;
        protocol += `  5. SPS stains si besoin (Phase 2)\n`;
        protocol += `  6. Émail + glaçage → cuisson Artis®\n`;
    } else {
        protocol += `  3. 1ère couche Body Shade ${COFFRET_DATA.mapping[l0.groupe]}\n`;
        protocol += `  4. 1ère cuisson effets\n`;
        protocol += `  5. 2ème couche Body Shade (ajuster selon résidu)\n`;
        protocol += `  6. Séchage → contrôle Optishade (ΔE cible 1.2–1.5)\n`;
        protocol += `  7. SPS stains si besoin (Phase 2)\n`;
        protocol += `  8. Émail + glaçage → cuisson finale Artis®\n`;
    }
    protocol += `\n`;
    protocol += `> PRODUITS GC INITIAL RECOMMANDÉS\n`;
    protocol += `  Body Shade : ${COFFRET_DATA.mapping[l0.groupe]}\n`;
    protocol += `  Effort de saturation : ${result.effortSaturation.toFixed(1)}%\n`;
    
    return protocol;
}

function updateUI(result) {
    document.getElementById('empty-state').style.display = 'none';
    
    // Détection blanchiment : L* patient > pastille la plus claire du teintier
    const alertEl = document.getElementById('whitening-alert');
    const lMaxEl = document.getElementById('whitening-lmax');
    if (result.measured.L > L_MAX_TEINTIER) {
        alertEl.style.display = 'block';
        if (lMaxEl) lMaxEl.textContent = L_MAX_TEINTIER.toFixed(2);
    } else {
        alertEl.style.display = 'none';
    }
    
    document.getElementById('teintier-card').style.display = 'block';
    document.getElementById('comparison-card').style.display = 'block';
    document.getElementById('effort-card').style.display = 'block';
    document.getElementById('result-card').style.display = 'block';
    document.getElementById('protocol-card').style.display = 'block';
    
    const interp = interpretDeltaE(result.deltaE);
    const ref = result.bestMatch;
    const strategie = determinerStrategie(result);
    
    renderTeintier(ref.code, result.measured);
    renderComparison(result.measured, ref);
    renderEffortBars(result, strategie);
    
    document.querySelector('.match-code').textContent = ref.code;
    document.querySelector('.match-deltaE').textContent = `ΔE = ${result.deltaE.toFixed(2)}`;
    document.getElementById('match-description').textContent = ref.description;
    const interpEl = document.getElementById('match-interpretation');
    interpEl.textContent = interp.text;
    interpEl.className = `interpretation ${interp.class}`;
    
    const list = document.getElementById('matches-list');
    list.innerHTML = '';
    result.allMatches.slice(0, 5).forEach(m => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="match-name">${m.ref.code} <span style="color:var(--text-muted);font-weight:400">(${m.ref.groupe} L${m.ref.niveau})</span></span><span class="match-de">ΔE = ${m.deltaE.toFixed(2)}</span>`;
        list.appendChild(li);
    });
    
    document.getElementById('protocol-content').textContent = generateProtocol(result, strategie);
    
    document.querySelectorAll('#table-refs tbody tr').forEach(tr => {
        tr.classList.toggle('highlight', tr.dataset.code === ref.code);
    });
    
    renderCoffret(strategie.groupeDepart, strategie.niveauRecommande);
}

function handleCalculate() {
    const L = parseFloat(document.getElementById('input-L').value.replace(',', '.'));
    const a = parseFloat(document.getElementById('input-a').value.replace(',', '.'));
    const b = parseFloat(document.getElementById('input-b').value.replace(',', '.'));
    const useCIEDE2000 = document.getElementById('chk-ciede2000').checked;
    
    if (isNaN(L) || isNaN(a) || isNaN(b)) { alert('Veuillez saisir des valeurs numériques valides.'); return; }
    if (L < 0 || L > 100) { alert('L* doit être entre 0 et 100.'); return; }
    
    const result = findClosestMatch(L, a, b, useCIEDE2000);
    updateUI(result);
}

document.addEventListener('DOMContentLoaded', () => {
    populateTable();
    document.getElementById('btn-calculate').addEventListener('click', handleCalculate);
    
    const btnToggle = document.getElementById('btn-toggle-table');
    const tableSection = document.getElementById('table-section');
    if (btnToggle && tableSection) {
        btnToggle.addEventListener('click', () => {
            const isHidden = tableSection.style.display === 'none';
            tableSection.style.display = isHidden ? 'block' : 'none';
            btnToggle.textContent = isHidden ? '📋 Masquer le tableau de référence' : '📋 Afficher le tableau de référence';
            btnToggle.classList.toggle('active', isHidden);
        });
    }
    
    document.querySelectorAll('.input-group input').forEach(input => {
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleCalculate(); });
    });
});
