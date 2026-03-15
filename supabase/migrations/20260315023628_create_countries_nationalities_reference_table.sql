/*
  # Create Countries and Nationalities Reference Table

  1. New Tables
    - `countries`
      - `id` (uuid, primary key)
      - `flag` (text) - emoji flag
      - `nationality_ar` (text) - Arabic nationality name
      - `nationality_en` (text) - English nationality name
      - `country_name_ar` (text) - Arabic country name
      - `country_name_en` (text) - English country name
      - `iso_code` (text, unique) - ISO 3166-1 alpha-2 code
      - `phone_code` (text) - International dialing code
      - `sort_order` (integer) - For custom ordering (Gulf countries first)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `countries` table
    - Add policy for public read access (reference data)
    - Only authenticated users can modify (admin-only in practice)

  3. Data
    - Pre-populate with comprehensive list of countries
    - Gulf countries first, then alphabetically by region
*/

CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag text NOT NULL,
  nationality_ar text NOT NULL,
  nationality_en text NOT NULL,
  country_name_ar text NOT NULL,
  country_name_en text NOT NULL,
  iso_code text UNIQUE NOT NULL,
  phone_code text NOT NULL,
  sort_order integer NOT NULL DEFAULT 999,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view countries"
  ON countries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage countries"
  ON countries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert countries data with proper ordering
-- Gulf countries (1-7), Arab countries (8-14), Middle East (15-23), South Asia (24-30), Southeast Asia (31-37), etc.

INSERT INTO countries (flag, nationality_ar, nationality_en, country_name_ar, country_name_en, iso_code, phone_code, sort_order) VALUES
-- Gulf Cooperation Council
('🇸🇦', 'سعودي', 'Saudi', 'السعودية', 'Saudi Arabia', 'SA', '+966', 1),
('🇦🇪', 'إماراتي', 'Emirati', 'الإمارات', 'United Arab Emirates', 'AE', '+971', 2),
('🇰🇼', 'كويتي', 'Kuwaiti', 'الكويت', 'Kuwait', 'KW', '+965', 3),
('🇶🇦', 'قطري', 'Qatari', 'قطر', 'Qatar', 'QA', '+974', 4),
('🇧🇭', 'بحريني', 'Bahraini', 'البحرين', 'Bahrain', 'BH', '+973', 5),
('🇴🇲', 'عماني', 'Omani', 'عمان', 'Oman', 'OM', '+968', 6),
('🇾🇪', 'يمني', 'Yemeni', 'اليمن', 'Yemen', 'YE', '+967', 7),

-- Arab Countries
('🇪🇬', 'مصري', 'Egyptian', 'مصر', 'Egypt', 'EG', '+20', 10),
('🇸🇩', 'سوداني', 'Sudanese', 'السودان', 'Sudan', 'SD', '+249', 11),
('🇸🇾', 'سوري', 'Syrian', 'سوريا', 'Syria', 'SY', '+963', 12),
('🇱🇧', 'لبناني', 'Lebanese', 'لبنان', 'Lebanon', 'LB', '+961', 13),
('🇯🇴', 'أردني', 'Jordanian', 'الأردن', 'Jordan', 'JO', '+962', 14),
('🇵🇸', 'فلسطيني', 'Palestinian', 'فلسطين', 'Palestine', 'PS', '+970', 15),
('🇮🇶', 'عراقي', 'Iraqi', 'العراق', 'Iraq', 'IQ', '+964', 16),
('🇲🇦', 'مغربي', 'Moroccan', 'المغرب', 'Morocco', 'MA', '+212', 17),
('🇩🇿', 'جزائري', 'Algerian', 'الجزائر', 'Algeria', 'DZ', '+213', 18),
('🇹🇳', 'تونسي', 'Tunisian', 'تونس', 'Tunisia', 'TN', '+216', 19),
('🇱🇾', 'ليبي', 'Libyan', 'ليبيا', 'Libya', 'LY', '+218', 20),
('🇲🇷', 'موريتاني', 'Mauritanian', 'موريتانيا', 'Mauritania', 'MR', '+222', 21),

-- Middle East & Turkey
('🇹🇷', 'تركي', 'Turkish', 'تركيا', 'Turkey', 'TR', '+90', 30),
('🇮🇷', 'إيراني', 'Iranian', 'إيران', 'Iran', 'IR', '+98', 31),

