import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useVendor } from '../../../contexts/VendorContext';

export interface CompletionItem {
  label: string;
  done: boolean;
}

export interface ProfileCompletion {
  percentage: number;
  items: CompletionItem[];
  loading: boolean;
}

export function useProfileCompletion(): ProfileCompletion {
  const { vendor } = useVendor();
  const [hasFinancial, setHasFinancial] = useState(false);
  const [hasServices, setHasServices] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendor?.id) return;

    const fetch = async () => {
      setLoading(true);
      const [finRes, svcRes] = await Promise.all([
        supabase
          .from('vendor_financial_data')
          .select('bank_name, iban')
          .eq('vendor_id', vendor.id)
          .maybeSingle(),
        supabase
          .from('vendor_selected_fields')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id),
      ]);

      setHasFinancial(!!(finRes.data?.bank_name && finRes.data?.iban));
      setHasServices((svcRes.count ?? 0) > 0);
      setLoading(false);
    };

    fetch();
  }, [vendor?.id]);

  const items: CompletionItem[] = [
    { label: 'الاسم الكامل',      done: !!vendor?.full_name },
    { label: 'رقم الجوال',        done: !!vendor?.phone },
    { label: 'الجنسية',           done: !!vendor?.nationality },
    { label: 'مدينة الإقامة',     done: !!vendor?.primary_city },
    { label: 'رقم الهوية',        done: !!vendor?.id_number },
    { label: 'الصورة الشخصية',    done: !!vendor?.profile_image },
    { label: 'البيانات المالية',   done: hasFinancial },
    { label: 'الخدمات والتسعير',  done: hasServices },
  ];

  const doneCount = items.filter(i => i.done).length;
  const percentage = Math.round((doneCount / items.length) * 100);

  return { percentage, items, loading };
}
