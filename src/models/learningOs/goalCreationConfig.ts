import presetData from '../../data/goalCreation/presets.json';
import dimensionData from '../../data/goalCreation/advancedDimensions.json';
import subjectData from '../../data/goalCreation/subjects.json';
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

export const goalCreationPresets: GoalCreationPreset[] = presetData as GoalCreationPreset[];
export const goalCreationDimensions: GoalAdvancedDimension[] =
  dimensionData as GoalAdvancedDimension[];
export const goalCreationSubjects: GoalSubjectOption[] = subjectData as GoalSubjectOption[];

export const getGoalCreationPreset = (presetId: string): GoalCreationPreset => {
  return goalCreationPresets.find((preset) => preset.id === presetId) ?? goalCreationPresets[0];
};

export const getGoalCreationSubject = (subjectId: string): GoalSubjectOption => {
  return goalCreationSubjects.find((subject) => subject.id === subjectId) ?? goalCreationSubjects[0];
};

export const ensureAdvancedSettings = (
  settings?: GoalAdvancedSettings,
  presetId?: string
): GoalAdvancedSettings => {
  const source = { ...(settings ?? {}) };
  const preset = getGoalCreationPreset(presetId ?? goalCreationPresets[0].id);
  const defaults = preset.advancedDefaults ?? {};
  goalCreationDimensions.forEach((dimension) => {
    if (!source[dimension.id]) {
      source[dimension.id] =
        defaults[dimension.id] ?? dimension.options[0]?.id ?? '';
    }
  });
  return source;
};

export const getDefaultPreset = (): GoalCreationPreset => goalCreationPresets[0];
export const getDefaultSubject = (): GoalSubjectOption => goalCreationSubjects[0];
