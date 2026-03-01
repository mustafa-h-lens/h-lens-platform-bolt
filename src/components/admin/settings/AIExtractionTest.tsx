import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { supabase } from '../../../lib/supabaseClient';
import { useNotification } from '../../../contexts/NotificationContext';

export default function AIExtractionTest() {
  const [testImage, setTestImage] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<'id' | 'vehicle_registration'>('id');
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('يرجى اختيار ملف صورة');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `test-${Date.now()}.${fileExt}`;
      const filePath = `test/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setTestImage(publicUrl);
      showSuccess('تم رفع الصورة بنجاح');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError('حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const testExtraction = async () => {
    if (!testImage) {
      showError('يرجى رفع صورة أولاً');
      return;
    }

    setIsTesting(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-document-data`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: testImage,
          documentType: documentType,
          vendorId: 'test-vendor-id',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'فشل استخراج البيانات');
      }

      setResult(data.data);
      showSuccess('تم استخراج البيانات بنجاح!');
    } catch (error: any) {
      console.error('Error testing extraction:', error);
      setError(error.message || 'حدث خطأ أثناء اختبار الاستخراج');
      showError(error.message || 'حدث خطأ أثناء اختبار الاستخراج');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          اختبار استخراج البيانات بالذكاء الاصطناعي
        </h3>
        <p className="text-sm text-slate-600">
          قم برفع صورة هوية أو استمارة سيارة لاختبار نظام استخراج البيانات بالذكاء الاصطناعي
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">ملاحظات مهمة:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>تأكد من وضوح الصورة وجودتها</li>
              <li>تأكد من أن جميع النصوص واضحة في الصورة</li>
              <li>الصور التي تم رفعها للاختبار يتم حفظها في مجلد test/</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            نوع المستند
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="documentType"
                value="id"
                checked={documentType === 'id'}
                onChange={(e) => setDocumentType(e.target.value as 'id')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-slate-700">هوية وطنية</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="documentType"
                value="vehicle_registration"
                checked={documentType === 'vehicle_registration'}
                onChange={(e) => setDocumentType(e.target.value as 'vehicle_registration')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-slate-700">استمارة سيارة</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            رفع صورة
          </label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-slate-600" />
                )}
                <span className="text-sm text-slate-700">
                  {isUploading ? 'جاري الرفع...' : 'اختر صورة'}
                </span>
              </div>
            </label>
          </div>
        </div>

        {testImage && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">الصورة المرفوعة:</p>
              <img
                src={testImage}
                alt="Test document"
                className="max-w-md rounded-lg border border-slate-300"
              />
            </div>

            <Button
              onClick={testExtraction}
              disabled={isTesting}
              className="w-full sm:w-auto"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الاستخراج...
                </>
              ) : (
                'بدء الاختبار'
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 mb-1">حدث خطأ:</p>
              <p className="text-sm text-red-700">{error}</p>
              {error.includes('ANTHROPIC_API_KEY') && (
                <div className="mt-2 text-sm text-red-700">
                  <p className="font-semibold">الحل:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>اذهب إلى لوحة تحكم Supabase</li>
                    <li>Project Settings → Edge Functions → Secrets</li>
                    <li>أضف متغير بالاسم: ANTHROPIC_API_KEY</li>
                    <li>القيمة: مفتاح Anthropic API الخاص بك</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-green-800">
              تم استخراج البيانات بنجاح!
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-900 mb-2">البيانات المستخرجة:</p>
            {documentType === 'id' && (
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-600">رقم الهوية:</span>
                  <span className="text-sm text-slate-900">{result.extracted_id_number || 'غير متوفر'}</span>
                </div>
              </div>
            )}
            {documentType === 'vehicle_registration' && (
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-600">رقم الاستمارة:</span>
                  <span className="text-sm text-slate-900">{result.vehicle_registration_number || 'غير متوفر'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-600">ماركة المركبة:</span>
                  <span className="text-sm text-slate-900">{result.vehicle_brand || 'غير متوفر'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-600">رقم اللوحة:</span>
                  <span className="text-sm text-slate-900">{result.vehicle_plate_number || 'غير متوفر'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
