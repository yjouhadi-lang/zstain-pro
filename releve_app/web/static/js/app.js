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
    { code: "A2L0", description: "Pastille brute A2 (niveau 0)", groupe: "A2", niveau: 0, L: 82.80, a: 2.41, b: 19.70, deltaE_consecutif: null },
    { code: "A2L1", description: "A2 - 1ère couche de maquillage", groupe: "A2", niveau: 1, L: 82.37, a: 2.97, b: 22.07, deltaE_consecutif: 2.46 },
    { code: "A3L0", description: "Pastille brute A3 (niveau 0)", groupe: "A3", niveau: 0, L: 81.23, a: 4.47, b: 21.90, deltaE_consecutif: null },
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
    liquides: [
        { code: "L-DIL", nom: "Diluting Liquide", usage: "Dilution des pâtes", volume: "8ml" },
        { code: "L-REF", nom: "Refreshing Liquide", usage: "Rafraîchissement", volume: "8ml" },
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

function renderComparison(result) {
    const measured = result.measured;
    const ref = result.bestMatch;
    const mRgb = labToRgb(measured.L, measured.a, measured.b);
    const rRgb = labToRgb(ref.L, ref.a, ref.b);
    document.getElementById('comp-measured-img').style.background = rgbToHex(mRgb.r, mRgb.g, mRgb.b);
    document.getElementById('comp-ref-img').style.background = rgbToHex(rRgb.r, rRgb.g, rRgb.b);
    document.getElementById('comp-measured-lab').textContent = `L*=${measured.L.toFixed(1)} a*=${measured.a.toFixed(1)} b*=${measured.b.toFixed(1)}`;
    document.getElementById('comp-ref-lab').textContent = `L*=${ref.L.toFixed(1)} a*=${ref.a.toFixed(1)} b*=${ref.b.toFixed(1)}`;
    
    // ΔE avec coloration selon seuils PT/AT
    const deltaE = result.deltaE;
    const deltaEl = document.getElementById('comp-delta-e');
    deltaEl.textContent = `ΔE = ${deltaE.toFixed(2)}`;
    deltaEl.className = 'comparison-delta';
    if (deltaE < 1.2) deltaEl.classList.add('delta-perfect');
    else if (deltaE < 3.7) deltaEl.classList.add('delta-acceptable');
    else deltaEl.classList.add('delta-poor');
    
    // Pastille de base (L0 du groupe du closest match)
    const l0 = ZSTAIN_DATA.find(r => r.code === result.bestMatch.groupe + "L0");
    if (l0) {
        document.getElementById('comp-base-code').textContent = l0.code;
        document.getElementById('comp-base-desc').textContent = l0.description;
        const deBase = deltaE_cie76(ref.L, ref.a, ref.b, l0.L, l0.a, l0.b);
        const baseDeltaEl = document.getElementById('comp-base-delta');
        baseDeltaEl.textContent = `ΔE(ref vs base) = ${deBase.toFixed(2)}`;
        baseDeltaEl.className = 'base-delta';
        if (deBase < 1.2) baseDeltaEl.classList.add('delta-perfect');
        else if (deBase < 3.7) baseDeltaEl.classList.add('delta-acceptable');
        else baseDeltaEl.classList.add('delta-poor');
    }
}

function renderStepsComparison(result) {
    const dent = result.measured;
    const match = result.bestMatch;
    const l0 = ZSTAIN_DATA.find(r => r.code === match.groupe + "L0");
    if (!l0) return;
    
    // Utiliser le même mode ΔE que la comparaison visuelle
    const useCIEDE2000 = document.getElementById('chk-ciede2000').checked;
    const deltaEFn = useCIEDE2000 ? deltaE_ciede2000 : deltaE_cie76;
    
    // Couleurs
    const baseRgb = labToRgb(l0.L, l0.a, l0.b);
    const matchRgb = labToRgb(match.L, match.a, match.b);
    const dentRgb = labToRgb(dent.L, dent.a, dent.b);
    
    document.getElementById('steps-base-img').style.background = rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b);
    document.getElementById('steps-match-img').style.background = rgbToHex(matchRgb.r, matchRgb.g, matchRgb.b);
    document.getElementById('steps-dent-img').style.background = rgbToHex(dentRgb.r, dentRgb.g, dentRgb.b);
    
    // Codes et Lab
    document.getElementById('steps-base-code').textContent = l0.code;
    document.getElementById('steps-base-lab').textContent = `L*=${l0.L.toFixed(1)} a*=${l0.a.toFixed(1)} b*=${l0.b.toFixed(1)}`;
    
    document.getElementById('steps-match-code').textContent = match.code;
    document.getElementById('steps-match-lab').textContent = `L*=${match.L.toFixed(1)} a*=${match.a.toFixed(1)} b*=${match.b.toFixed(1)}`;
    
    document.getElementById('steps-dent-lab').textContent = `L*=${dent.L.toFixed(1)} a*=${dent.a.toFixed(1)} b*=${dent.b.toFixed(1)}`;
    
    // ΔE entre Base et Match (effort standard du maquillage)
    const deBaseMatch = deltaEFn(l0.L, l0.a, l0.b, match.L, match.a, match.b);
    const elBaseMatch = document.getElementById('steps-delta-base-match');
    elBaseMatch.textContent = `ΔE = ${deBaseMatch.toFixed(2)}`;
    elBaseMatch.className = 'step-delta';
    if (deBaseMatch < 1.2) elBaseMatch.classList.add('delta-perfect');
    else if (deBaseMatch < 3.7) elBaseMatch.classList.add('delta-acceptable');
    else elBaseMatch.classList.add('delta-poor');
    
    // ΔE entre Match et Dent (résidu — ce que le maquillage standard ne couvre pas)
    const deMatchDent = deltaEFn(match.L, match.a, match.b, dent.L, dent.a, dent.b);
    const elMatchDent = document.getElementById('steps-delta-match-dent');
    elMatchDent.textContent = `ΔE = ${deMatchDent.toFixed(2)}`;
    elMatchDent.className = 'step-delta';
    if (deMatchDent < 1.2) elMatchDent.classList.add('delta-perfect');
    else if (deMatchDent < 3.7) elMatchDent.classList.add('delta-acceptable');
    else elMatchDent.classList.add('delta-poor');
    
    // Résumé pédagogique
    const summaryEl = document.getElementById('steps-summary');
    const modeLabel = useCIEDE2000 ? 'CIEDE2000' : 'CIE76';
    let summary = '';
    if (deMatchDent < 1.2) {
        summary = `✅ Le closest match ${match.code} est très proche de la dent (ΔE=${deMatchDent.toFixed(2)} ${modeLabel}). Le maquillage standard suffit.`;
    } else if (deMatchDent < 3.7) {
        summary = `⚠️ Résidu modéré (ΔE=${deMatchDent.toFixed(2)} ${modeLabel}) entre ${match.code} et la dent. Le Body Shade standard rapprochera significativement, mais un ajustement fin (épaisseur/dilution) peut être nécessaire.`;
    } else {
        summary = `❌ Résidu important (ΔE=${deMatchDent.toFixed(2)} ${modeLabel}) entre ${match.code} et la dent. Le maquillage standard (${match.code}) ne suffit pas — envisager une 2ème couche Body Shade ou un ajustement de groupe.`;
    }
    summaryEl.textContent = summary;
}

