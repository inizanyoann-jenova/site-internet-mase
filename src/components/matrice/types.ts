// src/components/matrice/types.ts

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Comp {
  id: string;
  name: string;
  categoryId: string;
  isKey: boolean;
  minBackups: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  isAbsent: boolean;
  absenceReason: string;
  skills: Record<string, number>; // compId → level 0-3
}

export interface MatriceConfig {
  company: string;
  docTitle: string;
  categories: Category[];
}

export interface MatriceData {
  config: MatriceConfig;
  comps: Comp[];
  employees: Employee[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface CoverageAlert {
  comp: Comp;
  status: 'critical' | 'warning';
  reason: string;
  availableEmployees: Employee[];
}

export type MatriceAction =
  | { type: 'SET_DATA'; data: MatriceData }
  | { type: 'SET_SKILL'; employeeId: string; compId: string; level: number }
  | { type: 'ADD_EMPLOYEE'; employee: Omit<Employee, 'id' | 'skills'> }
  | { type: 'UPDATE_EMPLOYEE'; employee: Employee }
  | { type: 'DELETE_EMPLOYEE'; id: string }
  | { type: 'TOGGLE_ABSENCE'; employeeId: string; isAbsent: boolean; reason: string }
  | { type: 'ADD_COMP'; comp: Omit<Comp, 'id'> }
  | { type: 'UPDATE_COMP'; comp: Comp }
  | { type: 'DELETE_COMP'; id: string }
  | { type: 'ADD_CATEGORY'; category: Omit<Category, 'id'> }
  | { type: 'UPDATE_CATEGORY'; category: Category }
  | { type: 'DELETE_CATEGORY'; id: string }
  | { type: 'UPDATE_CONFIG'; config: Partial<MatriceConfig> };
