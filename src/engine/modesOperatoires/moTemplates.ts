import type { ModeOperatoire, OperationType, PhaseStep, EpiItem, SituationUrgence } from '../../types/modesOperatoires';
import type { Approver, Revision } from '../../types/procedures';

function makeApprovers(): Approver[] {
  return [
    { id: crypto.randomUUID(), role: 'Rédigé par', nom: '', date: '' },
    { id: crypto.randomUUID(), role: 'Vérifié par', nom: '', date: '' },
    { id: crypto.randomUUID(), role: 'Approuvé par', nom: '', date: '' },
  ];
}

function makeRevision(): Revision[] {
  return [{
    id: crypto.randomUUID(),
    version: 'V1.0',
    date: new Date().toISOString().split('T')[0],
    auteur: '',
    nature: 'Création du document',
  }];
}

function makeStep(ordre: number, consigne: string, acteur?: string, outil?: string, critique = false): PhaseStep {
  return { id: crypto.randomUUID(), ordre, consigne, acteur, outil, pointControle: critique, critique };
}

function makeEpi(designation: string, norme?: string, obligatoire = true): EpiItem {
  return { id: crypto.randomUUID(), designation, norme, obligatoire };
}

const URGENCES_STANDARD: SituationUrgence[] = [
  {
    id: crypto.randomUUID(),
    scenario: 'Accident corporel',
    conduite: '1. Sécuriser la zone\n2. Appeler le 15 (SAMU)\n3. Ne pas déplacer la victime\n4. Alerter le responsable de chantier',
    contacts: [
      { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
      { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
    ],
  },
  {
    id: crypto.randomUUID(),
    scenario: 'Incendie',
    conduite: "1. Déclencher l'alarme\n2. Évacuer vers le point de rassemblement\n3. Appeler le 18\n4. Couper les énergies si possible sans risque",
    contacts: [
      { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
      { id: crypto.randomUUID(), role: 'Urgences', telephone: '112' },
    ],
  },
];

export interface MoTemplate {
  icon: string;
  label: string;
  operationType: OperationType;
  mo: Omit<ModeOperatoire, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
}

export const MO_TEMPLATES: MoTemplate[] = [
  // ── 1. Consignation/Déconsignation ─────────────────────────────────────
  {
    icon: '🔒',
    label: 'Consignation/Déconsignation',
    operationType: 'consignation',
    mo: {
      title: 'Consignation / Déconsignation électrique et mécanique',
      reference: 'MO-CONS-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      operationType: 'consignation',
      habilitations: ['B2', 'BC', 'BR', 'Habilitation mécanique niveau 2'],
      consignesSSE: {
        risques: ['Électrocution par remise sous tension accidentelle', 'Accident mécanique par mise en marche intempestive', 'Brûlure arc électrique'],
        reglesSecurite: ["Toujours consigner avant d'intervenir (LOTO)", "Vérifier l'absence de tension (VAT) avec appareil homologué", "Poser cadenas et étiquette personnelle sur chaque point d'isolement", "Ne jamais lever la consignation sans accord de tous les intervenants"],
        consignesEnv: ['Récupérer les huiles et lubrifiants dans des bacs de rétention', 'Éliminer les déchets électriques en filière agréée'],
        permisRequis: ['Permis de travail', 'Attestation de consignation signée'],
      },
      epis: [
        makeEpi('Casque de protection', 'EN 397'),
        makeEpi('Gants isolants classe 0 minimum', 'EN 60903', true),
        makeEpi('Chaussures de sécurité ESD', 'EN ISO 20345 + ESD'),
        makeEpi('Lunettes de sécurité', 'EN 166'),
        makeEpi('Vêtement arc électrique', 'EN 61482-2', true),
        makeEpi('Cadenas de consignation (personnel)', undefined, true),
        makeEpi('VAT homologué', undefined, true),
      ],
      phases: {
        preparation: [
          makeStep(1, "Analyser le schéma unifilaire et identifier tous les points d'isolement", 'Chargé de consignation', 'Schéma électrique', true),
          makeStep(2, 'Préparer les équipements de protection et le matériel LOTO', 'Chargé de consignation', 'Kit LOTO, VAT'),
          makeStep(3, "Informer l'exploitant et obtenir l'autorisation d'intervention", 'Chargé de consignation', 'Attestation de consignation', true),
        ],
        execution: [
          makeStep(1, "Mettre hors énergie : ouvrir les disjoncteurs, interrupteurs, vannes selon plan", 'Chargé de consignation', 'Schéma', true),
          makeStep(2, "Condamner chaque point d'isolement (cadenas + étiquette personnelle)", 'Chargé de consignation', 'Kit LOTO', true),
          makeStep(3, "Vérifier l'absence de tension (VAT) sur tous les conducteurs actifs", 'Chargé de consignation', 'VAT homologué', true),
          makeStep(4, 'Mettre à la terre et en court-circuit si nécessaire (HTA/HTB)', 'Chargé de consignation', 'MALT/CC'),
          makeStep(5, "Remettre l'attestation de consignation signée à l'intervenant", 'Chargé de consignation', 'Attestation', true),
          makeStep(6, "Réaliser l'intervention technique", 'Technicien habilité', 'Outillage approprié'),
        ],
        finTache: [
          makeStep(1, "Vérifier que tous les intervenants ont quitté la zone et récupéré leurs outils", 'Chargé de consignation', undefined, true),
          makeStep(2, 'Retirer les mises à la terre et court-circuits', 'Chargé de consignation'),
          makeStep(3, "Lever la consignation : retirer cadenas et étiquettes, fermer les points d'isolement", 'Chargé de consignation', 'Attestation de déconsignation', true),
          makeStep(4, "Remettre sous tension en présence de l'exploitant", "Chargé de consignation + Exploitant"),
          makeStep(5, "Contrôler le bon fonctionnement de l'installation", 'Exploitant'),
          makeStep(6, "Archiver l'attestation de consignation/déconsignation", 'Responsable maintenance', 'GED'),
        ],
      },
      urgences: [
        {
          id: crypto.randomUUID(),
          scenario: 'Électrocution / Brûlure électrique',
          conduite: "1. NE PAS TOUCHER la victime si toujours en contact\n2. Couper l'alimentation électrique depuis le TGBT si accessible\n3. Appeler le 15 (SAMU)\n4. Pratiquer les gestes de premier secours si formé",
          contacts: [
            { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
            { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
          ],
        },
        ...URGENCES_STANDARD,
      ],
      pointRassemblement: 'Parking principal — entrée site',
      approvers: makeApprovers(),
      revisions: makeRevision(),
      revisionFrequency: 'Annuelle',
      status: 'brouillon',
    },
  },

  // ── 2. Travaux en hauteur ──────────────────────────────────────────────
  {
    icon: '🪜',
    label: 'Travaux en hauteur',
    operationType: 'hauteur',
    mo: {
      title: 'Travaux en hauteur — Harnais et EPC',
      reference: 'MO-HAUT-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      operationType: 'hauteur',
      habilitations: ['Formation Travaux en hauteur', 'Harnais certifié', 'SST recommandé'],
      consignesSSE: {
        risques: ["Chute de hauteur", "Chute d'objets sur tiers", "Effondrement échafaudage", "Conditions météo défavorables"],
        reglesSecurite: ["Toujours utiliser un harnais avec longe à absorbeur d'énergie", "Baliser la zone en dessous pour protéger les tiers", "Vérifier le certificat de conformité de l'échafaudage", "Arrêter les travaux si vent > 45 km/h ou foudre"],
        consignesEnv: ["Utiliser des bâches de récupération pour les chutes de matériaux", "Éviter les travaux par temps de pluie verglaçante"],
        permisRequis: ["Permis de travail", "Autorisation de travaux en hauteur"],
      },
      epis: [
        makeEpi("Harnais de sécurité", 'EN 361', true),
        makeEpi("Longe avec absorbeur d'énergie", 'EN 355', true),
        makeEpi("Casque avec jugulaire", 'EN 397', true),
        makeEpi("Chaussures de sécurité antidérapantes", 'EN ISO 20345 S3'),
        makeEpi("Gants de manutention", 'EN 388'),
        makeEpi("Lunettes de protection", 'EN 166'),
        makeEpi("Ligne de vie ou point d'ancrage certifié", 'EN 795', true),
      ],
      phases: {
        preparation: [
          makeStep(1, "Vérifier les conditions météo (vent, pluie, foudre) — arrêt si vent > 45 km/h", 'Chef de chantier', 'Application météo', true),
          makeStep(2, "Inspecter l'échafaudage ou les équipements d'accès (certificat de conformité)", 'Chef de chantier', "Fiche de réception échafaudage", true),
          makeStep(3, "Vérifier l'état du harnais, de la longe et des points d'ancrage", 'Opérateur', 'Fiche de vérification EPI'),
          makeStep(4, 'Baliser la zone au sol (périmètre de sécurité)', 'Chef de chantier', 'Rubalise, cônes'),
        ],
        execution: [
          makeStep(1, "Équiper le harnais et connecter la longe au point d'ancrage certifié", 'Opérateur', 'Harnais + longe', true),
          makeStep(2, "Monter sur l'échafaudage ou l'équipement d'accès", 'Opérateur'),
          makeStep(3, "Réaliser les travaux en maintenant a minima un point d'ancrage actif", 'Opérateur', 'Outillage approprié'),
          makeStep(4, "Ne jamais lancer d'outil — utiliser sac à outils ou ligne de guidage", 'Opérateur', "Sac à outils", true),
        ],
        finTache: [
          makeStep(1, "Rassembler et compter tous les outils avant la descente", 'Opérateur', 'Liste de colisage', true),
          makeStep(2, "Descendre de manière sécurisée — toujours face à l'échafaudage", 'Opérateur'),
          makeStep(3, "Retirer la signalisation de balisage", 'Chef de chantier'),
          makeStep(4, "Vérifier et nettoyer les EPI — signaler tout défaut", 'Opérateur', 'Fiche EPI'),
          makeStep(5, "Compléter le registre d'intervention", 'Chef de chantier', 'Registre chantier'),
        ],
      },
      urgences: [
        {
          id: crypto.randomUUID(),
          scenario: 'Chute en hauteur',
          conduite: "1. NE PAS DÉPLACER la victime\n2. Appeler le 15 (SAMU)\n3. Sécuriser la zone et empêcher l'accès\n4. Conserver la longe et le harnais pour analyse",
          contacts: [
            { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
            { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
          ],
        },
        ...URGENCES_STANDARD,
      ],
      pointRassemblement: "Point de rassemblement — parking entrée",
      approvers: makeApprovers(),
      revisions: makeRevision(),
      revisionFrequency: 'Annuelle',
      status: 'brouillon',
    },
  },

  // ── 3. Espace confiné ──────────────────────────────────────────────────
  {
    icon: '🕳️',
    label: 'Espace confiné',
    operationType: 'confine',
    mo: {
      title: 'Travaux en espace confiné',
      reference: 'MO-CONF-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      operationType: 'confine',
      habilitations: ["CATEC (Certificat d'Aptitude aux Travaux en Espaces Confinés)", 'Surveillant de sécurité désigné', 'SST obligatoire'],
      consignesSSE: {
        risques: ["Asphyxie par manque d'oxygène", 'Intoxication par gaz toxiques (H2S, CO...)', 'Atmosphère explosive (ATEX)', 'Noyade', 'Ensevelissement'],
        reglesSecurite: ["Mesurer l'atmosphère avant toute entrée (O2 ≥ 19,5%, exp. < 10% LIE, CO < 30 ppm)", "Affecter un surveillant en permanence à l'extérieur", "Ne jamais travailler seul dans un espace confiné", "Prévoir plan de sauvetage AVANT l'entrée"],
        consignesEnv: ['Récupérer les eaux de rinçage en cas de nettoyage', "Ventiler avant et pendant l'intervention"],
        permisRequis: ['Permis de pénétration', 'Permis de travail', 'Analyse atmosphérique documentée'],
      },
      epis: [
        makeEpi('Détecteur multigaz (O2, CO, H2S, LEL)', 'ATEX certifié', true),
        makeEpi('ARI (Appareil Respiratoire Isolant)', 'EN 137', true),
        makeEpi("Harnais de sécurité avec point d'ancrage", 'EN 361', true),
        makeEpi('Trépied de sauvetage avec treuil', undefined, true),
        makeEpi('Ligne de communication permanente', undefined, true),
        makeEpi('Lampe ATEX', 'ATEX certifiée', true),
        makeEpi('Combinaison de protection', 'EN 340'),
      ],
      phases: {
        preparation: [
          makeStep(1, "Identifier et consigner toutes les sources d'énergie et d'effluents", 'Chargé de travaux', "Plan d'isolement", true),
          makeStep(2, 'Effectuer les mesures atmosphériques initiales et documenter', 'Surveillant', 'Détecteur multigaz + fiche de mesure', true),
          makeStep(3, 'Mettre en place la ventilation forcée et attendre la stabilisation', 'Chargé de travaux', 'Ventilateur ATEX'),
          makeStep(4, 'Préparer et tester le trépied de sauvetage et les moyens de secours', 'Surveillant', 'Trépied + treuil', true),
          makeStep(5, 'Rédiger et signer le permis de pénétration', 'Chargé de travaux + Surveillant', 'Permis de pénétration', true),
        ],
        execution: [
          makeStep(1, "Vérifier une dernière fois l'atmosphère avant l'entrée du premier opérateur", 'Surveillant', 'Détecteur multigaz', true),
          makeStep(2, "Entrer dans l'espace confiné avec harnais attaché au treuil", 'Opérateur', 'Harnais + ligne de sécurité', true),
          makeStep(3, "Surveiller en continu l'atmosphère — évacuation immédiate si alarme", 'Surveillant', 'Détecteur portatif', true),
          makeStep(4, 'Réaliser les travaux — communication permanente avec le surveillant', 'Opérateur', 'Outillage approprié'),
          makeStep(5, "Maintenir la ventilation tout au long de l'intervention", 'Surveillant', 'Ventilateur'),
        ],
        finTache: [
          makeStep(1, 'Faire sortir tous les opérateurs et vérifier le décompte', 'Surveillant', undefined, true),
          makeStep(2, 'Récupérer tous les outils et matériaux introduits', 'Opérateur', 'Liste de colisage'),
          makeStep(3, 'Retirer le matériel de ventilation', 'Chargé de travaux'),
          makeStep(4, "Lever les consignations dans l'ordre inverse", 'Chargé de travaux', "Plan d'isolement", true),
          makeStep(5, 'Clôturer le permis de pénétration', 'Chargé de travaux', 'Permis de pénétration', true),
        ],
      },
      urgences: [
        {
          id: crypto.randomUUID(),
          scenario: "Opérateur inconscient dans l'espace confiné",
          conduite: "1. NE PAS ENTRER sans ARI\n2. Déclencher le plan de sauvetage immédiatement\n3. Appeler le 15 et le 18\n4. Remonter la victime avec le treuil\n5. Premiers secours en surface",
          contacts: [
            { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
            { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
          ],
        },
        ...URGENCES_STANDARD,
      ],
      pointRassemblement: 'Zone de sécurité désignée — à 50m minimum',
      approvers: makeApprovers(),
      revisions: makeRevision(),
      revisionFrequency: 'Annuelle',
      status: 'brouillon',
    },
  },

  // ── 4. Permis de feu ───────────────────────────────────────────────────
  {
    icon: '🔥',
    label: 'Permis de feu',
    operationType: 'permis-feu',
    mo: {
      title: 'Travaux par points chauds — Permis de feu',
      reference: 'MO-FEU-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      operationType: 'permis-feu',
      habilitations: ['Opérateur points chauds certifié', 'SST obligatoire', 'Agent extincteur désigné'],
      consignesSSE: {
        risques: ['Incendie par projection de particules incandescentes', 'Explosion en atmosphère ATEX', 'Brûlures', 'Intoxication fumées'],
        reglesSecurite: ['Obtenir le permis de feu signé AVANT tout début de travaux', 'Dégager les matières combustibles sur 10m minimum', "Mesurer l'atmosphère si zone susceptible d'être ATEX", 'Maintenir un extincteur et un rondier pendant et après les travaux (1h minimum)'],
        consignesEnv: ['Récupérer les scories et projections', "Protéger les avaloirs et réseaux d'eau pluviale"],
        permisRequis: ['Permis feu', 'Permis de travail', 'Analyse ATEX si applicable'],
      },
      epis: [
        makeEpi('Masque de soudeur / lunettes oxycoupage', 'EN 169 / EN 175', true),
        makeEpi('Gants de soudeur', 'EN 12477 type B', true),
        makeEpi('Tablier de soudeur en cuir', 'EN 11611', true),
        makeEpi('Chaussures de sécurité S3', 'EN ISO 20345 S3'),
        makeEpi('Vêtement ignifugé', 'EN ISO 11612'),
        makeEpi('Extincteur CO2 ou eau pulvérisée à portée', undefined, true),
        makeEpi('Couverture anti-feu', undefined, true),
      ],
      phases: {
        preparation: [
          makeStep(1, "Analyser la zone et identifier les risques d'incendie/explosion", 'Chargé de travaux', 'Analyse de risques', true),
          makeStep(2, 'Dégager et protéger les matériaux combustibles sur 10m minimum', 'Opérateur', 'Bâches anti-feu', true),
          makeStep(3, "Vérifier l'absence d'atmosphère ATEX (mesure obligatoire si zone classée)", 'Chargé de travaux', 'Détecteur gaz', true),
          makeStep(4, "Positionner l'extincteur et désigner l'agent extincteur", 'Chargé de travaux', 'Extincteur vérifié'),
          makeStep(5, 'Signer et délivrer le permis de feu', 'Responsable QHSE + Chargé de travaux', 'Permis de feu', true),
        ],
        execution: [
          makeStep(1, 'Démarrer les travaux par points chauds avec EPI complets', 'Opérateur', 'EPI + extincteur'),
          makeStep(2, 'Surveiller en permanence les projections et les zones adjacentes', 'Agent extincteur', 'Extincteur', true),
          makeStep(3, 'Inspecter les zones périphériques toutes les 30 minutes', 'Agent extincteur'),
          makeStep(4, "Arrêter immédiatement en cas d'alarme incendie ou détection gaz", 'Tous', undefined, true),
        ],
        finTache: [
          makeStep(1, 'Arrêter les travaux et laisser refroidir tous les éléments', 'Opérateur', undefined, true),
          makeStep(2, "Inspecter minutieusement la zone pendant 1h après arrêt", 'Agent extincteur', 'Détecteur thermique', true),
          makeStep(3, 'Récupérer les déchets (scories, électrodes usagées)', 'Opérateur', 'Conteneur déchet métal'),
          makeStep(4, 'Clôturer le permis de feu et archiver', 'Chargé de travaux', 'Permis de feu', true),
          makeStep(5, "Débriefer avec l'agent extincteur", 'Chargé de travaux'),
        ],
      },
      urgences: [
        {
          id: crypto.randomUUID(),
          scenario: 'Départ de feu',
          conduite: "1. Attaquer le feu naissant avec l'extincteur SI sans danger pour soi\n2. Déclencher l'alarme incendie\n3. Évacuer et fermer les portes coupe-feu\n4. Appeler le 18\n5. Rejoindre le point de rassemblement",
          contacts: [
            { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
            { id: crypto.randomUUID(), role: 'Sécurité site', telephone: 'Poste interne' },
          ],
        },
        ...URGENCES_STANDARD,
      ],
      pointRassemblement: 'Parking principal — côté est',
      approvers: makeApprovers(),
      revisions: makeRevision(),
      revisionFrequency: 'Annuelle',
      status: 'brouillon',
    },
  },

  // ── 5. Travaux électriques HT ──────────────────────────────────────────
  {
    icon: '⚡',
    label: 'Travaux électriques HT',
    operationType: 'electrique-ht',
    mo: {
      title: 'Travaux électriques haute tension (HTA/HTB)',
      reference: 'MO-ELEC-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      operationType: 'electrique-ht',
      habilitations: ['H1 ou H2', 'HC (Chargé de consignation HT)', 'Habilitation spéciale HTB si applicable'],
      consignesSSE: {
        risques: ['Électrocution haute tension', 'Arc électrique (flash)', 'Brûlures thermiques', 'Chute de hauteur (accès postes HT)'],
        reglesSecurite: ['Consignation HT obligatoire selon UTE C18-510', 'Distances de sécurité DL et DV à respecter impérativement', 'Jamais de travaux HT en solo — au minimum 2 habilités', "Vérifier l'habilitation et la validité des autorisations avant intervention"],
        consignesEnv: ['Récupérer les huiles de transformateur en cas de fuite', 'PCB : intervention sous protocole dédié si transformateur ancien'],
        permisRequis: ['Permis de travail HT', 'Attestation de consignation HT', 'Déclaration de travaux au gestionnaire réseau si applicable'],
      },
      epis: [
        makeEpi('Gants isolants classe 2 minimum (7,2 kV)', 'EN 60903', true),
        makeEpi('Tapis ou plateforme isolante', 'EN 50191', true),
        makeEpi('Casque avec visière arc électrique', 'EN 166 / IEC 61482', true),
        makeEpi('Vêtement arc électrique classe 2', 'EN 61482-2', true),
        makeEpi('Chaussures isolantes ESD', 'EN ISO 20345', true),
        makeEpi('Perche isolante HT', 'UTE C18-510 conforme', true),
        makeEpi('VAT HT homologué', 'UTE C18-510', true),
      ],
      phases: {
        preparation: [
          makeStep(1, "Vérifier les habilitations de tous les intervenants (date validité)", 'Chargé de travaux HT', 'Registre habilitations', true),
          makeStep(2, 'Analyser les schémas HT et identifier tous les jeux de barres alimentés', 'Chargé de travaux HT', 'Schémas électriques HT', true),
          makeStep(3, "Effectuer la consignation HT (ordre de consignation signé)", 'Chargé de consignation HC', 'Ordre de consignation HT', true),
          makeStep(4, "Vérifier l'absence de tension sur toutes les phases avec VAT HT", 'Chargé de consignation HC', 'VAT HT', true),
          makeStep(5, 'Mettre à la terre et en court-circuit sur les 3 phases', 'Chargé de consignation HC', 'MALT/CC HT', true),
        ],
        execution: [
          makeStep(1, 'Procéder aux travaux dans le respect des distances DL et DV', 'Technicien H1/H2', 'EPI HT complets', true),
          makeStep(2, 'Maintenir la communication permanente entre intervenants', 'Tous', 'Radio / téléphone'),
          makeStep(3, 'Contrôle systématique à chaque étape critique — pas de précipitation', 'Chargé de travaux HT', undefined, true),
        ],
        finTache: [
          makeStep(1, 'Vérifier que tous les intervenants ont quitté la zone HT', 'Chargé de travaux HT', undefined, true),
          makeStep(2, "Retirer les MALT/CC dans l'ordre prescrit", 'Chargé de consignation HC', 'Procédure déconsignation', true),
          makeStep(3, 'Lever la consignation HT et réalimenter selon procédure', 'Chargé de consignation HC', 'Ordre de déconsignation', true),
          makeStep(4, 'Contrôler le retour en service', 'Exploitant HT'),
          makeStep(5, 'Archiver les documents (consignation, habilitations, photos)', 'Chargé de travaux HT', 'GED'),
        ],
      },
      urgences: [
        {
          id: crypto.randomUUID(),
          scenario: 'Électrocution HT / Arc électrique',
          conduite: "1. NE PAS TOUCHER la victime — danger de mort par conduction\n2. Couper la source depuis le disjoncteur général si accessible\n3. Appeler le 15 (SAMU) et le 18\n4. Pratiquer les gestes de secours seulement si tension coupée confirmée",
          contacts: [
            { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
            { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
            { id: crypto.randomUUID(), role: 'Astreinte électrique', telephone: 'Poste interne' },
          ],
        },
      ],
      pointRassemblement: 'Zone identifiée — hors périmètre HT',
      approvers: makeApprovers(),
      revisions: makeRevision(),
      revisionFrequency: 'Annuelle',
      status: 'brouillon',
    },
  },

  // ── 6. Levage / Manutention ────────────────────────────────────────────
  {
    icon: '🏗️',
    label: 'Levage/Manutention',
    operationType: 'levage',
    mo: {
      title: 'Levage et manutention mécanique',
      reference: 'MO-LEV-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      operationType: 'levage',
      habilitations: ['CACES R484 (pont roulant) ou R490 (grue)', 'Chef de manœuvre désigné', 'Vérificateur élingues habilité'],
      consignesSSE: {
        risques: ['Chute de charge', 'Renversement engin de levage', 'Écrasement opérateur', 'Rupture élingue'],
        reglesSecurite: ['Interdire la présence sous la charge', "Vérifier la capacité de charge de l'engin et des élingues avant levage", 'Un seul commandement : le chef de manœuvre désigné', 'Baliser la zone de levage'],
        consignesEnv: ['Contrôler la stabilité du sol support avant toute intervention', 'Éviter le levage par vent fort (> 45 km/h)'],
        permisRequis: ['Permis de travail', 'Plan de levage pour charges > 2T ou levages complexes'],
      },
      epis: [
        makeEpi('Casque de chantier', 'EN 397', true),
        makeEpi('Gants de manutention', 'EN 388', true),
        makeEpi('Chaussures de sécurité S3', 'EN ISO 20345 S3', true),
        makeEpi('Gilet haute visibilité', 'EN 20471'),
        makeEpi('Radio de communication (chef de manœuvre)', undefined, true),
      ],
      phases: {
        preparation: [
          makeStep(1, "Identifier et peser la charge — vérifier la CMU de l'engin et des élingues", 'Chef de manœuvre', 'Balance / datasheet charge', true),
          makeStep(2, 'Inspecter les élingues (état, marquage CE, date de contrôle)', 'Vérificateur', 'Registre élingues', true),
          makeStep(3, 'Préparer le plan de levage si charge > 2T ou situation complexe', 'Chef de manœuvre', 'Plan de levage', true),
          makeStep(4, "Baliser la zone et interdire l'accès sous la trajectoire de levage", 'Chef de manœuvre', 'Rubalise, barrières', true),
          makeStep(5, "Vérifier la stabilité et le calage de l'engin de levage", 'Cariste / Gruiste', 'Béquilles, plaques de répartition', true),
        ],
        execution: [
          makeStep(1, 'Élinguer la charge selon le plan de levage — vérifier le centre de gravité', 'Élingueur', 'Élingues certifiées', true),
          makeStep(2, "Montée à vide : tendre les élingues progressivement, vérifier l'équilibre", 'Cariste / Gruiste', undefined, true),
          makeStep(3, "Levage et déplacement sous les ordres exclusifs du chef de manœuvre", 'Cariste / Gruiste', 'Radio', true),
          makeStep(4, 'Poser la charge progressivement sur le point de dépose préparé', 'Cariste / Gruiste'),
          makeStep(5, 'Caler la charge avant de relâcher les élingues', 'Élingueur', 'Cales', true),
        ],
        finTache: [
          makeStep(1, 'Retirer les élingues et les ranger proprement', 'Élingueur', 'Zone de rangement élingues'),
          makeStep(2, "Retirer le calage de l'engin et libérer la zone", 'Cariste / Gruiste'),
          makeStep(3, 'Retirer le balisage', 'Chef de manœuvre'),
          makeStep(4, 'Vérifier que la charge est stable et sécurisée', 'Chef de manœuvre', undefined, true),
          makeStep(5, "Enregistrer l'opération dans le registre de levage", 'Chef de manœuvre', 'Registre levage'),
        ],
      },
      urgences: [
        {
          id: crypto.randomUUID(),
          scenario: 'Chute de charge / Accident de levage',
          conduite: "1. Appeler le 15 (SAMU) et le 18 si blessé\n2. Sécuriser la zone — risque de renversement secondaire\n3. Ne déplacer ni la victime ni la charge\n4. Couper l'alimentation de l'engin\n5. Alerter le responsable de site immédiatement",
          contacts: [
            { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
            { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
          ],
        },
        ...URGENCES_STANDARD,
      ],
      pointRassemblement: 'Zone de rassemblement — hors périmètre de levage',
      approvers: makeApprovers(),
      revisions: makeRevision(),
      revisionFrequency: 'Annuelle',
      status: 'brouillon',
    },
  },

  // ── 7. Produits chimiques ──────────────────────────────────────────────
  {
    icon: '⚗️',
    label: 'Produits chimiques',
    operationType: 'chimique',
    mo: {
      title: 'Manipulation et stockage de produits chimiques dangereux',
      reference: 'MO-CHIM-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      operationType: 'chimique',
      habilitations: ['Formation risque chimique', 'Formation ATEX si applicable', 'SST recommandé'],
      consignesSSE: {
        risques: ['Intoxication par inhalation / ingestion / absorption cutanée', 'Explosion ATEX', 'Brûlures chimiques', 'Pollution environnementale'],
        reglesSecurite: ['Consulter la Fiche de Données de Sécurité (FDS) avant toute manipulation', 'Manipuler sous ventilation ou en cabine aspirante', 'Ne jamais transvaser dans des contenants non étiquetés', 'Garder les contenants fermés entre chaque utilisation'],
        consignesEnv: ["Confinement du local de stockage : bac de rétention 110% du volume", "Interdiction de déverser dans les réseaux d'eaux pluviales", 'Déchets chimiques en filière élimination agréée'],
        permisRequis: ['Permis de travail si zone ATEX', 'Autorisation de manipulation produit classé CMR'],
      },
      epis: [
        makeEpi('Gants résistants chimiques (selon FDS)', 'EN 374', true),
        makeEpi('Lunettes de protection étanches', 'EN 166 3 4', true),
        makeEpi('Masque à filtre adapté (selon FDS)', 'EN 140 + filtre A/B/E/K', true),
        makeEpi('Combinaison de protection chimique', 'EN 13982 type 5/6', true),
        makeEpi('Chaussures de sécurité résistantes chimiques', 'EN ISO 20345 S3'),
        makeEpi('Douche de sécurité / rince-œil à portée', undefined, true),
      ],
      phases: {
        preparation: [
          makeStep(1, 'Lire et comprendre la FDS du produit — vérifier les EPI requis', 'Opérateur', 'FDS produit', true),
          makeStep(2, "Vérifier la disponibilité et l'état des EPI (date péremption gants, filtres)", 'Opérateur', 'Registre EPI'),
          makeStep(3, "Vérifier la ventilation et les équipements d'urgence (douche, rince-œil)", 'Responsable QHSE', 'Check ventilation', true),
          makeStep(4, 'Étiqueter correctement tous les contenants et récipients', 'Opérateur', 'Étiquettes conformes GHS'),
        ],
        execution: [
          makeStep(1, "Équiper les EPI complets AVANT tout contact avec le produit", 'Opérateur', 'EPI selon FDS', true),
          makeStep(2, "Manipuler sous hotte ou ventilation — éviter les projections", 'Opérateur'),
          makeStep(3, 'En cas de déversement : absorber avec matériaux inertes (vermiculite, sable)', 'Opérateur', 'Kit absorbant', true),
          makeStep(4, 'Ne pas mélanger des produits incompatibles (acides + bases, oxydants + réducteurs)', 'Opérateur', undefined, true),
        ],
        finTache: [
          makeStep(1, 'Refermer et étiqueter les contenants', 'Opérateur'),
          makeStep(2, 'Décontaminer les surfaces et le matériel utilisé', 'Opérateur', 'Solution de décontamination'),
          makeStep(3, 'Retirer les EPI sans contact cutané — se laver les mains', 'Opérateur', undefined, true),
          makeStep(4, 'Éliminer les déchets chimiques dans les filières agréées', 'Opérateur', "Bon d'élimination déchet"),
          makeStep(5, 'Ranger les produits en local de stockage sécurisé (séparation incompatibles)', 'Opérateur', 'Plan de stockage'),
        ],
      },
      urgences: [
        {
          id: crypto.randomUUID(),
          scenario: 'Projection / Intoxication chimique',
          conduite: "1. Rincer abondamment à l'eau 15 min minimum (yeux : fontaine rince-œil)\n2. Appeler le 15 (SAMU) en précisant le produit (nom, FDS)\n3. Appeler le Centre AntiPoison si nécessaire : 01 40 05 48 48\n4. Apporter la FDS aux secours",
          contacts: [
            { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
            { id: crypto.randomUUID(), role: 'Centre AntiPoison', telephone: '01 40 05 48 48' },
            { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
          ],
        },
        ...URGENCES_STANDARD,
      ],
      pointRassemblement: 'Rassemblement côté vent — zone dégagée',
      approvers: makeApprovers(),
      revisions: makeRevision(),
      revisionFrequency: 'Annuelle',
      status: 'brouillon',
    },
  },

  // ── 8. Travaux VRD ─────────────────────────────────────────────────────
  {
    icon: '⛏️',
    label: 'Travaux VRD',
    operationType: 'vrd',
    mo: {
      title: 'Travaux de voirie, réseaux et terrassement (VRD)',
      reference: 'MO-VRD-001',
      version: 'V1.0',
      documentDate: new Date().toISOString().split('T')[0],
      operationType: 'vrd',
      habilitations: ["AIPR (Autorisation d'Intervention à Proximité des Réseaux)", 'CACES R482 (engins de chantier) si applicable', 'Habilitation électrique B0/H0 pour approche réseaux'],
      consignesSSE: {
        risques: ['Endommagement de réseaux enterrés (gaz, électrique, télécom, eau)', 'Ensevelissement en fouille', 'Chute en fouille', 'Perturbation trafic'],
        reglesSecurite: ['Effectuer toutes les DICT avant le démarrage des travaux', 'Matérialiser les réseaux enterrés avant toute fouille mécanique', "Fouilles > 1,30m : blindage ou talutage obligatoire", 'Signalisation temporaire de chantier conforme arrêté'],
        consignesEnv: ['Gérer les terres excavées et déchets de fouille en filière agréée', 'Limiter les nuisances sonores et vibratoires', "Protéger les ouvrages d'assainissement lors de travaux de terrassement"],
        permisRequis: ["DICT (Déclaration d'Intention de Commencement de Travaux)", 'Arrêté de voirie / permission de voirie', 'Permis de fouille si applicable'],
      },
      epis: [
        makeEpi('Casque de chantier', 'EN 397', true),
        makeEpi('Gilet haute visibilité classe 3', 'EN 20471', true),
        makeEpi('Chaussures de sécurité S3', 'EN ISO 20345 S3', true),
        makeEpi('Gants de manutention', 'EN 388'),
        makeEpi('Lunettes anti-poussière', 'EN 166'),
        makeEpi('Protections auditives (lors de compactage)', 'EN 352'),
      ],
      phases: {
        preparation: [
          makeStep(1, 'Envoyer les DICT et attendre les récépissés (délai réglementaire : 9 jours)', 'Conducteur de travaux', 'Guichet DICT unique', true),
          makeStep(2, 'Marquer au sol les réseaux identifiés (peinture spray, piquets)', 'Géomètre / Conducteur', 'Plans réseaux + peinture', true),
          makeStep(3, "Obtenir l'arrêté de voirie et mettre en place la signalisation temporaire", 'Conducteur de travaux', 'Arrêté + panneaux K', true),
          makeStep(4, 'Implanter les protections de fouille (blindage, étaiement)', 'Chef de chantier', 'Matériel blindage'),
        ],
        execution: [
          makeStep(1, "Décaper mécaniquement jusqu'à 40 cm au-dessus des réseaux, puis manuellement", "Conducteur d'engin + Terrassier", 'Engin + pelles', true),
          makeStep(2, 'Vérifier visuellement chaque réseau mis à jour — documenter (photo)', 'Chef de chantier', 'Appareil photo'),
          makeStep(3, 'Réaliser les travaux sur les réseaux selon les préconisations gestionnaires', 'Équipe technique', 'Outillage spécifique'),
          makeStep(4, 'Remblaiement par couches compactées selon plan de compactage', "Conducteur d'engin", 'Compacteur'),
        ],
        finTache: [
          makeStep(1, 'Contrôle de compactage (plaque vibratoire ou essais si spécifié)', 'Topographe / Laboratoire', 'Appareil de mesure compactage', true),
          makeStep(2, 'Réfection de voirie ou enrobé selon marché', 'Équipe VRD'),
          makeStep(3, 'Retirer la signalisation temporaire', 'Chef de chantier', undefined, true),
          makeStep(4, 'Informer les gestionnaires de réseaux de la fin des travaux', 'Conducteur de travaux', 'Email/courrier'),
          makeStep(5, 'Archiver photos, DICT, récépissés et PV de compactage', 'Conducteur de travaux', 'GED'),
        ],
      },
      urgences: [
        {
          id: crypto.randomUUID(),
          scenario: 'Endommagement réseau gaz',
          conduite: "1. ÉVACUER immédiatement la zone — 50m minimum\n2. Interdire toute flamme, étincelle, engin\n3. Appeler le gestionnaire réseau gaz et le 18\n4. Appeler le 15 si blessé\n5. NE PAS COLMATER sans l'accord du gestionnaire",
          contacts: [
            { id: crypto.randomUUID(), role: 'Urgences gaz (GRDF)', telephone: '0 800 47 33 33' },
            { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
            { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
          ],
        },
        {
          id: crypto.randomUUID(),
          scenario: 'Ensevelissement en fouille',
          conduite: "1. Appeler le 15 et le 18 IMMÉDIATEMENT\n2. Sécuriser les berges — risque d'effondrement supplémentaire\n3. Ne pas entrer dans la fouille sans sécurisation\n4. Dégager manuellement si accès sécurisé",
          contacts: [
            { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
            { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
          ],
        },
      ],
      pointRassemblement: 'Zone de rassemblement — hors périmètre de chantier',
      approvers: makeApprovers(),
      revisions: makeRevision(),
      revisionFrequency: 'Annuelle',
      status: 'brouillon',
    },
  },
];
