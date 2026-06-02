import type { Block, Indicators, Theme } from './types';

/**
 * Bibliothèque de contenu de la Politique SSE (≠ logique).
 *
 * Chaque bloc est calé sur l'exigence 1.2 du référentiel MASE V2024.
 * Les textes peuvent contenir des variables : {{name}}, {{sector}},
 * {{headcount}}, {{activities}}, {{employerName}}.
 * Une ligne commençant par « - » est rendue comme puce dans le DOCX.
 *
 * Conventions de sélection :
 * - `tone` : variante retenue selon la maturité globale (mature | structuration).
 * - `condition` : bloc de renforcement retenu quand un domaine est peu maîtrisé.
 *   Seuil de renforcement : score de domaine < 0,5 (échelle 0..1).
 */

const RENFORT = 0.5;

export const BLOCKS: Block[] = [
  // ───────────────────────── Préambule [1.2 — adapté taille & activités] ─────
  {
    id: 'preambule_structuration',
    section: 'preambule',
    tone: 'structuration',
    text:
      "{{name}}, entreprise du secteur {{sector}} ({{headcount}}), exerce ses activités de {{activities}}. " +
      "La direction fait de la santé, de la sécurité et de la protection de l'environnement (SSE) une priorité " +
      "et engage l'entreprise dans une démarche structurée de prévention et d'amélioration de ses pratiques. " +
      "Consciente que la maîtrise des risques conditionne autant la protection des personnes que la pérennité " +
      "de l'activité, la direction s'engage à doter l'entreprise des moyens humains, techniques et organisationnels " +
      "nécessaires à la réussite de cette démarche.",
  },
  {
    id: 'preambule_mature',
    section: 'preambule',
    tone: 'mature',
    text:
      "{{name}}, entreprise du secteur {{sector}} ({{headcount}}), exerce ses activités de {{activities}}. " +
      "La santé, la sécurité et la protection de l'environnement (SSE) sont au cœur de notre culture d'entreprise. " +
      "Forte d'une démarche de prévention déjà engagée, la direction réaffirme son ambition de viser l'excellence " +
      "SSE et de consolider durablement ses résultats. Elle s'engage à maintenir et à renforcer les moyens humains, " +
      "techniques et organisationnels qui garantissent la protection de chacun et la maîtrise de nos impacts.",
  },

  // ───────────────────────── Principes essentiels [1.2.1] ───────────────────
  {
    id: 'principes_six',
    section: 'principes',
    text:
      "Pour atteindre ces objectifs, la direction fonde sa politique SSE sur les principes essentiels suivants :\n" +
      "- Identifier, évaluer et prévenir l'ensemble des risques liés à nos activités, en priorité à la source ;\n" +
      "- N'affecter à chaque poste que des personnels formés, aptes et habilités aux risques qu'ils comportent ;\n" +
      "- Limiter le recours au personnel intérimaire et temporaire, et l'encadrer strictement en matière de sécurité ;\n" +
      "- Ne faire appel qu'à des sous-traitants présentant un niveau de maîtrise SSE équivalent au nôtre ;\n" +
      "- Assurer une veille réglementaire permanente et garantir l'application des obligations qui nous incombent ;\n" +
      "- Inscrire l'entreprise dans une dynamique d'amélioration continue de ses performances SSE.",
  },

  // ───────────────────────── Engagement Sécurité [1.2.4] ────────────────────
  {
    id: 'engagement_securite_base',
    section: 'engagement_securite',
    text:
      "En matière de sécurité, la direction s'engage à prévenir les accidents du travail et à protéger l'intégrité " +
      "physique de chaque personne intervenant sur nos chantiers et nos sites. Cet engagement repose sur l'évaluation " +
      "des risques professionnels, la mise en place de moyens de prévention et de protection adaptés, l'accueil et la " +
      "formation à la sécurité, ainsi que l'analyse de tout incident ou accident afin d'en éviter le renouvellement.",
  },
  {
    id: 'engagement_securite_renfort',
    section: 'engagement_securite',
    condition: (ind: Indicators) => ind.domainScores.securite < RENFORT,
    text:
      "La direction reconnaît que la maîtrise des risques sécurité constitue un axe de progrès prioritaire et mobilise " +
      "l'encadrement pour renforcer sans délai la prévention, la traçabilité des vérifications et la culture sécurité " +
      "à tous les niveaux de l'entreprise.",
  },

  // ───────────────────────── Engagement Santé [1.2.5] ───────────────────────
  {
    id: 'engagement_sante_base',
    section: 'engagement_sante',
    text:
      "En matière de santé, la direction s'engage à préserver la santé physique et mentale de ses collaborateurs. " +
      "Elle veille à l'évaluation et à la réduction des risques d'atteinte à la santé — pénibilité, troubles " +
      "musculo-squelettiques, expositions aux agents chimiques, physiques et biologiques — en lien avec la médecine " +
      "du travail, et porte attention aux conditions de travail et à la qualité de vie au travail.",
  },
  {
    id: 'engagement_sante_renfort',
    section: 'engagement_sante',
    condition: (ind: Indicators) => ind.domainScores.sante < RENFORT,
    text:
      "La direction engage une action déterminée pour mieux identifier et réduire les expositions susceptibles d'altérer " +
      "la santé, et pour structurer le suivi des conditions de travail avec les personnels et leurs représentants.",
  },

  // ───────────────────────── Engagement Environnement [1.2.6] ───────────────
  {
    id: 'engagement_environnement_base',
    section: 'engagement_environnement',
    text:
      "En matière d'environnement, la direction s'engage à maîtriser et à réduire les impacts de ses activités. " +
      "Elle identifie ses aspects environnementaux significatifs, organise la gestion des déchets, des effluents et " +
      "des nuisances, maîtrise ses consommations de ressources et veille au respect de ses obligations réglementaires " +
      "environnementales.",
  },
  {
    id: 'engagement_environnement_renfort',
    section: 'engagement_environnement',
    condition: (ind: Indicators) => ind.domainScores.environnement < RENFORT,
    text:
      "La direction fait de la maîtrise de ses impacts environnementaux un chantier prioritaire et s'engage à fiabiliser " +
      "l'identification de ses obligations, la traçabilité de la gestion de ses déchets et la réduction de ses rejets.",
  },

  // ───────────────────────── Amélioration continue [revue périodique] ───────
  {
    id: 'amelioration_continue',
    section: 'amelioration_continue',
    text:
      "La direction inscrit sa démarche dans une logique d'amélioration continue. Des objectifs SSE mesurables sont " +
      "définis, suivis au moyen d'indicateurs et déclinés en plans d'actions. La présente politique est revue " +
      "périodiquement, au moins une fois par an, afin de tenir compte de l'évolution des activités, des résultats " +
      "obtenus et du retour d'expérience.",
  },

  // ───────────────────────── Diffusion [1.2.3] ──────────────────────────────
  {
    id: 'diffusion',
    section: 'diffusion',
    text:
      "La présente politique est portée à la connaissance de l'ensemble du personnel, qu'il soit permanent ou " +
      "temporaire, ainsi que des sous-traitants et des parties intéressées concernées. Chacun, à son niveau, est " +
      "acteur de sa mise en œuvre. La direction compte sur l'implication de tous pour faire vivre cette démarche " +
      "au quotidien.",
  },
];