-- South Asia
('🇵🇰', 'باكستاني', 'Pakistani', 'باكستان', 'Pakistan', 'PK', '+92', 40),
('🇮🇳', 'هندي', 'Indian', 'الهند', 'India', 'IN', '+91', 41),
('🇧🇩', 'بنغلاديشي', 'Bangladeshi', 'بنغلاديش', 'Bangladesh', 'BD', '+880', 42),
('🇳🇵', 'نيبالي', 'Nepali', 'نيبال', 'Nepal', 'NP', '+977', 43),
('🇱🇰', 'سريلانكي', 'Sri Lankan', 'سريلانكا', 'Sri Lanka', 'LK', '+94', 44),
('🇦🇫', 'أفغاني', 'Afghan', 'أفغانستان', 'Afghanistan', 'AF', '+93', 45),

-- Southeast Asia
('🇵🇭', 'فلبيني', 'Filipino', 'الفلبين', 'Philippines', 'PH', '+63', 50),
('🇮🇩', 'إندونيسي', 'Indonesian', 'إندونيسيا', 'Indonesia', 'ID', '+62', 51),
('🇲🇾', 'ماليزي', 'Malaysian', 'ماليزيا', 'Malaysia', 'MY', '+60', 52),
('🇹🇭', 'تايلندي', 'Thai', 'تايلاند', 'Thailand', 'TH', '+66', 53),
('🇻🇳', 'فيتنامي', 'Vietnamese', 'فيتنام', 'Vietnam', 'VN', '+84', 54),

-- East Asia
('🇨🇳', 'صيني', 'Chinese', 'الصين', 'China', 'CN', '+86', 60),
('🇯🇵', 'ياباني', 'Japanese', 'اليابان', 'Japan', 'JP', '+81', 61),
('🇰🇷', 'كوري جنوبي', 'South Korean', 'كوريا الجنوبية', 'South Korea', 'KR', '+82', 62),
('🇲🇳', 'منغولي', 'Mongolian', 'منغوليا', 'Mongolia', 'MN', '+976', 63),

-- Central Asia
('🇰🇿', 'كازاخستاني', 'Kazakh', 'كازاخستان', 'Kazakhstan', 'KZ', '+7', 70),
('🇺🇿', 'أوزبكي', 'Uzbek', 'أوزبكستان', 'Uzbekistan', 'UZ', '+998', 71),
('🇹🇯', 'طاجيكي', 'Tajik', 'طاجيكستان', 'Tajikistan', 'TJ', '+992', 72),
('🇰🇬', 'قرغيزي', 'Kyrgyz', 'قرغيزستان', 'Kyrgyzstan', 'KG', '+996', 73),
('🇹🇲', 'تركماني', 'Turkmen', 'تركمانستان', 'Turkmenistan', 'TM', '+993', 74),

-- Caucasus
('🇦🇿', 'أذربيجاني', 'Azerbaijani', 'أذربيجان', 'Azerbaijan', 'AZ', '+994', 80),
('🇦🇲', 'أرمني', 'Armenian', 'أرمينيا', 'Armenia', 'AM', '+374', 81),
('🇬🇪', 'جورجي', 'Georgian', 'جورجيا', 'Georgia', 'GE', '+995', 82),

-- Eastern Europe
('🇷🇺', 'روسي', 'Russian', 'روسيا', 'Russia', 'RU', '+7', 90),
('🇺🇦', 'أوكراني', 'Ukrainian', 'أوكرانيا', 'Ukraine', 'UA', '+380', 91),
('🇧🇾', 'بيلاروسي', 'Belarusian', 'بيلاروسيا', 'Belarus', 'BY', '+375', 92),
('🇲🇩', 'مولدوفي', 'Moldovan', 'مولدوفا', 'Moldova', 'MD', '+373', 93),
('🇵🇱', 'بولندي', 'Polish', 'بولندا', 'Poland', 'PL', '+48', 94),
('🇨🇿', 'تشيكي', 'Czech', 'التشيك', 'Czech Republic', 'CZ', '+420', 95),
('🇸🇰', 'سلوفاكي', 'Slovak', 'سلوفاكيا', 'Slovakia', 'SK', '+421', 96),
('🇭🇺', 'مجري', 'Hungarian', 'المجر', 'Hungary', 'HU', '+36', 97),
('🇷🇴', 'روماني', 'Romanian', 'رومانيا', 'Romania', 'RO', '+40', 98),
('🇧🇬', 'بلغاري', 'Bulgarian', 'بلغاريا', 'Bulgaria', 'BG', '+359', 99),

