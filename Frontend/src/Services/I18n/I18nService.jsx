import { createContext, useContext, useMemo, useState } from "react";

import en from "./en.json";

const DEFAULT_LANGUAGE = "en";

const translations = {
  en,
};

const I18nContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key, fallback) => fallback ?? key,
});

const getNestedValue = (object, key) => {
  return key.split(".").reduce((currentValue, currentKey) => {
    if (currentValue && typeof currentValue === "object") {
      return currentValue[currentKey];
    }

    return undefined;
  }, object);
};

const interpolate = (template, values = {}) => {
  return Object.entries(values).reduce((message, [key, value]) => {
    return message.replaceAll(`{{${key}}}`, String(value));
  }, template);
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  const value = useMemo(() => {
    const dictionary = translations[language] || translations[DEFAULT_LANGUAGE];

    const t = (key, fallback, values) => {
      const translatedValue = getNestedValue(dictionary, key);

      if (typeof translatedValue === "string") {
        return interpolate(translatedValue, values);
      }

      const fallbackValue = fallback ?? key;

      return typeof fallbackValue === "string"
        ? interpolate(fallbackValue, values)
        : fallbackValue;
    };

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  return useContext(I18nContext);
};
