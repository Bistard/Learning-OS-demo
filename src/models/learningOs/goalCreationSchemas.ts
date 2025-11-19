/**
 * Shared type definitions for goal creation mock data (presets, subjects, dimensions).
 */
import { GoalAdvancedSettings } from './types';

export interface GoalSubjectOption {
  id: string;
  label: string;
  status: 'available' | 'coming-soon';
  meta?: string;
}

export interface GoalCreationPreset {
  id: string;
  label: string;
  description: string;
  systemFocus: string;
  ragFocus: string;
  defaultMastery: number;
  defaultDailyMinutes: number;
  advancedDefaults: GoalAdvancedSettings;
}

export interface GoalAdvancedDimensionOption {
  id: string;
  label: string;
  summary: string;
}

export interface GoalAdvancedDimension {
  id: string;
  label: string;
  description: string;
  options: GoalAdvancedDimensionOption[];
}
