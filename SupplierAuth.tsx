import { useState } from 'react';
import SupplierLogin from './SupplierLogin';
import OTPInput from './OTPInput';
import { VendorProvider } from '../contexts/VendorContext';
import { VendorPortal } from './vendor/VendorPortal';

type AuthStep = 'login' | 'otp' | 'authenticated';

interface VendorData {
  vendor: {
    id: string;
    email: string;
    name: string;
    vendor_type?: string;
    phone?: string;
    primary_city?: string;
    profile_image?: string;
    nationality?: string;
    id_number?: string;
    status?: string;
  };
  session: {
    token: string;
    expiresAt: string;
  };
}

interface SupplierAuthProps {
  /** Optional: called by App.tsx when auth succeeds — skips internal portal render */
  onSuccess?: (data: VendorData) => void;
}

export default function SupplierAuth({ onSuccess }: SupplierAuthProps) {
  const [step, setStep]           = useState<AuthStep>('login');
  const [email, setEmail]         = useState('');
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [devOTP, setDevOTP]       = useState<string | null>(null);

  const handleOTPSent = (sentEmail: string, otpCode?: string) => {
    setEmail(sentEmail);
    setDevOTP(otpCode || null);
    setStep('otp');
  };

  const handleBack = () => {
    setStep('login');
    setEmail('');
    setDevOTP(null);
  };

  const handleAuthSuccess = (data: VendorData) => {
    // Persist session
    localStorage.setItem('vendor_session', JSON.stringify(data.session));
    localStorage.setItem('vendor_data', JSON.stringify(data.vendor));

    setVendorData(data);
    setStep('authenticated');

    // If parent provided onSuccess callback, call it (App.tsx integration)
    if (onSuccess) {
      onSuccess(data);
      return; // App.tsx will handle rendering
    }
  };

  // ── Authenticated: render VendorPortal inline (standalone mode) ──
  if (step === 'authenticated' && vendorData && !onSuccess) {
    return (
      <VendorProvider
        initialVendor={{
          id:            vendorData.vendor.id,
          email:         vendorData.vendor.email,
          full_name:     vendorData.vendor.name,
          phone:         vendorData.vendor.phone || '',
          status:        vendorData.vendor.status || 'active',
          vendor_type:   vendorData.vendor.vendor_type,
          primary_city:  vendorData.vendor.primary_city,
          profile_image: vendorData.vendor.profile_image,
          nationality:   vendorData.vendor.nationality,
          id_number:     vendorData.vendor.id_number,
        }}
        initialSession={vendorData.session}
      >
        <VendorPortal />
      </VendorProvider>
    );
  }

  if (step === 'otp') {
    return (
      <OTPInput
        email={email}
        onBack={handleBack}
        onSuccess={handleAuthSuccess}
        devOTP={devOTP}
      />
    );
  }

  return <SupplierLogin onOTPSent={handleOTPSent} />;
}
