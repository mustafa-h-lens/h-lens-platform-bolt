/*
  Seed KSA cities into cities table
  Covers all 13 administrative regions
*/

INSERT INTO cities (name, name_en, region, is_active) VALUES
  -- الرياض
  ('الرياض', 'Riyadh', 'الرياض', true),
  ('الخرج', 'Al Kharj', 'الرياض', true),
  ('الدوادمي', 'Ad Dawadimi', 'الرياض', true),
  ('المجمعة', 'Al Majmaah', 'الرياض', true),
  ('شقراء', 'Shaqra', 'الرياض', true),
  ('وادي الدواسر', 'Wadi Ad Dawasir', 'الرياض', true),
  ('الزلفي', 'Az Zulfi', 'الرياض', true),
  ('عفيف', 'Afif', 'الرياض', true),
  ('الدرعية', 'Diriyah', 'الرياض', true),
  ('رماح', 'Rumah', 'الرياض', true),
  ('ثادق', 'Thadiq', 'الرياض', true),
  ('حوطة بني تميم', 'Hotat Bani Tamim', 'الرياض', true),
  ('الحريق', 'Al Hariq', 'الرياض', true),
  ('المزاحمية', 'Al Muzahimiyah', 'الرياض', true),
  ('ضرماء', 'Durma', 'الرياض', true),
  ('القويعية', 'Al Quway''iyah', 'الرياض', true),
  ('ساجر', 'Sajir', 'الرياض', true),
  -- مكة المكرمة
  ('جدة', 'Jeddah', 'مكة المكرمة', true),
  ('مكة المكرمة', 'Makkah', 'مكة المكرمة', true),
  ('الطائف', 'Taif', 'مكة المكرمة', true),
  ('رابغ', 'Rabigh', 'مكة المكرمة', true),
  ('القنفذة', 'Al Qunfudhah', 'مكة المكرمة', true),
  ('الليث', 'Al Lith', 'مكة المكرمة', true),
  ('أضم', 'Adham', 'مكة المكرمة', true),
  ('العرضيات', 'Al Ardiyat', 'مكة المكرمة', true),
  ('المخواة', 'Al Makhwah', 'مكة المكرمة', true),
  -- المدينة المنورة
  ('المدينة المنورة', 'Madinah', 'المدينة المنورة', true),
  ('ينبع', 'Yanbu', 'المدينة المنورة', true),
  ('أملج', 'Umluj', 'المدينة المنورة', true),
  ('العلا', 'Al Ula', 'المدينة المنورة', true),
  -- المنطقة الشرقية
  ('الدمام', 'Dammam', 'الشرقية', true),
  ('الخبر', 'Khobar', 'الشرقية', true),
  ('الظهران', 'Dhahran', 'الشرقية', true),
  ('الجبيل', 'Jubail', 'الشرقية', true),
  ('القطيف', 'Qatif', 'الشرقية', true),
  ('الأحساء', 'Al Ahsa', 'الشرقية', true),
  ('الهفوف', 'Al Hofuf', 'الشرقية', true),
  ('حفر الباطن', 'Hafar Al Batin', 'الشرقية', true),
  -- القصيم
  ('بريدة', 'Buraidah', 'القصيم', true),
  ('عنيزة', 'Unaizah', 'القصيم', true),
  ('الرس', 'Ar Rass', 'القصيم', true),
  ('البكيرية', 'Al Bukayriyah', 'القصيم', true),
  ('المذنب', 'Al Mithnab', 'القصيم', true),
  -- عسير
  ('أبها', 'Abha', 'عسير', true),
  ('خميس مشيط', 'Khamis Mushait', 'عسير', true),
  ('أحد رفيدة', 'Ahad Rafidah', 'عسير', true),
  ('محايل عسير', 'Muhayil Asir', 'عسير', true),
  ('سراة عبيدة', 'Sarat Abidah', 'عسير', true),
  ('رجال ألمع', 'Rejal Almaa', 'عسير', true),
  ('النماص', 'An Namas', 'عسير', true),
  ('تنومة', 'Tanomah', 'عسير', true),
  ('بيشة', 'Bisha', 'عسير', true),
  ('البلسمر', 'Al Balsmar', 'عسير', true),
  -- تبوك
  ('تبوك', 'Tabuk', 'تبوك', true),
  ('تيماء', 'Tayma', 'تبوك', true),
  ('ضباء', 'Duba', 'تبوك', true),
  ('الوجه', 'Al Wajh', 'تبوك', true),
  ('أملج', 'Umluj', 'تبوك', true),
  -- حائل
  ('حائل', 'Hail', 'حائل', true),
  -- الحدود الشمالية
  ('عرعر', 'Arar', 'الحدود الشمالية', true),
  ('رفحاء', 'Rafha', 'الحدود الشمالية', true),
  ('طريف', 'Turaif', 'الحدود الشمالية', true),
  -- جازان
  ('جازان', 'Jazan', 'جازان', true),
  ('صبيا', 'Sabya', 'جازان', true),
  ('أحد المسارحة', 'Ahad Al Masarihah', 'جازان', true),
  ('العيدابي', 'Al Idabi', 'جازان', true),
  ('بيش', 'Baysh', 'جازان', true),
  ('الريث', 'Ar Rayth', 'جازان', true),
  ('ضمد', 'Damad', 'جازان', true),
  ('الطوال', 'At Tuwal', 'جازان', true),
  -- نجران
  ('نجران', 'Najran', 'نجران', true),
  -- الباحة
  ('الباحة', 'Al Baha', 'الباحة', true),
  ('المندق', 'Al Mandaq', 'الباحة', true),
  -- الجوف
  ('سكاكا', 'Sakakah', 'الجوف', true),
  ('القريات', 'Al Qurayyat', 'الجوف', true),
  ('ليلى', 'Layla', 'الجوف', true)
ON CONFLICT (name) DO NOTHING;

-- Allow anon to read cities (for registration form)
DROP POLICY IF EXISTS "Anyone can read cities" ON cities;
CREATE POLICY "Anyone can read cities"
  ON cities FOR SELECT
  TO authenticated, anon
  USING (true);
