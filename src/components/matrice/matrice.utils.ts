// src/components/matrice/matrice.utils.ts
import type { Comp, Employee, CoverageAlert, MatriceData, MatriceAction } from './types';

export function uid(): string {
  return '_' + Math.random().toString(36).slice(2, 9);
}

/** Nombre de personnes disponibles (non absentes) avec niveau >= 2 sur une compétence */
export function countAvailable(comp: Comp, employees: Employee[]): number {
  return employees.filter(e => !e.isAbsent && (e.skills[comp.id] ?? 0) >= 2).length;
}

/** Redondance par compétence : nombre de personnes niveau >= 2 (absents inclus) */
export function computeRedundancy(comps: Comp[], employees: Employee[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const comp of comps) {
    result[comp.id] = employees.filter(e => (e.skills[comp.id] ?? 0) >= 2).length;
  }
  return result;
}

/** Alertes pour les compétences clés sous-couvertes (personnes disponibles seulement) */
export function getCoverageAlerts(comps: Comp[], employees: Employee[]): CoverageAlert[] {
  const alerts: CoverageAlert[] = [];
  for (const comp of comps) {
    if (!comp.isKey) continue;
    const available = employees.filter(e => !e.isAbsent && (e.skills[comp.id] ?? 0) >= 2);
    if (available.length === 0) {
      alerts.push({
        comp,
        status: 'critical',
        reason: 'Aucune personne disponible niveau ≥ 2',
        availableEmployees: available,
      });
    } else if (available.length < comp.minBackups) {
      alerts.push({
        comp,
        status: 'warning',
        reason: `${available.length} / ${comp.minBackups} remplaçants requis`,
        availableEmployees: available,
      });
    }
  }
  return alerts;
}

/** Reducer principal */
export function matriceReducer(state: MatriceData, action: MatriceAction): MatriceData {
  switch (action.type) {
    case 'SET_DATA':
      return action.data;

    case 'SET_SKILL': {
      const employees = state.employees.map(e =>
        e.id === action.employeeId
          ? { ...e, skills: { ...e.skills, [action.compId]: action.level } }
          : e
      );
      return { ...state, employees };
    }

    case 'ADD_EMPLOYEE': {
      const skills: Record<string, number> = {};
      state.comps.forEach(c => { skills[c.id] = 0; });
      const employee = { ...action.employee, id: uid(), skills };
      return { ...state, employees: [...state.employees, employee] };
    }

    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(e => e.id === action.employee.id ? action.employee : e),
      };

    case 'DELETE_EMPLOYEE':
      return { ...state, employees: state.employees.filter(e => e.id !== action.id) };

    case 'TOGGLE_ABSENCE':
      return {
        ...state,
        employees: state.employees.map(e =>
          e.id === action.employeeId
            ? { ...e, isAbsent: action.isAbsent, absenceReason: action.reason }
            : e
        ),
      };

    case 'ADD_COMP': {
      const comp = { ...action.comp, id: uid() };
      const employees = state.employees.map(e => ({
        ...e, skills: { ...e.skills, [comp.id]: 0 },
      }));
      return { ...state, comps: [...state.comps, comp], employees };
    }

    case 'UPDATE_COMP':
      return { ...state, comps: state.comps.map(c => c.id === action.comp.id ? action.comp : c) };

    case 'DELETE_COMP': {
      const employees = state.employees.map(e => {
        const skills = { ...e.skills };
        delete skills[action.id];
        return { ...e, skills };
      });
      return { ...state, comps: state.comps.filter(c => c.id !== action.id), employees };
    }

    case 'ADD_CATEGORY': {
      const category = { ...action.category, id: uid() };
      return {
        ...state,
        config: { ...state.config, categories: [...state.config.categories, category] },
      };
    }

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        config: {
          ...state.config,
          categories: state.config.categories.map(c =>
            c.id === action.category.id ? action.category : c
          ),
        },
      };

    case 'DELETE_CATEGORY':
      return {
        ...state,
        config: {
          ...state.config,
          categories: state.config.categories.filter(c => c.id !== action.id),
        },
        comps: state.comps.filter(c => c.categoryId !== action.id),
      };

    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.config } };

    default:
      return state;
  }
}
