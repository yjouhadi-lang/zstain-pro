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
    const groupes = ["A1", "A2", "A3"];
    const idxBest = groupes.indexOf(best.groupe);

    // On teste les L0 disponibles pour trouver le meilleur point de départ
    let candidats = [];
    
    // L0 du groupe du closest match
    const l0Best = ZSTAIN_DATA.find(r => r.code === best.groupe + "L0");
    if (l0Best) candidats.push(l0Best);
    
    // L0 du groupe supérieur (si existe)
    if (idxBest < groupes.length - 1) {
        const l0Sup = ZSTAIN_DATA.find(r => r.code === groupes[idxBest + 1] + "L0");
        if (l0Sup) candidats.push(l0Sup);
    }
    
    // L0 du groupe inférieur (si existe)
    if (idxBest > 0) {
        const l0Inf = ZSTAIN_DATA.find(r => r.code === groupes[idxBest - 1] + "L0");
        if (l0Inf) candidats.push(l0Inf);
    }
    
    // Choisir le L0 le plus proche de la dent
    let meilleurL0 = null;
    let minDelta = Infinity;
    candidats.forEach(c => {
        const de = deltaE_cie76(dent.L, dent.a, dent.b, c.L, c.a, c.b);
        if (de < minDelta) { minDelta = de; meilleurL0 = c; }
    });
    
    // Si aucun candidat (ne devrait pas arriver)
    if (!meilleurL0) meilleurL0 = l0Best;
    
    // Calculer le nombre de couches estimé
    // Chaque couche ideale = ΔE 1.2 à 1.5
    const deltaDepuisL0 = minDelta;
    const couchesEstimees = Math.max(0, Math.round(deltaDepuisL0 / 1.35));
    const couchesClampees = Math.min(2, couchesEstimees); // Max 2 couches dans le protocole actuel
    
    // Si delta depuis L0 est très faible, 0 couche
    const niveauFinal = deltaDepuisL0 < 0.8 ? 0 : couchesClampees;
    
    return {
        pointDepart: meilleurL0,
        deltaDepuisL0: deltaDepuisL0,
        couchesEstimees: couchesEstimees,
        niveauRecommande: niveauFinal,
        groupeDepart: meilleurL0.groupe,
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
    const sens = valeur > 0 ? 'positif' : 'negatif';
    const abs = Math.abs(valeur);
    let guide = '';
    
    if (param === 'L') {
        if (sens === 'positif') {
            guide = `La dent est PLUS CLAIRE que ${l0.code}. Depuis la pastille brute, vous devrez maquiller MODÉRÉMENT pour garder de la clarté. `;
            guide += `Conseil : utiliser moins de Body Shade, privilégier L-N (Neutral) ou diluer avec Diluting Liquide.`;
        } else {
            guide = `La dent est PLUS FONCÉE que ${l0.code}. Depuis la pastille brute, vous devrez ASSOMBRIR par maquillage. `;
            guide += `Conseil : appliquer le Body Shade en couche plus épaisse, réduire le Diluting Liquide.`;
        }
    } else if (param === 'a') {
        if (sens === 'positif') {
            guide = `La dent est plus ROUGE que ${l0.code}. Ajouter du pigment rouge/warm : SPS-14 Pink sur cervicales, ou choisir Body Shade plus chaud.`;
        } else {
            guide = `La dent est plus VERTE que ${l0.code}. Réduire les pigments chauds, éviter SPS-14 Pink, privilégier les tons neutres (L-6, L-8).`;
        }
    } else if (param === 'b') {
        if (sens === 'positif') {
            guide = `La dent est plus JAUNE que ${l0.code}. Renforcer le jaune : SPS-7 Yellow ou SPS-8 Orange, appliqués au 1/3 cervical et moyen.`;
        } else {
            guide = `La dent est moins jaune (plus bleue) que ${l0.code}. Atténuer le jaune : réduire SPS-7, utiliser SPS-17 Blue-Grey en incisal.`;
        }
    } else if (param === 'C') {
        if (sens === 'positif') {
            guide = `La dent est PLUS SATURÉE que ${l0.code}. Maquillage plus intense : Body Shade pur (sans dilution), 2 couches possibles.`;
        } else {
            guide = `La dent est MOINS SATURÉE que ${l0.code}. Maquillage plus doux : diluer le Body Shade (25-50% avec Diluting Liquide).`;
        }
    } else if (param === 'H') {
        guide = `Décalage de teinte entre la dent et ${l0.code}. Ajuster globalement : analyser si le décalage est plutôt vers rouge (a*) ou jaune (b*).`;
    }
    
    if (abs < 0.5) guide += ` (écart faible — ajustement minime suffisant)`;
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

function generateProtocol(result, strategie) {
    const dent = result.measured;
    const best = result.bestMatch;
    const l0 = strategie.pointDepart;
    const proto = PROTOCOLE_MAQUILLAGE[strategie.niveauRecommande];
    const interp = interpretDeltaE(result.deltaE);
    
    // Écarts par rapport au point de départ L0
    const deltaL = dent.L - l0.L;
    const deltaa = dent.a - l0.a;
    const deltab = dent.b - l0.b;
    const deltaC = chroma(dent.a, dent.b) - chroma(l0.a, l0.b);
    const de76 = deltaE_cie76(dent.L, dent.a, dent.b, l0.L, l0.a, l0.b);
    const deltaH = Math.sqrt(Math.max(0, de76**2 - deltaL**2 - deltaC**2));
    
    let protocol = `► RÉSULTAT DU MATCHING\n`;
    protocol += `  Closest match : ${best.code} (${best.description})\n`;
    protocol += `  ΔE avec la pastille la plus proche : ${result.deltaE.toFixed(2)} — ${interp.text}\n\n`;
    
    protocol += `► STRATÉGIE DE DÉPART (logique Zstain Pro)\n`;
    protocol += `  ═══════════════════════════════════════════════════════════\n\n`;
    protocol += `  PRINCIPE : On part TOUJOURS d'une pastille brute (niveau L0),\n`;
    protocol += `  puis on maquille pour approcher la teinte de la dent du patient.\n\n`;
    protocol += `  Point de départ recommandé : ${l0.code}\n`;
    protocol += `    (${l0.description})\n`;
    protocol += `  Écart dent ↔ ${l0.code} : ΔE = ${strategie.deltaDepuisL0.toFixed(2)}\n`;
    protocol += `  Nombre de couches estimé : ${strategie.couchesEstimees} (protocole niveau L${strategie.niveauRecommande})\n\n`;
    
    if (best.niveau > strategie.niveauRecommande) {
        protocol += `  → Le closest match ${best.code} suggérait PLUS de maquillage,\n`;
        protocol += `    mais la dent est en réalité PLUS CLAIRE.\n`;
        protocol += `    On part de ${l0.code} et on maquille LÉGÈREMENT.\n\n`;
    } else if (best.niveau < strategie.niveauRecommande) {
        protocol += `  → Le closest match ${best.code} suggérait MOINS de maquillage,\n`;
        protocol += `    mais la dent est en réalité PLUS FONCÉE.\n`;
        protocol += `    On part de ${l0.code} et on maquille PLUS intensément.\n\n`;
    } else {
        protocol += `  → Le closest match ${best.code} correspond bien à l'effort de maquillage\n`;
        protocol += `    nécessaire depuis ${l0.code}.\n\n`;
    }
    
    protocol += `  ═══════════════════════════════════════════════════════════\n\n`;
    
    protocol += `► ÉCARTS À COMPENSER (depuis ${l0.code})\n`;
    protocol += `  La dent du patient diffère de la pastille brute comme suit :\n\n`;
    
    if (Math.abs(deltaL) > 0.3) {
        protocol += `  ■ LUMINOSITÉ (L*) : ${deltaL > 0 ? '+' : ''}${deltaL.toFixed(2)}\n`;
        if (deltaL > 0) {
            protocol += `    → La dent est PLUS CLAIRE que ${l0.code}.\n`;
            protocol += `    → DEPUIS LA PASTILLE BRUTE : ne pas trop maquiller.\n`;
            protocol += `      • Appliquer une couche TRÈS FINE de Body Shade\n`;
            protocol += `      • Diluer avec Diluting Liquide (30-50%)\n`;
            protocol += `      • Ou utiliser uniquement L-N (Neutral) + glaçage\n`;
            protocol += `      • Éviter les Stains foncés (SPS-13, SPS-19, SPS-20)\n`;
        } else {
            protocol += `    → La dent est PLUS FONCÉE que ${l0.code}.\n`;
            protocol += `    → DEPUIS LA PASTILLE BRUTE : maquiller pour assombrir.\n`;
            protocol += `      • Appliquer Body Shade en couche ÉPAISSE\n`;
            protocol += `      • Ne pas diluer (Body Shade pur)\n`;
            protocol += `      • Ajouter SPS-13 Brown ou SPS-19 Grey si nécessaire\n`;
            protocol += `      • Envisager une 2ème couche si ΔE > 2.5\n`;
        }
        protocol += `\n`;
    }
    
    if (Math.abs(deltaa) > 0.2) {
        protocol += `  ■ AXE ROUGE-VERT (a*) : ${deltaa > 0 ? '+' : ''}${deltaa.toFixed(2)}\n`;
        if (deltaa > 0) {
            protocol += `    → La dent est plus ROUGE que ${l0.code}.\n`;
            protocol += `    → DEPUIS LA PASTILLE BRUTE : renforcer le rouge/warm.\n`;
            protocol += `      • SPS-14 Pink sur zones cervicales\n`;
            protocol += `      • SPS-8 Orange pour un rouge profond\n`;
            protocol += `      • Éviter les pigments froids (Blue-Grey)\n`;
        } else {
            protocol += `    → La dent est plus VERTE que ${l0.code}.\n`;
            protocol += `    → DEPUIS LA PASTILLE BRUTE : atténuer le rouge.\n`;
            protocol += `      • Réduire SPS-14 Pink et SPS-8 Orange\n`;
            protocol += `      • Privilégier les tons neutres (L-N, L-6)\n`;
        }
        protocol += `\n`;
    }
    
    if (Math.abs(deltab) > 0.2) {
        protocol += `  ■ AXE JAUNE-BLEU (b*) : ${deltab > 0 ? '+' : ''}${deltab.toFixed(2)}\n`;
        if (deltab > 0) {
            protocol += `    → La dent est plus JAUNE que ${l0.code}.\n`;
            protocol += `    → DEPUIS LA PASTILLE BRUTE : renforcer le jaune.\n`;
            protocol += `      • SPS-7 Yellow sur cervical et moyen\n`;
            protocol += `      • SPS-8 Orange pour un jaune mature\n`;
            protocol += `      • Réduire les effets blancs (L-10)\n`;
        } else {
            protocol += `    → La dent est moins jaune (plus bleue) que ${l0.code}.\n`;
            protocol += `    → DEPUIS LA PASTILLE BRUTE : atténuer le jaune.\n`;
            protocol += `      • Réduire SPS-7 Yellow\n`;
            protocol += `      • SPS-17 Blue-Grey en incisal pour translucidité\n`;
            protocol += `      • Privilégier L-9, L-10 (effets clairs/blancs)\n`;
        }
        protocol += `\n`;
    }
    
    if (Math.abs(deltaC) > 0.3) {
        protocol += `  ■ SATURATION (Chroma C*) : ${deltaC > 0 ? '+' : ''}${deltaC.toFixed(2)}\n`;
        if (deltaC > 0) {
            protocol += `    → La dent est PLUS SATURÉE que ${l0.code}.\n`;
            protocol += `    → DEPUIS LA PASTILLE BRUTE : intensifier les pigments.\n`;
            protocol += `      • Body Shade SANS dilution\n`;
            protocol += `      • SPS Stains purs (peu de Glaze Liquide)\n`;
            protocol += `      • Concentrer sur 1/3 cervical (plus saturé)\n`;
        } else {
            protocol += `    → La dent est MOINS SATURÉE que ${l0.code}.\n`;
            protocol += `    → DEPUIS LA PASTILLE BRUTE : atténuer les pigments.\n`;
            protocol += `      • Diluer Body Shade avec Diluting Liquide\n`;
            protocol += `      • Couche UNIQUE et fine\n`;
            protocol += `      • L-OP opalescent pour "casser" le chroma\n`;
        }
        protocol += `\n`;
    }
    
    if (Math.abs(deltaH) > 0.5) {
        protocol += `  ■ TEINTE (Hue H*) : ${deltaH.toFixed(2)}\n`;
        protocol += `    → Décalage de teinte détecté depuis ${l0.code}.\n`;
        protocol += `    → DEPUIS LA PASTILLE BRUTE : ajuster la direction chromatique.\n`;
        protocol += `      • Analyser si décalage vers rouge (a*) ou jaune (b*)\n`;
        protocol += `      • Rouge : SPS-14 Pink + réduction jaune\n`;
        protocol += `      • Jaune : SPS-7 Yellow + SPS-8 Orange\n`;
        protocol += `      • Orange : SPS-8 + SPS-13 Brown\n`;
        protocol += `      • Vérifier sous lumière naturelle et artificielle\n`;
        protocol += `\n`;
    }
    
    if (Math.abs(deltaL) <= 0.3 && Math.abs(deltaa) <= 0.2 && Math.abs(deltab) <= 0.2 && Math.abs(deltaC) <= 0.3 && Math.abs(deltaH) <= 0.5) {
        protocol += `  ✓ Écarts négligeables — Protocole standard depuis ${l0.code} suffisant.\n\n`;
    }
    
    protocol += `  ═══════════════════════════════════════════════════════════\n\n`;
    
    protocol += `► PROTOCOLE DE MAQUILLAGE (Niveau L${strategie.niveauRecommande})\n`;
    protocol += `  Technique : ${proto.nom}\n`;
    protocol += `  Préparation : ${proto.preparation}\n`;
    protocol += `  Produit principal : ${proto.produit} ${COFFRET_DATA.mapping[l0.groupe]}\n`;
    protocol += `  Application : ${proto.couches}\n`;
    protocol += `  Contrôle : ${proto.controle}\n`;
    protocol += `  Cuisson : ${proto.cuisson}\n\n`;
    
    protocol += `► ÉTAPES CONCRÈTES\n`;
    protocol += `  1. Usiner la prothèse en zircone ${l0.groupe} (4Y-PSZ Cercon ht ML)\n`;
    protocol += `  2. Frittage selon protocole fabricant\n`;
    protocol += `  3. Nettoyage à l'IPA 96%\n`;
    if (strategie.niveauRecommande === 0) {
        protocol += `  4. Application de L-N (Neutral) en couche fine\n`;
        protocol += `  5. Cuisson de connexion + glaçage Lustre NL\n`;
    } else if (strategie.niveauRecommande === 1) {
        protocol += `  4. Application de 1 couche Body Shade ${COFFRET_DATA.mapping[l0.groupe]}\n`;
        protocol += `     (ajuster épaisseur selon les écarts L*/C* ci-dessus)\n`;
        protocol += `  5. Séchage à l'air libre\n`;
        protocol += `  6. Mesure Optishade (ΔE cible 1.2–1.5 par rapport à ${l0.code})\n`;
        protocol += `  7. Cuisson effets + glaçage (Artis®)\n`;
    } else {
        protocol += `  4. 1ère couche Body Shade ${COFFRET_DATA.mapping[l0.groupe]}\n`;
        protocol += `  5. 1ère cuisson effets\n`;
        protocol += `  6. 2ème couche Body Shade (ajuster selon les écarts)\n`;
        protocol += `  7. Séchage + mesure Optishade (ΔE cible 1.2–1.5)\n`;
        protocol += `  8. 2ème cuisson + glaçage (Artis®)\n`;
    }
    protocol += `\n`;
    protocol += `► PRODUITS GC INITIAL RECOMMANDÉS\n`;
    protocol += `  Body Shade : ${COFFRET_DATA.mapping[l0.groupe]}\n`;
    protocol += `  Effort de saturation : ${result.effortSaturation.toFixed(1)}%\n`;
    
    return protocol;
}

function updateUI(result) {
    document.getElementById('empty-state').style.display = 'none';
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