function renderEffortBars(result, strategie) {
    const dent = result.measured;
    const l0 = strategie.pointDepart;
    
    // Écarts calculés comme EFFORT NÉCESSAIRE (L0 - dent)
    // La barre indique la direction et l'amplitude de la correction à appliquer
    const deltaL = l0.L - dent.L;   // >0 = il faut éclaircir
    const deltaa = l0.a - dent.a;   // >0 = il faut ajouter du rouge
    const deltab = l0.b - dent.b;   // >0 = il faut ajouter du jaune
    const deltaC = chroma(l0.a, l0.b) - chroma(dent.a, dent.b); // >0 = il faut augmenter saturation
    const de76 = deltaE_cie76(dent.L, dent.a, dent.b, l0.L, l0.a, l0.b);
    const deltaH = Math.sqrt(Math.max(0, de76**2 - (dent.L-l0.L)**2 - (chroma(dent.a,dent.b)-chroma(l0.a,l0.b))**2 ));
    
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

function genererGuideEffort(param, effort, l0, dent) {
    const abs = Math.abs(effort);
    let guide = '';
    
    // Les barres indiquent l'EFFORT à fournir (direction de correction).
    // >0 = il faut augmenter ce paramètre
    // <0 = il faut diminuer ce paramètre
    
    if (param === 'L') {
        if (effort > 0) {
            guide = `L* inférieur : la dent est plus FONCÉE que ${l0.code}. → EFFORT : ÉCLAIRCIR (augmenter L*).`;
        } else {
            guide = `L* supérieur : la dent est plus CLAIRE que ${l0.code}. → EFFORT : ASSOMBRIR (diminuer L*).`;
        }
    } else if (param === 'a') {
        if (effort > 0) {
            guide = `a* négatif : décalage vers le VERT/FROID. → EFFORT : ajouter du ROUGE (+a*).`;
        } else {
            guide = `a* positif : décalage vers le ROUGE/WARM. → EFFORT : ajouter du VERT (−a*).`;
        }
    } else if (param === 'b') {
        if (effort > 0) {
            guide = `b* négatif : décalage vers le BLEU (moins jaune). → EFFORT : ajouter du JAUNE (+b*).`;
        } else {
            guide = `b* positif : décalage vers le JAUNE. → EFFORT : ajouter du BLEU (−b*).`;
        }
    } else if (param === 'C') {
        if (effort > 0) {
            guide = `C* inférieur : dent MOINS SATURÉE que ${l0.code}. → EFFORT : AUGMENTER la saturation (+C*).`;
        } else {
            guide = `C* supérieur : dent PLUS SATURÉE que ${l0.code}. → EFFORT : DIMINUER la saturation (−C*).`;
        }
    } else if (param === 'H') {
        guide = `Décalage de teinte (Hue) détecté. Analyser la direction globale a*+b*.`;
    }
    
    if (abs < 0.5) guide += ` Effort faible — le Body Shade du groupe absorbe cette différence.`;
    else guide += ` Voir le protocole pour l'ajustement concret du Body Shade.`;
    
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
    
    protocol += `> PROTOCOLE DE MAQUILLAGE — BODY SHADE SEUL\n\n`;
    
    protocol += `  PHASE UNIQUE — BODY SHADE (correction globale L*+a*+b*)\n`;
    protocol += `  ─────────────────────────────────────────────────────────\n`;
    protocol += `  Produit : Lustre Paste ONE Body Shade ${COFFRET_DATA.mapping[l0.groupe]}\n`;
    protocol += `  Nombre de couches : ${strategie.niveauRecommande} (${proto.couches})\n`;
    protocol += `  Préparation : ${proto.preparation}\n\n`;
    protocol += `  → Objectif : le Body Shade corrige le GROS du décalage chromatique.\n`;
    if (deltaL < -1.5) {
        protocol += `  → La dent est NETTEMENT PLUS FONCÉE : appliquer Body Shade en couche ÉPAISSE, non dilué.\n`;
    } else if (deltaL > 1.0) {
        protocol += `  → La dent est PLUS CLAIRE : appliquer Body Shade en couche TRÈS FINE ou diluer 50% avec L-DIL.\n`;
    } else {
        protocol += `  → Luminosité proche : appliquer Body Shade en couche STANDARD.\n`;
    }
    protocol += `  → Ne PAS chercher à corriger a* ou b* séparément.\n`;
    protocol += `  → Le Body Shade est le SEUL produit de maquillage nécessaire pour la teinte de base.\n\n`;
    
    protocol += `> ÉTAPES CONCRÈTES\n`;
    protocol += `  1. Usiner la prothèse en zircone ${l0.groupe} (4Y-PSZ)\n`;
    protocol += `  2. Frittage + nettoyage IPA 96%\n`;
    if (strategie.niveauRecommande === 0) {
        protocol += `  3. Glaçage seul (pas de Body Shade nécessaire)\n`;
    } else if (strategie.niveauRecommande === 1) {
        protocol += `  3. 1 couche Body Shade ${COFFRET_DATA.mapping[l0.groupe]} (ajuster épaisseur)\n`;
        protocol += `  4. Séchage → contrôle Optishade (ΔE cible 1.2–1.5)\n`;
        protocol += `  5. Cuisson finale selon protocole Artis®\n`;
    } else {
        protocol += `  3. 1ère couche Body Shade ${COFFRET_DATA.mapping[l0.groupe]}\n`;
        protocol += `  4. 1ère cuisson effets\n`;
        protocol += `  5. 2ème couche Body Shade (ajuster selon résidu)\n`;
        protocol += `  6. Séchage → contrôle Optishade (ΔE cible 1.2–1.5)\n`;
        protocol += `  7. Cuisson finale selon protocole Artis®\n`;
    }
    protocol += `\n`;
    protocol += `> PRODUITS GC INITIAL RECOMMANDÉS\n`;
    protocol += `  Body Shade : Lustre Paste ONE ${COFFRET_DATA.mapping[l0.groupe]} (4g)\n`;
    protocol += `  Liquides : L-DIL (dilution) + L-REF (rafraîchissement)\n`;
    protocol += `  Effort de saturation : ${result.effortSaturation.toFixed(1)}%\n`;
    
    return protocol;
}

function updateUI(result, mode) {
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
    document.getElementById('steps-card').style.display = 'block';
    document.getElementById('effort-card').style.display = 'block';
    document.getElementById('result-card').style.display = 'block';
    document.getElementById('protocol-card').style.display = 'block';
    
    const interp = interpretDeltaE(result.deltaE);
    const ref = result.bestMatch;
    const strategie = determinerStrategie(result);
    
    // Stocker pour le bouton PDF
    window.lastResult = result;
    window.lastStrategie = strategie;
    window.lastMode = mode || 'digital';
    
    renderTeintier(ref.code, result.measured);
    renderComparison(result);
    renderStepsComparison(result);
    renderEffortBars(result, strategie);
    
    // Sauvegarder dans l'historique
    saveToHistory(result, mode || 'digital');
    
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
    const activeTab = document.querySelector('.tab-btn.active');
    const mode = activeTab ? activeTab.dataset.tab : 'digital';
    updateUI(result, mode);
}

// ============================================================================
// HISTORIQUE (localStorage)
// ============================================================================

const HISTORY_KEY = 'zstain_history';
const HISTORY_MAX = 5;

function saveToHistory(result, mode) {
    try {
        const dent = result.measured;
        const ref = result.bestMatch;
        const entry = {
            date: new Date().toISOString(),
            L: dent.L,
            a: dent.a,
            b: dent.b,
            ciede2000: document.getElementById('chk-ciede2000').checked,
            mode: mode,
            bestMatch: ref.code,
            deltaE: result.deltaE,
        };
        
        let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        // Éviter les doublons exacts (même L,a,b)
        history = history.filter(h => !(Math.abs(h.L - dent.L) < 0.01 && Math.abs(h.a - dent.a) < 0.01 && Math.abs(h.b - dent.b) < 0.01));
        history.unshift(entry);
        if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);
        
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        loadHistory();
    } catch (e) {
        console.error('Erreur sauvegarde historique:', e);
    }
}

