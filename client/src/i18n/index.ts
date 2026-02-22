import { ref } from 'vue';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';
import i18nApi from '@/api/i18n';

export type Locale = 'zh-CN' | 'en-US';

export interface I18nMessages {
  [key: string]: string | I18nMessages;
}

const messages: Record<Locale, I18nMessages> = {
  'zh-CN': { ...(zhCN as I18nMessages) },
  'en-US': { ...(enUS as I18nMessages) },
};

const LOCALE_KEY = 'app_locale';

export const currentLocale = ref<Locale>(
  (localStorage.getItem(LOCALE_KEY) as Locale) || 'zh-CN',
);

function lookupKey(obj: I18nMessages, key: string): string | I18nMessages | undefined {
  return obj[key];
}

function getNestedValue(obj: I18nMessages, path: string): string {
  const keys = path.split('.');
  let result: string | I18nMessages = obj;
  for (const key of keys) {
    if (typeof result !== 'object') return path;
    const next = lookupKey(result, key);
    if (next === undefined) return path;
    result = next;
  }
  return typeof result === 'string' ? result : path;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const translation = getNestedValue(messages[currentLocale.value], key);
  if (!params) return translation;
  return translation.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export async function setLocale(locale: Locale): Promise<void> {
  try {
    const remote = await i18nApi.getTranslations(locale);
    messages[locale] = { ...messages[locale], ...(remote as I18nMessages) };
  } catch {
    // 后端不可用时使用本地翻译
  }
  currentLocale.value = locale;
  localStorage.setItem(LOCALE_KEY, locale);
}

export function getLocale(): Locale {
  return currentLocale.value;
}

export function getAvailableLocales(): Locale[] {
  return ['zh-CN', 'en-US'];
}

export default { t, setLocale, getLocale, getAvailableLocales, currentLocale };