-- Balkans
('🇬🇷', 'يوناني', 'Greek', 'اليونان', 'Greece', 'GR', '+30', 100),
('🇨🇾', 'قبرصي', 'Cypriot', 'قبرص', 'Cyprus', 'CY', '+357', 101),
('🇸🇮', 'سلوفيني', 'Slovenian', 'سلوفينيا', 'Slovenia', 'SI', '+386', 102),
('🇭🇷', 'كرواتي', 'Croatian', 'كرواتيا', 'Croatia', 'HR', '+385', 103),
('🇧🇦', 'بوسني', 'Bosnian', 'البوسنة', 'Bosnia and Herzegovina', 'BA', '+387', 104),
('🇷🇸', 'صربي', 'Serbian', 'صربيا', 'Serbia', 'RS', '+381', 105),
('🇲🇪', 'مونتينيغري', 'Montenegrin', 'الجبل الأسود', 'Montenegro', 'ME', '+382', 106),
('🇦🇱', 'ألباني', 'Albanian', 'ألبانيا', 'Albania', 'AL', '+355', 107),
('🇲🇰', 'مقدوني', 'Macedonian', 'مقدونيا', 'North Macedonia', 'MK', '+389', 108),

-- Western Europe
('🇬🇧', 'بريطاني', 'British', 'بريطانيا', 'United Kingdom', 'GB', '+44', 110),
('🇮🇪', 'أيرلندي', 'Irish', 'أيرلندا', 'Ireland', 'IE', '+353', 111),
('🇫🇷', 'فرنسي', 'French', 'فرنسا', 'France', 'FR', '+33', 112),
('🇩🇪', 'ألماني', 'German', 'ألمانيا', 'Germany', 'DE', '+49', 113),
('🇳🇱', 'هولندي', 'Dutch', 'هولندا', 'Netherlands', 'NL', '+31', 114),
('🇧🇪', 'بلجيكي', 'Belgian', 'بلجيكا', 'Belgium', 'BE', '+32', 115),
('🇱🇺', 'لوكسمبورغي', 'Luxembourgish', 'لوكسمبورغ', 'Luxembourg', 'LU', '+352', 116),
('🇨🇭', 'سويسري', 'Swiss', 'سويسرا', 'Switzerland', 'CH', '+41', 117),
('🇦🇹', 'نمساوي', 'Austrian', 'النمسا', 'Austria', 'AT', '+43', 118),

-- Southern Europe
('🇪🇸', 'إسباني', 'Spanish', 'إسبانيا', 'Spain', 'ES', '+34', 120),
('🇵🇹', 'برتغالي', 'Portuguese', 'البرتغال', 'Portugal', 'PT', '+351', 121),
('🇮🇹', 'إيطالي', 'Italian', 'إيطاليا', 'Italy', 'IT', '+39', 122),

-- Nordic Countries
('🇸🇪', 'سويدي', 'Swedish', 'السويد', 'Sweden', 'SE', '+46', 130),
('🇳🇴', 'نرويجي', 'Norwegian', 'النرويج', 'Norway', 'NO', '+47', 131),
('🇩🇰', 'دنماركي', 'Danish', 'الدنمارك', 'Denmark', 'DK', '+45', 132),
('🇫🇮', 'فنلندي', 'Finnish', 'فنلندا', 'Finland', 'FI', '+358', 133),
('🇮🇸', 'آيسلندي', 'Icelandic', 'آيسلندا', 'Iceland', 'IS', '+354', 134),

-- North America
('🇺🇸', 'أمريكي', 'American', 'الولايات المتحدة', 'United States', 'US', '+1', 140),
('🇨🇦', 'كندي', 'Canadian', 'كندا', 'Canada', 'CA', '+1', 141),
('🇲🇽', 'مكسيكي', 'Mexican', 'المكسيك', 'Mexico', 'MX', '+52', 142),