function loadHistory() {
    try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const wrapper = document.getElementById('history-wrapper');
        const select = document.getElementById('history-select');
        
        if (history.length === 0) {
            if (wrapper) wrapper.style.display = 'none';
            return;
        }
        
        if (wrapper) wrapper.style.display = 'block';
        select.innerHTML = '<option value="">Charger une analyse précédente...</option>';
        
        history.forEach((h, i) => {
            const date = new Date(h.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${date} — ${h.bestMatch} (ΔE=${h.deltaE.toFixed(2)}) — L=${h.L.toFixed(1)} a=${h.a.toFixed(1)} b=${h.b.toFixed(1)}`;
            select.appendChild(option);
        });
    } catch (e) {
        console.error('Erreur chargement historique:', e);
    }
}

function restoreCaseFromHistory(index) {
    try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const h = history[index];
        if (!h) return;
        
        document.getElementById('input-L').value = h.L.toFixed(2);
        document.getElementById('input-a').value = h.a.toFixed(2);
        document.getElementById('input-b').value = h.b.toFixed(2);
        document.getElementById('chk-ciede2000').checked = h.ciede2000;
        
        const result = findClosestMatch(h.L, h.a, h.b, h.ciede2000);
        updateUI(result, h.mode || 'digital');
        
        // Remettre le select à l'option par défaut
        document.getElementById('history-select').value = '';
    } catch (e) {
        console.error('Erreur restauration historique:', e);
    }
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
    
    // Mode visuel : choisir une pastille dans la liste déroulante
    const selectVisuel = document.getElementById('select-visuel');
    if (selectVisuel) {
        selectVisuel.addEventListener('change', () => {
            const code = selectVisuel.value;
            if (!code) return;
            const ref = ZSTAIN_DATA.find(r => r.code === code);
            if (!ref) return;
            document.getElementById('input-L').value = ref.L.toFixed(2);
            document.getElementById('input-a').value = ref.a.toFixed(2);
            document.getElementById('input-b').value = ref.b.toFixed(2);
            handleCalculate();
        });
    }
    
    // === ONGLETS ===
    initTabs();
    
    // === PDF REPORT ===
    const btnPdf = document.getElementById('btn-pdf-report');
    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            if (!window.lastResult || !window.lastStrategie) {
                alert('Veuillez d\'abord effectuer une analyse.');
                return;
            }
            generatePDFReport(window.lastResult, window.lastStrategie, window.lastMode);
        });
    }
    
    // === CONTRÔLE DE MAQUILLAGE ===
    initControlModule();
    
    // === HISTORIQUE ===
    loadHistory();
    const historySelect = document.getElementById('history-select');
    if (historySelect) {
        historySelect.addEventListener('change', () => {
            const idx = historySelect.value;
            if (idx === '') return;
            restoreCaseFromHistory(parseInt(idx));
        });
    }
});


// ============================================================================
// ONGLETS
// ============================================================================

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Mettre à jour les boutons
            tabBtns.forEach(b => b.classList.toggle('active', b === btn));
            
            // Afficher/masquer les workspaces
            document.getElementById('workspace-analysis').classList.toggle('active', tab !== 'controle');
            document.getElementById('workspace-controle').classList.toggle('active', tab === 'controle');
            
            // Gérer les input-panels dans l'analyse
            document.getElementById('input-digital').classList.toggle('active', tab === 'digital');
            document.getElementById('input-visuel').classList.toggle('active', tab === 'visuel');
            
            // Mettre à jour le mode pour le PDF
            if (tab === 'digital') window.lastMode = 'digital';
            if (tab === 'visuel') window.lastMode = 'visuel';
        });
    });
}

// ============================================================================
// GÉNÉRATION PDF
// ============================================================================

function generateCaseId() {
    const d = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ZSP-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${rand}`;
}

function generatePDFReport(result, strategie, mode) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const caseId = generateCaseId();
    const dateStr = new Date().toLocaleString('fr-FR');
    const dent = result.measured;
    const ref = result.bestMatch;
    const l0 = strategie.pointDepart;
    const interp = interpretDeltaE(result.deltaE);
    
    // En-tête
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    doc.text('Z-Stain Pro v3.0 — Rapport d\'analyse colorimétrique', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`ID du cas : ${caseId}     Date : ${dateStr}`, 14, 28);
    doc.text(`Mode de relevé : ${mode === 'visuel' ? 'Visuel (Z-Stain Pro)' : 'Digital (Optishade)'}`, 14, 33);
    
    // Ligne séparatrice
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 36, 196, 36);
    
    let y = 44;
    
    // Section Relevé
    doc.setFontSize(13);
    doc.setTextColor(31, 41, 55);
    doc.text('1. Relevé initial', 14, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`L* = ${dent.L.toFixed(2)}    a* = ${dent.a.toFixed(2)}    b* = ${dent.b.toFixed(2)}`, 14, y);
    y += 6;
    const useCIEDE2000 = document.getElementById('chk-ciede2000').checked;
    doc.text(`Mode ΔE : ${useCIEDE2000 ? 'CIEDE2000' : 'CIE76'}`, 14, y);
    y += 12;
    
    // Section Matching
    doc.setFontSize(13);
    doc.setTextColor(31, 41, 55);
    doc.text('2. Résultat du matching', 14, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Pastille cible : ${ref.code} — ${ref.description}`, 14, y);
    y += 6;
    doc.text(`ΔE patient vs cible : ${result.deltaE.toFixed(2)} — ${interp.text}`, 14, y);
    y += 12;
    
    // Pastille de base
    doc.setFontSize(13);
    doc.text('3. Pastille de base (point de départ)', 14, y);
    y += 8;
    
    const deBase = l0 ? deltaE_cie76(ref.L, ref.a, ref.b, l0.L, l0.a, l0.b) : 0;
    doc.setFontSize(10);
    doc.text(`${l0 ? l0.code : '—'} — ${l0 ? l0.description : ''}`, 14, y);
    y += 6;
    doc.text(`ΔE cible vs base (L0) : ${deBase.toFixed(2)}`, 14, y);
    y += 12;
    
    // Tableau des écarts
    doc.setFontSize(13);
    doc.text('4. Analyse des écarts (par rapport au L0)', 14, y);
    y += 8;
    
    const deltaL = dent.L - l0.L;
    const deltaa = dent.a - l0.a;
    const deltab = dent.b - l0.b;
    const deltaC = chroma(dent.a, dent.b) - chroma(l0.a, l0.b);
    const de76 = deltaE_cie76(dent.L, dent.a, dent.b, l0.L, l0.a, l0.b);
    const deltaH = Math.sqrt(Math.max(0, de76**2 - deltaL**2 - deltaC**2));
    
    doc.autoTable({
        startY: y,
        head: [['Paramètre', 'Écart', 'Direction']],
        body: [
            ['Luminosité L*', `${deltaL > 0 ? '+' : ''}${deltaL.toFixed(2)}`, deltaL > 0 ? 'Plus clair' : (deltaL < 0 ? 'Plus foncé' : 'Identique')],
            ['Rouge-Vert a*', `${deltaa > 0 ? '+' : ''}${deltaa.toFixed(2)}`, deltaa > 0 ? 'Plus rouge' : (deltaa < 0 ? 'Plus vert' : 'Identique')],
            ['Jaune-Bleu b*', `${deltab > 0 ? '+' : ''}${deltab.toFixed(2)}`, deltab > 0 ? 'Plus jaune' : (deltab < 0 ? 'Plus bleu' : 'Identique')],
            ['Saturation C*', `${deltaC > 0 ? '+' : ''}${deltaC.toFixed(2)}`, deltaC > 0 ? 'Plus saturé' : (deltaC < 0 ? 'Moins saturé' : 'Identique')],
            ['Teinte H*', `${deltaH.toFixed(2)}`, 'Décalage de teinte'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [31, 41, 55] },
        styles: { cellPadding: 3 },
        margin: { left: 14, right: 14 },
    });
    
    y = doc.lastAutoTable.finalY + 12;
    
    // Si on dépasse la page, nouvelle page
    if (y > 260) {
        doc.addPage();
        y = 20;
    }
    
    // Protocole
    doc.setFontSize(13);
    doc.text('5. Protocole de maquillage recommandé', 14, y);
    y += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    const protoLines = generateProtocol(result, strategie).split('\n');
    protoLines.forEach(line => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 14, y);
        y += 5;
    });
    
    y += 8;
    if (y > 260) { doc.addPage(); y = 20; }
    
    // Produits GC
    doc.setFontSize(13);
    doc.setTextColor(31, 41, 55);
    doc.text('6. Produits GC Initial recommandés', 14, y);
    y += 8;
    
    const bodyCode = COFFRET_DATA.mapping[strategie.groupeDepart] || 'L-N';
    const stains = (COFFRET_DATA.stains[strategie.groupeDepart] || []).map(s => `${s.code} ${s.nom}`).join(', ');
    const enamel = (COFFRET_DATA.enamel[strategie.groupeDepart] || []).map(e => `${e.code} ${e.nom}`).join(', ');
    
    doc.setFontSize(9);
    doc.text(`Body Shade : ${bodyCode} (${strategie.niveauRecommande} couche(s))`, 14, y);
    y += 5;
    doc.text(`Stains SPS : ${stains || 'Aucun spécifique'}`, 14, y);
    y += 5;
    doc.text(`Effets Émail : ${enamel || 'Standard'}`, 14, y);
    y += 12;
    
    // Pied de page clinique
    doc.setDrawColor(229, 231, 235);
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text('Service de Prothèse Conjointe — CCTD – CHU Ibn Rochd', 14, y);
    y += 5;
    doc.text('Dr. Hachami Imane | Dr. Mazzir Nouhaila | Pr. Jouhadi El Mehdi', 14, y);
    
    // Espace signature
    y += 12;
    doc.setTextColor(107, 114, 128);
    doc.text('Signature du praticien :', 14, y);
    doc.line(60, y, 180, y);
    
    // Nouvelle page pour le bloc machine
    doc.addPage();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('---ZSTAIN-REPORT-DATA---', 14, 20);
    
    const reportData = {
        caseId: caseId,
        date: new Date().toISOString(),
        mode: mode || 'digital',
        L: dent.L,
        a: dent.a,
        b: dent.b,
        ciede2000: document.getElementById('chk-ciede2000').checked,
        bestMatch: ref.code,
        deltaE: result.deltaE,
        baseL0: l0 ? l0.code : null,
        deltaEBase: deBase,
        strategie: {
            groupeDepart: strategie.groupeDepart,
            niveauRecommande: strategie.niveauRecommande,
            pointDepart: l0 ? l0.code : null,
            deltaDepuisL0: strategie.deltaDepuisL0,
        },
        protocol: generateProtocol(result, strategie),
    };
    
    const jsonStr = JSON.stringify(reportData);
    // Split JSON sur plusieurs lignes pour éviter les problèmes de largeur
    const jsonLines = doc.splitTextToSize(jsonStr, 180);
    doc.text(jsonLines, 14, 28);
    doc.text('---END-ZSTAIN-REPORT-DATA---', 14, 28 + jsonLines.length * 4 + 4);
    
    doc.save(`ZstainPro_${caseId}.pdf`);
}

// ============================================================================
// CONTRÔLE DE MAQUILLAGE
// ============================================================================

let currentCaseData = null;

function initControlModule() {
    // Configuration pdfjs worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    // Upload zone
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('input-pdf-upload');
    const uploadPrompt = document.getElementById('upload-prompt');
    const uploadStatus = document.getElementById('upload-status');
    const uploadFilename = document.querySelector('.upload-filename');
    const uploadRemove = document.getElementById('upload-remove');
    
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', () => fileInput.click());
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) handlePDFUpload(files[0]);
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handlePDFUpload(e.target.files[0]);
        });
    }
    
    if (uploadRemove) {
        uploadRemove.addEventListener('click', (e) => {
            e.stopPropagation();
            currentCaseData = null;
            if (fileInput) fileInput.value = '';
            if (uploadPrompt) uploadPrompt.style.display = 'block';
            if (uploadStatus) uploadStatus.style.display = 'none';
            document.getElementById('control-recap').style.display = 'none';
            document.getElementById('control-result').style.display = 'none';
        });
    }
    
    // Bouton analyse contrôle
    const btnAnalyze = document.getElementById('btn-control-analyze');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', handleControlAnalyze);
    }
    
    document.querySelectorAll('#control-L, #control-a, #control-b').forEach(input => {
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleControlAnalyze(); });
    });
}

async function handlePDFUpload(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('Veuillez sélectionner un fichier PDF.');
        return;
    }
    
    document.querySelector('.upload-filename').textContent = file.name;
    document.getElementById('upload-prompt').style.display = 'none';
    document.getElementById('upload-status').style.display = 'flex';
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = await parsePDFReport(e.target.result);
            if (data) {
                currentCaseData = data;
                renderCaseRecap(data);
            } else {
                alert('Impossible de lire les données du rapport. Assurez-vous que le PDF a été généré par Z-Stain Pro.');
                document.getElementById('upload-prompt').style.display = 'block';
                document.getElementById('upload-status').style.display = 'none';
            }
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la lecture du PDF : ' + err.message);
            document.getElementById('upload-prompt').style.display = 'block';
            document.getElementById('upload-status').style.display = 'none';
        }
    };
    reader.readAsArrayBuffer(file);
}

async function parsePDFReport(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('La librairie de lecture PDF n\'est pas chargée.');
    }
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
    }
    
    const match = fullText.match(/---ZSTAIN-REPORT-DATA---\s*([\s\S]*?)\s*---END-ZSTAIN-REPORT-DATA---/);
    if (!match) return null;
    
    try {
        return JSON.parse(match[1].trim());
    } catch (e) {
        console.error('JSON parse error:', e);
        return null;
    }
}

function renderCaseRecap(data) {
    const recap = document.getElementById('control-recap');
    recap.style.display = 'block';
    
    document.getElementById('recap-case-id').textContent = data.caseId || '—';
    document.getElementById('recap-date').textContent = data.date ? new Date(data.date).toLocaleString('fr-FR') : '—';
    document.getElementById('recap-lab-initial').textContent = `L=${data.L.toFixed(2)} a=${data.a.toFixed(2)} b=${data.b.toFixed(2)}`;
    document.getElementById('recap-cible').textContent = data.bestMatch || '—';
    document.getElementById('recap-deltaE').textContent = data.deltaE !== undefined ? data.deltaE.toFixed(2) : '—';
    
    const proto = data.strategie;
    document.getElementById('recap-protocole').textContent = proto 
        ? `${proto.groupeDepart} — ${proto.niveauRecommande} couche(s) Body Shade`
        : '—';
}

function handleControlAnalyze() {
    if (!currentCaseData) {
        alert('Veuillez d\'abord charger le rapport PDF du cas initial.');
        return;
    }
    
    const newL = parseFloat(document.getElementById('control-L').value.replace(',', '.'));
    const newA = parseFloat(document.getElementById('control-a').value.replace(',', '.'));
    const newB = parseFloat(document.getElementById('control-b').value.replace(',', '.'));
    const useCIEDE2000 = document.getElementById('chk-control-ciede2000').checked;
    
    if (isNaN(newL) || isNaN(newA) || isNaN(newB)) {
        alert('Veuillez saisir des valeurs numériques valides pour le nouveau relevé.');
        return;
    }
    
    renderControlResult(currentCaseData, newL, newA, newB, useCIEDE2000);
}

function renderControlResult(caseData, newL, newA, newB, useCIEDE2000) {
    const resultSection = document.getElementById('control-result');
    resultSection.style.display = 'block';
    
    // Couleurs
    const initialRgb = labToRgb(caseData.L, caseData.a, caseData.b);
    const newRgb = labToRgb(newL, newA, newB);
    document.getElementById('control-img-initial').style.background = rgbToHex(initialRgb.r, initialRgb.g, initialRgb.b);
    document.getElementById('control-img-new').style.background = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    
    document.getElementById('control-lab-initial').textContent = `L*=${caseData.L.toFixed(1)} a*=${caseData.a.toFixed(1)} b*=${caseData.b.toFixed(1)}`;
    document.getElementById('control-lab-new').textContent = `L*=${newL.toFixed(1)} a*=${newA.toFixed(1)} b*=${newB.toFixed(1)}`;
    
    // ΔE entre nouveau relevé et patient initial
    const deltaE = useCIEDE2000
        ? deltaE_ciede2000(newL, newA, newB, caseData.L, caseData.a, caseData.b)
        : deltaE_cie76(newL, newA, newB, caseData.L, caseData.a, caseData.b);
    
    const deltaEl = document.getElementById('control-delta-e');
    deltaEl.textContent = `ΔE = ${deltaE.toFixed(2)}`;
    deltaEl.className = 'comparison-delta';
    if (deltaE < 1.2) deltaEl.classList.add('delta-perfect');
    else if (deltaE < 3.7) deltaEl.classList.add('delta-acceptable');
    else deltaEl.classList.add('delta-poor');
    
    // Verdict
    const verdictEl = document.getElementById('control-verdict');
    let verdictText = '';
    let verdictClass = '';
    
    if (deltaE < 1.2) {
        verdictText = '✅ Contrôle conforme — accord parfait avec la cible initiale';
        verdictClass = 'verdict-pass';
    } else if (deltaE < 3.7) {
        verdictText = '⚠️ Contrôle acceptable — ajustement fin possible (SPS ou émail)';
        verdictClass = 'verdict-warn';
    } else {
        verdictText = '❌ Corrections nécessaires — le maquillage doit être complété ou corrigé';
        verdictClass = 'verdict-fail';
    }
    
    verdictEl.textContent = verdictText;
    verdictEl.className = 'control-verdict ' + verdictClass;
    
    // Recommandations
    const recoSection = document.getElementById('control-recommendations');
    const recoContent = document.getElementById('control-reco-content');
    
    if (deltaE >= 1.2) {
        recoSection.style.display = 'block';
        recoContent.textContent = generateControlRecommendations(newL - caseData.L, newA - caseData.a, newB - caseData.b, deltaE, caseData);
    } else {
        recoSection.style.display = 'none';
    }
    
    // Scroll vers le résultat
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function generateControlRecommendations(dL, da, db, deltaE, caseData) {
    let reco = '';
    
    reco += `> ANALYSE DU VECTEUR RÉSIDUEL\n`;
    reco += `  ΔL = ${dL > 0 ? '+' : ''}${dL.toFixed(2)}    Δa = ${da > 0 ? '+' : ''}${da.toFixed(2)}    Δb = ${db > 0 ? '+' : ''}${db.toFixed(2)}\n`;
    reco += `  ΔE résiduel = ${deltaE.toFixed(2)}\n\n`;
    
    // Comparer avec le deltaE initial
    const initialDeltaE = caseData.deltaE || 0;
    if (deltaE < initialDeltaE) {
        reco += `> AMÉLIORATION CONFIRMÉE\n`;
        reco += `  Le maquillage a réduit l'écart de ${initialDeltaE.toFixed(2)} à ${deltaE.toFixed(2)}.\n\n`;
    } else if (deltaE > initialDeltaE) {
        reco += `> ⚠️ DÉGRADATION DÉTECTÉE\n`;
        reco += `  L'écart a augmenté de ${initialDeltaE.toFixed(2)} à ${deltaE.toFixed(2)}.\n`;
        reco += `  Vérifier l'application du Body Shade et la cuisson.\n\n`;
    }
    
    reco += `> RECOMMANDATIONS — AJUSTEMENT BODY SHADE\n`;
    reco += `  ─────────────────────────────────────────────────────────\n\n`;
    
    if (Math.abs(dL) > 1.5) {
        if (dL < 0) {
            reco += `  • LUMINOSITÉ : la prothèse est trop FONCÉE (${dL.toFixed(2)}).\n`;
            reco += `    → Le Body Shade a été sur-appliqué ou la couche est trop épaisse.\n`;
            reco += `    → CORRECTION : ponçage léger + réapplication Body Shade très fine.\n`;
            reco += `    → Ou diluer la pâte à 30-50% avec L-DIL pour plus de transparence.\n\n`;
        } else {
            reco += `  • LUMINOSITÉ : la prothèse est trop CLAIRE (${dL.toFixed(2)}).\n`;
            reco += `    → Le Body Shade a été sous-appliqué ou trop dilué.\n`;
            reco += `    → CORRECTION : reappliquer une couche Body Shade standard non diluée.\n`;
            reco += `    → Si 2 couches déjà appliquées, vérifier la température de cuisson.\n\n`;
        }
    }
    
    if (Math.abs(da) > 0.8) {
        if (da > 0) {
            reco += `  • AXE ROUGE-VERT : décalage vers le ROUGE (+${da.toFixed(2)}).\n`;
            reco += `    → Le Body Shade du groupe ${caseData.strategie?.groupeDepart || ''} est trop warm.\n`;
            reco += `    → CORRECTION : essayer le Body Shade du groupe inférieur (plus froid)\n`;
            reco += `      ou diluer avec L-DIL pour réduire l'opacité chromatique.\n\n`;
        } else {
            reco += `  • AXE ROUGE-VERT : décalage vers le VERT (${da.toFixed(2)}).\n`;
            reco += `    → Le Body Shade est trop froid pour la cible.\n`;
            reco += `    → CORRECTION : essayer le Body Shade du groupe supérieur (plus warm)\n`;
            reco += `      ou augmenter l'épaisseur de la couche existante.\n\n`;
        }
    }
    
    if (Math.abs(db) > 0.8) {
        if (db > 0) {
            reco += `  • AXE JAUNE-BLEU : trop JAUNE (+${db.toFixed(2)}).\n`;
            reco += `    → Le Body Shade est trop saturé en jaune.\n`;
            reco += `    → CORRECTION : diluer avec L-DIL ou passer au groupe inférieur.\n`;
            reco += `    → Vérifier si la couche n'est pas trop épaisse.\n\n`;
        } else {
            reco += `  • AXE JAUNE-BLEU : pas assez JAUNE (${db.toFixed(2)}).\n`;
            reco += `    → Le Body Shade manque de chroma jaune.\n`;
            reco += `    → CORRECTION : augmenter l'épaisseur ou choisir un groupe plus saturé.\n\n`;
        }
    }
    
    if (Math.abs(dL) <= 1.5 && Math.abs(da) <= 0.8 && Math.abs(db) <= 0.8) {
        reco += `  • Les écarts individuels sont faibles mais le ΔE global (${deltaE.toFixed(2)})\n`;
        reco += `    suggère une dérive de TEINTE (Hue) globale.\n`;
        reco += `    → CORRECTION : ajuster l'épaisseur globale du Body Shade.\n`;
        reco += `    → Un léger ponçage + réapplication fine peut corriger la direction.\n\n`;
    }
    
    reco += `  ─────────────────────────────────────────────────────────\n`;
    reco += `  RÈGLE D'OR : ce logiciel se concentre uniquement sur la TEINTE DE BASE.\n`;
    reco += `  Seul le Body Shade est utilisé pour le maquillage colorimétrique.\n`;
    reco += `  Objectif final : ΔE < 1.2 avec l'Optishade.\n`;
    
    return reco;
}
