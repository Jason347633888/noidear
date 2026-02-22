import request from './request';

export type Locale = 'zh-CN' | 'en-US';

export interface Translations {
  [key: string]: string | Translations;
}

export default {
  getTranslations(locale: Locale): Promise<Translations> {
    return request.get(`/i18n/translations/${locale}`);
  },

  updateTranslations(locale: Locale, translations: Translations): Promise<void> {
    return request.post('/i18n/translations', { locale, translations });
  },
};
