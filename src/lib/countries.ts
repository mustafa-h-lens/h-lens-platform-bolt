import { supabase } from './supabaseClient';

export interface Country {
  id: string;
  flag: string;
  nationality_ar: string;
  nationality_en: string;
  country_name_ar: string;
  country_name_en: string;
  iso_code: string;
  phone_code: string;
  sort_order: number;
}

let countriesCache: Country[] | null = null;

export const fetchCountries = async (): Promise<Country[]> => {
  if (countriesCache) {
    return countriesCache;
  }

  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching countries:', error);
    return [];
  }

  countriesCache = data || [];
  return countriesCache;
};

export const getCountryByIsoCode = async (isoCode: string): Promise<Country | null> => {
  const countries = await fetchCountries();
  return countries.find(c => c.iso_code === isoCode) || null;
};

export const getCountryByPhoneCode = async (phoneCode: string): Promise<Country | null> => {
  const countries = await fetchCountries();
  return countries.find(c => c.phone_code === phoneCode) || null;
};

export const getNationalityOptions = async (language: 'ar' | 'en' = 'ar'): Promise<Array<{ value: string; label: string }>> => {
  const countries = await fetchCountries();
  return countries.map(c => ({
    value: language === 'ar' ? c.nationality_ar : c.nationality_en,
    label: `${c.flag} ${language === 'ar' ? c.nationality_ar : c.nationality_en}`,
  }));
};

export const getCountryOptions = async (language: 'ar' | 'en' = 'ar'): Promise<Array<{ value: string; label: string }>> => {
  const countries = await fetchCountries();
  return countries.map(c => ({
    value: language === 'ar' ? c.country_name_ar : c.country_name_en,
    label: `${c.flag} ${language === 'ar' ? c.country_name_ar : c.country_name_en}`,
  }));
};

export const getPhoneCodeOptions = async (): Promise<Array<{ value: string; label: string }>> => {
  const countries = await fetchCountries();
  const uniquePhoneCodes = Array.from(new Set(countries.map(c => c.phone_code)));

  return uniquePhoneCodes.map(code => {
    const country = countries.find(c => c.phone_code === code)!;
    return {
      value: code,
      label: `${country.flag} ${code}`,
    };
  });
};

export const clearCountriesCache = () => {
  countriesCache = null;
};
