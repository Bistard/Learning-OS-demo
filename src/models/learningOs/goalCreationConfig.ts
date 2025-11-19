import { GoalAdvancedSettings } from './types';
import {
  GoalAdvancedDimension,
  GoalCreationPreset,
  GoalSubjectOption,
} from './goalCreationSchemas';
import { getGoalDataset, toGoalSubjectOptions } from './categoryRegistry';

const defaultGoalDataset = getGoalDataset();

export const goalCreationPresets: GoalCreationPreset[] = defaultGoalDataset.presets;
export const goalCreationDimensions: GoalAdvancedDimension[] =
  defaultGoalDataset.advancedDimensions;
export const goalCreationSubjects: GoalSubjectOption[] = toGoalSubjectOptions();

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
export type {
  GoalSubjectOption,
  GoalCreationPreset,
  GoalAdvancedDimension,
} from './goalCreationSchemas';