-- South America
('🇧🇷', 'برازيلي', 'Brazilian', 'البرازيل', 'Brazil', 'BR', '+55', 150),
('🇦🇷', 'أرجنتيني', 'Argentine', 'الأرجنتين', 'Argentina', 'AR', '+54', 151),
('🇨🇱', 'تشيلي', 'Chilean', 'تشيلي', 'Chile', 'CL', '+56', 152),
('🇵🇪', 'بيروفي', 'Peruvian', 'بيرو', 'Peru', 'PE', '+51', 153),
('🇨🇴', 'كولومبي', 'Colombian', 'كولومبيا', 'Colombia', 'CO', '+57', 154),
('🇻🇪', 'فنزويلي', 'Venezuelan', 'فنزويلا', 'Venezuela', 'VE', '+58', 155),
('🇺🇾', 'أوروغواي', 'Uruguayan', 'أوروغواي', 'Uruguay', 'UY', '+598', 156),
('🇵🇾', 'باراغواي', 'Paraguayan', 'باراغواي', 'Paraguay', 'PY', '+595', 157),
('🇧🇴', 'بوليفي', 'Bolivian', 'بوليفيا', 'Bolivia', 'BO', '+591', 158),
('🇪🇨', 'إكوادوري', 'Ecuadorian', 'الإكوادور', 'Ecuador', 'EC', '+593', 159),

-- Oceania
('🇦🇺', 'أسترالي', 'Australian', 'أستراليا', 'Australia', 'AU', '+61', 160),
('🇳🇿', 'نيوزيلندي', 'New Zealander', 'نيوزيلندا', 'New Zealand', 'NZ', '+64', 161),

-- Africa
('🇸🇴', 'صومالي', 'Somali', 'الصومال', 'Somalia', 'SO', '+252', 170),
('🇩🇯', 'جيبوتي', 'Djiboutian', 'جيبوتي', 'Djibouti', 'DJ', '+253', 171),
('🇪🇷', 'إريتري', 'Eritrean', 'إريتريا', 'Eritrea', 'ER', '+291', 172),
('🇪🇹', 'إثيوبي', 'Ethiopian', 'إثيوبيا', 'Ethiopia', 'ET', '+251', 173),
('🇰🇪', 'كيني', 'Kenyan', 'كينيا', 'Kenya', 'KE', '+254', 174),
('🇹🇿', 'تنزاني', 'Tanzanian', 'تنزانيا', 'Tanzania', 'TZ', '+255', 175),
('🇺🇬', 'أوغندي', 'Ugandan', 'أوغندا', 'Uganda', 'UG', '+256', 176),
('🇷🇼', 'رواندي', 'Rwandan', 'رواندا', 'Rwanda', 'RW', '+250', 177),
('🇧🇮', 'بوروندي', 'Burundian', 'بوروندي', 'Burundi', 'BI', '+257', 178),
('🇨🇩', 'كونغولي', 'Congolese', 'الكونغو', 'DR Congo', 'CD', '+243', 179),
('🇨🇲', 'كاميروني', 'Cameroonian', 'الكاميرون', 'Cameroon', 'CM', '+237', 180),
('🇳🇬', 'نيجيري', 'Nigerian', 'نيجيريا', 'Nigeria', 'NG', '+234', 181),
('🇬🇭', 'غاني', 'Ghanaian', 'غانا', 'Ghana', 'GH', '+233', 182),
('🇸🇳', 'سنغالي', 'Senegalese', 'السنغال', 'Senegal', 'SN', '+221', 183),
('🇿🇦', 'جنوب أفريقي', 'South African', 'جنوب أفريقيا', 'South Africa', 'ZA', '+27', 184),
('🇲🇬', 'مدغشقري', 'Malagasy', 'مدغشقر', 'Madagascar', 'MG', '+261', 185),
('🇸🇨', 'سيشلي', 'Seychellois', 'سيشل', 'Seychelles', 'SC', '+248', 186)
ON CONFLICT (iso_code) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_countries_iso_code ON countries(iso_code);
CREATE INDEX IF NOT EXISTS idx_countries_sort_order ON countries(sort_order);
