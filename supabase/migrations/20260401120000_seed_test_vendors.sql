-- Seed test vendors for Half Lens Platform
-- Maps specialties to existing vendor_fields subcategories

DO $$
DECLARE
  field_monteer uuid;
  field_video_cam uuid;
  field_photo uuid;
  field_content_creator uuid;
  field_camera_assist uuid;
BEGIN
  -- Look up field IDs by name
  SELECT id INTO field_monteer FROM vendor_fields WHERE name_ar = 'مونتير' AND parent_id IS NOT NULL LIMIT 1;
  SELECT id INTO field_video_cam FROM vendor_fields WHERE name_ar = 'مصور كاميرا' AND parent_id IS NOT NULL LIMIT 1;
  SELECT id INTO field_photo FROM vendor_fields WHERE name_ar = 'مصور فوتوغرافي' AND parent_id IS NOT NULL LIMIT 1;
  SELECT id INTO field_content_creator FROM vendor_fields WHERE name_ar = 'صانع محتوى' AND parent_id IS NOT NULL LIMIT 1;
  SELECT id INTO field_camera_assist FROM vendor_fields WHERE name_ar = 'مساعد كاميرا أول' AND parent_id IS NOT NULL LIMIT 1;

  -- Insert vendors
  INSERT INTO vendors (id, full_name, phone, email, status, vendor_type, primary_field, primary_city, nationality)
  VALUES
    (gen_random_uuid(), 'حسن محمد صغير', '0501234001', 'hasan.saghir@halflens.test', 'active', 'individual', 'مونتير', 'جدة', 'سعودي'),
    (gen_random_uuid(), 'مازن صالح باطهف', '0501234002', 'mazen.batahf@halflens.test', 'active', 'individual', 'مصور فيديو', 'جدة', 'سعودي'),
    (gen_random_uuid(), 'احمد بارجاء', '0501234003', 'ahmed.barjaa@halflens.test', 'active', 'individual', 'مصور فوتو', 'جدة', 'سعودي'),
    (gen_random_uuid(), 'ريان بن سويدان', '0501234004', 'rayan.suwaidan@halflens.test', 'active', 'individual', 'مصور ريلز', 'الرياض', 'سعودي'),
    (gen_random_uuid(), 'الياس جميل', '0501234005', 'elyas.jameel@halflens.test', 'active', 'individual', 'مساعد مصور', 'جدة', 'سعودي'),
    (gen_random_uuid(), 'عبدالعزيز الغامدي', '0501234006', 'abdulaziz.ghamdi@halflens.test', 'active', 'individual', 'لوجيستك', 'جدة', 'سعودي'),
    (gen_random_uuid(), 'المالية طيران', '0501234007', 'travel@halflens.test', 'active', 'company', 'طيران', 'جدة', NULL),
    (gen_random_uuid(), 'جواد السباعي', '0501234008', 'jawad.sibaei@halflens.test', 'active', 'individual', 'مونتير', 'جدة', 'سعودي'),
    (gen_random_uuid(), 'حمد التويجري', '0501234009', 'hamad.tuwaijri@halflens.test', 'active', 'individual', 'مصور فيديو', 'الرياض', 'سعودي'),
    (gen_random_uuid(), 'امين السقاف', '0501234010', 'ameen.saqqaf@halflens.test', 'active', 'individual', 'مصور فيديو', 'جدة', 'سعودي'),
    (gen_random_uuid(), 'عبدالهادي العتيبي', '0501234011', 'abdulhadi.otaibi@halflens.test', 'active', 'individual', 'مصور فوتو', 'الرياض', 'سعودي');

  -- Link vendors to their vendor_fields (selected_fields)
  -- مونتيرين
  INSERT INTO vendor_selected_fields (vendor_id, field_id, rate_from, currency)
  SELECT v.id, field_monteer, NULL, 'SAR'
  FROM vendors v WHERE v.full_name IN ('حسن محمد صغير', 'جواد السباعي') AND field_monteer IS NOT NULL
  ON CONFLICT (vendor_id, field_id) DO NOTHING;

  -- مصورين فيديو → Camera Operator
  INSERT INTO vendor_selected_fields (vendor_id, field_id, rate_from, currency)
  SELECT v.id, field_video_cam, NULL, 'SAR'
  FROM vendors v WHERE v.full_name IN ('مازن صالح باطهف', 'حمد التويجري', 'امين السقاف') AND field_video_cam IS NOT NULL
  ON CONFLICT (vendor_id, field_id) DO NOTHING;

  -- مصورين فوتو → Photographer
  INSERT INTO vendor_selected_fields (vendor_id, field_id, rate_from, currency)
  SELECT v.id, field_photo, NULL, 'SAR'
  FROM vendors v WHERE v.full_name IN ('احمد بارجاء', 'عبدالهادي العتيبي') AND field_photo IS NOT NULL
  ON CONFLICT (vendor_id, field_id) DO NOTHING;

  -- مصور ريلز → Content Creator
  INSERT INTO vendor_selected_fields (vendor_id, field_id, rate_from, currency)
  SELECT v.id, field_content_creator, NULL, 'SAR'
  FROM vendors v WHERE v.full_name = 'ريان بن سويدان' AND field_content_creator IS NOT NULL
  ON CONFLICT (vendor_id, field_id) DO NOTHING;

  -- مساعد مصور → 1st AC
  INSERT INTO vendor_selected_fields (vendor_id, field_id, rate_from, currency)
  SELECT v.id, field_camera_assist, NULL, 'SAR'
  FROM vendors v WHERE v.full_name = 'الياس جميل' AND field_camera_assist IS NOT NULL
  ON CONFLICT (vendor_id, field_id) DO NOTHING;

END $$;
