// src/components/matrice/demoData.ts
import type { MatriceData } from './types';

export const DEMO_DATA: MatriceData = {
  config: {
    company: 'Votre Entreprise',
    docTitle: 'Matrice de Polyvalence 2025',
    categories: [
      { id: 'cat1', name: 'Habilitations & Sécurité', color: '#c0392b' },
      { id: 'cat2', name: 'Compétences Techniques', color: '#1f4d7a' },
      { id: 'cat3', name: 'Management & Support', color: '#7c3aed' },
    ],
  },
  comps: [
    { id: 'c1', name: 'Habilitation électrique (BR/B2V)', categoryId: 'cat1', isKey: true, minBackups: 2 },
    { id: 'c2', name: 'CACES R489 (Chariot)', categoryId: 'cat1', isKey: true, minBackups: 1 },
    { id: 'c3', name: 'Conduite machine A', categoryId: 'cat2', isKey: true, minBackups: 2 },
    { id: 'c4', name: 'Maintenance préventive', categoryId: 'cat2', isKey: false, minBackups: 1 },
    { id: 'c5', name: 'Contrôle qualité', categoryId: 'cat2', isKey: true, minBackups: 1 },
    { id: 'c6', name: "Management d'équipe", categoryId: 'cat3', isKey: false, minBackups: 1 },
    { id: 'c7', name: 'Reporting & indicateurs', categoryId: 'cat3', isKey: false, minBackups: 1 },
  ],
  employees: [
    {
      id: 'e1', name: 'Martin Pierre', role: 'Chef de chantier',
      isAbsent: false, absenceReason: '',
      skills: { c1: 3, c2: 2, c3: 2, c4: 1, c5: 0, c6: 3, c7: 2 },
    },
    {
      id: 'e2', name: 'Dupont Claire', role: 'Électricienne',
      isAbsent: false, absenceReason: '',
      skills: { c1: 3, c2: 0, c3: 1, c4: 2, c5: 1, c6: 0, c7: 1 },
    },
    {
      id: 'e3', name: 'Bernard Thomas', role: 'Opérateur',
      isAbsent: false, absenceReason: '',
      skills: { c1: 1, c2: 3, c3: 3, c4: 2, c5: 2, c6: 0, c7: 0 },
    },
    {
      id: 'e4', name: 'Rousseau Sophie', role: 'Technicienne QC',
      isAbsent: false, absenceReason: '',
      skills: { c1: 0, c2: 1, c3: 0, c4: 1, c5: 3, c6: 1, c7: 2 },
    },
    {
      id: 'e5', name: 'Lambert Hugo', role: 'Agent de maintenance',
      isAbsent: false, absenceReason: '',
      skills: { c1: 2, c2: 2, c3: 2, c4: 3, c5: 1, c6: 0, c7: 0 },
    },
  ],
};
