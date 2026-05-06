import { useState, useEffect } from 'react';
import { VendorFormData, SelectedField } from '../VendorRegistrationForm';
import { LegalAcceptanceModal } from '../LegalAcceptanceModal';
import { supabase } from '../../../lib/supabaseClient';

interface Props {
  formData: VendorFormData;
  goToStep: (step: number) => void;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  saveDraftNow?: () => void | Promise<void>;
}

export const Step6Review = ({ formData, goToStep, termsAccepted, setTermsAccepted, saveDraftNow }: Props) => {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [equipExpanded, setEquipExpanded] = useState(false);
  const [equipNames, setEquipNames] = useState<Record<string, { name: string; type?: string; brand?: string }>>({});
  void saveDraftNow;

  // Lazy-fetch the names for selected_equipment_ids the first time the section expands.
  useEffect(() => {
    const ids = formData.selected_equipment_ids ?? [];
    if (!equipExpanded || ids.length === 0) return;
    const missing = ids.filter(id => !equipNames[id]);
    if (missing.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('equipment_catalog')
          .select('id, name, equipment_categories(name), equipment_brands(name)')
          .in('id', missing);
        if (!alive || !data) return;
        const next = { ...equipNames };
        for (const row of data as any[]) {
          next[row.id] = {
            name: row.name,
            type: row.equipment_categories?.name,
            brand: row.equipment_brands?.name,
          };
        }
        setEquipNames(next);
      } catch (err) {
        console.error('Step6Review: load equipment names failed', err);
      }
    })();
    return () => { alive = false; };
  }, [equipExpanded, formData.selected_equipment_ids]);

  const vendorTypeLabel = formData.vendor_type === 'individual' ? 'فرد' : formData.vendor_type === 'company' ? 'شركة' : '—';

  return (
    <>
      <h2 className="step-title">✅ المراجعة</h2>
      <p className="step-subtitle">راجع بياناتك قبل إرسال الطلب</p>
      <div className="form-section">
        {/* Identity */}
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-hdr">
              <span className="review-card-title">👤 الهوية</span>
              <button className="review-card-edit" onClick={() => goToStep(1)} type="button">✏️ تعديل</button>
            </div>
            <div className="review-row">
              <span className="rv-label">الاسم</span>
              <span className="rv-value">{formData.full_name || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">الجنسية</span>
              <span className="rv-value">{formData.nationality || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">نوع المورد</span>
              <span className="rv-value">{vendorTypeLabel}</span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-hdr">
              <span className="review-card-title">📞 التواصل</span>
              <button className="review-card-edit" onClick={() => goToStep(2)} type="button">✏️ تعديل</button>
            </div>
            <div className="review-row">
              <span className="rv-label">الجوال</span>
              <span className="rv-value" dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>
                {formData.country_code}{formData.phone || '—'}
              </span>
            </div>
            {formData.email && (
              <div className="review-row">
                <span className="rv-label">البريد</span>
                <span className="rv-value" dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>{formData.email}</span>
              </div>
            )}
            <div className="review-row">
              <span className="rv-label">المدينة</span>
              <span className="rv-value">{formData.primary_city || '—'}</span>
            </div>
            {formData.other_cities && formData.other_cities.length > 0 && (
              <div className="review-row">
                <span className="rv-label">مدن أخرى</span>
                <span className="rv-value">{formData.other_cities.join('، ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-hdr">
              <span className="review-card-title">🪪 المستندات</span>
              <button className="review-card-edit" onClick={() => goToStep(3)} type="button">✏️ تعديل</button>
            </div>
            <div className="review-row">
              <span className="rv-label">رقم الهوية</span>
              <span className="rv-value" dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>{formData.id_number || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">صورة الهوية</span>
              <span className="rv-value">{(formData.id_image || formData.id_image_url) ? '✓ مرفق' : '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">الصورة الشخصية</span>
              <span className="rv-value">{(formData.profile_image || formData.profile_image_url) ? '✓ مرفق' : '—'}</span>
            </div>
          </div>
        </div>

        {/* Travel (conditional) */}
        {(formData.passport_number || formData.visa_country) && (
          <div className="review-section">
            <div className="review-card">
              <div className="review-card-hdr">
                <span className="review-card-title">✈️ السفر</span>
                <button className="review-card-edit" onClick={() => goToStep(4)} type="button">✏️ تعديل</button>
              </div>
              {formData.passport_number && (
                <div className="review-row">
                  <span className="rv-label">جواز السفر</span>
                  <span className="rv-value" dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>{formData.passport_number}</span>
                </div>
              )}
              {formData.visa_country && (
                <div className="review-row">
                  <span className="rv-label">التأشيرات</span>
                  <span className="rv-value">{formData.visa_country}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial */}
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-hdr">
              <span className="review-card-title">🏦 المالية</span>
              <button className="review-card-edit" onClick={() => goToStep(5)} type="button">✏️ تعديل</button>
            </div>
            <div className="review-row">
              <span className="rv-label">البنك</span>
              <span className="rv-value">{(formData as any).bank_name_display || formData.bank_id || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">صاحب الحساب</span>
              <span className="rv-value">{formData.account_name || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">IBAN</span>
              <span className="rv-value" dir="ltr" style={{ fontFamily: 'var(--font-mono)' }}>{formData.iban || '—'}</span>
            </div>
            <div className="review-row">
              <span className="rv-label">شامل الضريبة</span>
              <span className="rv-value">{formData.price_includes_tax ? 'نعم' : 'لا'}</span>
            </div>
          </div>
        </div>

        {/* Selected Fields */}
        {formData.selected_fields && formData.selected_fields.length > 0 && (
          <div className="review-section">
            <div className="review-card">
              <div className="review-card-hdr">
                <span className="review-card-title">💼 المجالات</span>
                <button className="review-card-edit" onClick={() => goToStep(6)} type="button">✏️ تعديل</button>
              </div>
              {formData.portfolio_url && (
                <div className="review-row">
                  <span className="rv-label">البورتفوليو</span>
                  <a className="rv-value" href={formData.portfolio_url} target="_blank" rel="noopener noreferrer" dir="ltr" style={{ color: 'var(--accent-lighter)', textDecoration: 'underline', fontSize: 12 }}>
                    {formData.portfolio_url}
                  </a>
                </div>
              )}
              <div className="review-fields">
                {formData.selected_fields.map((field: SelectedField) => (
                  <span key={field.field_id} className="review-field-tag">
                    {field.field_name_ar} · {field.rate_from}-{field.rate_to} ر.س
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Equipment */}
        {((formData.selected_equipment_ids?.length ?? 0) > 0 || (formData.custom_equipment_text?.length ?? 0) > 0) && (
          <div className="review-section">
            <div className="review-card">
              <div className="review-card-hdr">
                <span className="review-card-title">🎥 المعدات</span>
                <button className="review-card-edit" onClick={() => goToStep(7)} type="button">✏️ تعديل</button>
              </div>

              {(formData.selected_equipment_ids?.length ?? 0) > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setEquipExpanded(v => !v)}
                    className="review-row"
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: 0, background: 'transparent', border: 'none',
                      color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
                    }}
                    aria-expanded={equipExpanded}
                  >
                    <span className="rv-label">من القائمة</span>
                    <span className="rv-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {formData.selected_equipment_ids.length} معدة
                      <span style={{
                        display: 'inline-block',
                        transition: 'transform 0.2s',
                        transform: equipExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        fontSize: 12,
                        color: 'var(--text-muted)',
                      }}>▾</span>
                    </span>
                  </button>

                  {equipExpanded && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 6,
                      marginTop: 8, paddingTop: 10,
                      borderTop: '1px dashed var(--border-soft)',
                    }}>
                      {formData.selected_equipment_ids.map(id => {
                        const meta = equipNames[id];
                        return (
                          <div key={id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', borderRadius: 8,
                            background: 'rgba(59,130,246,0.06)',
                            fontSize: 13,
                          }}>
                            <span style={{ color: '#3b82f6', flexShrink: 0 }}>•</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, flex: 1, minWidth: 0 }}>
                              {meta?.name ?? '...'}
                            </span>
                            {meta?.brand && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{meta.brand}</span>
                            )}
                            {meta?.type && (
                              <span style={{
                                fontSize: 10, padding: '2px 8px', borderRadius: 6,
                                background: 'rgba(148,163,184,0.10)', color: 'var(--text-muted)', fontWeight: 600,
                              }}>{meta.type}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {(formData.custom_equipment_text?.length ?? 0) > 0 && (
                <div className="review-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
                  <span className="rv-label">معدات أخرى</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {formData.custom_equipment_text.map(n => (
                      <span key={n} className="review-field-tag">{n}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terms — opens the forced-read modal. Direct toggling is no longer
            possible; the user must scroll through the legal text first. */}
        {termsAccepted ? (
          <div
            onClick={() => setLegalModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(16,185,129,0.10)',
              border: '1px solid rgba(16,185,129,0.35)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#10b981', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, flexShrink: 0,
            }}>✓</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#34d399' }}>
                تم الموافقة على الشروط والأحكام وسياسة السرّية
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(110,231,183,0.75)', marginTop: 2 }}>
                اضغط لإعادة القراءة
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLegalModalOpen(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(59,130,246,0.08)',
              border: '1px dashed rgba(59,130,246,0.5)',
              color: 'var(--text-primary)',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(59,130,246,0.18)',
              border: '1px solid rgba(59,130,246,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>📜</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                اضغط لقراءة الشروط والأحكام وسياسة السرّية والموافقة عليها
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                مطلوب قبل إرسال الطلب — اقرأ النصوص حتى النهاية
              </div>
            </div>
            <span style={{ fontSize: 16, color: 'var(--accent-lighter)' }}>←</span>
          </button>
        )}
      </div>

      <LegalAcceptanceModal
        open={legalModalOpen}
        onAccept={() => {
          setTermsAccepted(true);
          setLegalModalOpen(false);
        }}
        onClose={() => setLegalModalOpen(false)}
      />
    </>
  );
};
