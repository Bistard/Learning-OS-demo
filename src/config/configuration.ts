import config from './config.json';
import { AppConfiguration } from '../models/learningOsModel';

export const defaultConfiguration: AppConfiguration = {
  notePreviewEnabled: Boolean(config.notePreviewEnabled),
};
