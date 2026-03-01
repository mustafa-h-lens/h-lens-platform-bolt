import { motion } from 'framer-motion';
import { VendorFormData, SelectedField } from '../VendorRegistrationForm';
import { Edit2, CheckCircle, Briefcase } from 'lucide-react';

interface Props {
  formData: VendorFormData;
  goToStep: (step: number) => void;
}

export const Step6Review = ({ formData, goToStep }: Props) => {
  const sections = [
    {
      title: 'المعلومات الأساسية',
      step: 1,
      items: [
        { label: 'الاسم الكامل', value: formData.full_name },
        { label: 'الجنسية', value: formData.nationality },
        { label: 'النوع', value: formData.vendor_type === 'individual' ? 'فرد' : 'شركة' },
      ],
    },
    {
      title: 'معلومات التواصل',
      step: 2,
      items: [
        { label: 'رقم الجوال', value: `${formData.country_code}${formData.phone}` },
        { label: 'المدينة الأساسية', value: formData.primary_city },
        {
          label: 'متاح في مدن أخرى',
          value: formData.available_other_cities ? 'نعم' : 'لا',
        },
        ...(formData.available_other_cities && formData.other_cities?.length
          ? [{ label: 'المدن الأخرى', value: formData.other_cities.join('، ') }]
          : []),
      ],
    },
    {
      title: 'المستندات الثبوتية',
      step: 3,
      items: [
        { label: 'رقم الهوية', value: formData.id_number },
        {
          label: 'صورة الهوية',
          value: formData.id_image || formData.id_image_url ? '✓ تم الرفع' : 'غير موجود',
        },
        {
          label: 'الصورة الشخصية',
          value: formData.profile_image || formData.profile_image_url ? '✓ تم الرفع' : 'غير موجود',
        },
      ],
    },
    {
      title: 'معلومات السفر',
      step: 4,
      items: [
        { label: 'رقم جواز السفر', value: formData.passport_number || 'غير محدد' },
        { label: 'دولة التأشيرة', value: formData.visa_country || 'غير محدد' },
        {
          label: 'مستند التأشيرة',
          value: formData.visa_file || formData.visa_file_url ? '✓ تم الرفع' : 'غير محدد',
        },
      ],
    },
    {
      title: 'المعلومات المالية',
      step: 5,
      items: [
        { label: 'اسم البنك', value: formData.bank_name },
        { label: 'اسم المستفيد', value: formData.beneficiary_name },
        { label: 'رقم الآيبان', value: formData.iban },
        { label: 'السعر يشمل الضريبة', value: formData.price_includes_tax ? 'نعم' : 'لا' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
          مراجعة البيانات
        </h2>
        <p style={{ color: 'var(--vr-text-secondary)' }}>
          تأكد من صحة جميع المعلومات قبل الإرسال
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-6 rounded-xl"
        style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
      >
        <CheckCircle className="w-8 h-8 mb-3" style={{ color: 'var(--vr-success)' }} />
        <h3 className="font-semibold mb-2" style={{ color: 'var(--vr-text-primary)' }}>
          أنت على وشك الانتهاء!
        </h3>
        <p className="text-sm" style={{ color: 'var(--vr-text-secondary)' }}>
          راجع معلوماتك بعناية. يمكنك التعديل على أي قسم بالنقر على زر "تعديل"
        </p>
      </motion.div>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            className="vr-glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--vr-text-primary)' }}>
                {section.title}
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => goToStep(section.step)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--vr-primary)',
                }}
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm font-medium">تعديل</span>
              </motion.button>
            </div>

            <div className="space-y-3">
              {section.items.map((item) => (
                <div key={item.label} className="flex justify-between items-start">
                  <span className="text-sm" style={{ color: 'var(--vr-text-muted)' }}>
                    {item.label}
                  </span>
                  <span
                    className="text-sm font-medium text-right"
                    style={{ color: 'var(--vr-text-primary)', maxWidth: '60%' }}
                  >
                    {item.value || '-'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {formData.selected_fields && formData.selected_fields.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + sections.length * 0.05 }}
            className="vr-glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--vr-text-primary)' }}>
                مجالات العمل والأسعار
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => goToStep(6)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--vr-primary)',
                }}
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm font-medium">تعديل</span>
              </motion.button>
            </div>

            <div className="space-y-3">
              {formData.selected_fields.map((field: SelectedField) => (
                <div
                  key={field.field_id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--vr-primary)' }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--vr-text-primary)' }}>
                        {field.field_name_ar}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--vr-text-muted)' }}>
                        {field.field_name_en}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--vr-success)' }}>
                    {field.rate_from} - {field.rate_to} ريال
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-6 rounded-xl"
        style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="terms"
            className="mt-1 w-5 h-5 rounded"
            style={{ accentColor: 'var(--vr-primary)' }}
          />
          <label htmlFor="terms" className="text-sm" style={{ color: 'var(--vr-text-secondary)' }}>
            أوافق على{' '}
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-all duration-200"
              style={{
                color: 'var(--vr-primary)',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--vr-accent)';
                e.currentTarget.style.textDecorationThickness = '2px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--vr-primary)';
                e.currentTarget.style.textDecorationThickness = '1px';
              }}
            >
              الشروط والأحكام
            </a>{' '}
            وسياسة الخصوصية الخاصة بـ Half Lens. أؤكد أن جميع المعلومات المقدمة صحيحة ودقيقة.
          </label>
        </div>
      </motion.div>
    </div>
  );
};
