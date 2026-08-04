import { computed, type Ref } from 'vue';
import zhCN from '../i18n/zh-CN';
import enUS from '../i18n/en-US';

const locales: Record<string, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export function useI18n(locale: Ref<string> | string) {
  const resolvedLocale = computed(() => {
    const l = typeof locale === 'string' ? locale : locale.value;
    return l && l in locales ? l : 'en-US';
  });

  function t(key: string): string {
    const dict = locales[resolvedLocale.value];
    return dict?.[key] ?? key;
  }

  return { t };
}