/**
 * Textes d'axes prioritaires, indexés par thème.
 * `selectBlocks` génère un bloc par axe prioritaire détecté (faiblesse / menace
 * non maîtrisée), dans l'ordre d'intensité décroissante.
 */
export const AXIS_TEXTS: Partial<Record<Theme, string>> = {
  formation:
    "Renforcer la formation et l'habilitation du personnel : déployer un plan de formation SSE couvrant tous les " +
    "postes à risque et tenir à jour les habilitations nécessaires.",
  penibilite:
    "Améliorer la prévention des risques pour la santé : évaluer la pénibilité et les expositions, et mettre en place " +
    "les mesures de réduction et de suivi correspondantes.",
  sous_traitance:
    "Maîtriser la coactivité et la sous-traitance : généraliser les plans de prévention, l'accueil sécurité et " +
    "l'évaluation SSE des entreprises extérieures intervenant sur nos sites.",
  interim:
    "Encadrer le recours au personnel temporaire : systématiser l'accueil sécurité et le suivi des intérimaires, et " +
    "limiter ce recours aux situations maîtrisées.",
  reglementation:
    "Fiabiliser la conformité réglementaire : structurer la veille SSE, maintenir le document unique (DUERP) à jour " +
    "et tracer l'évaluation de conformité.",
  equipements:
    "Sécuriser les équipements et les moyens de prévention : planifier les vérifications périodiques et allouer un " +
    "budget de prévention dédié à leur maintien et à leur renouvellement.",
  culture:
    "Développer la culture sécurité : encourager la remontée des situations à risque et impliquer l'ensemble des " +
    "équipes dans la démarche de prévention.",
  impact_environnemental:
    "Réduire les impacts environnementaux : structurer la gestion des déchets et des rejets et déployer des solutions " +
    "de réduction des consommations et des nuisances.",
};
