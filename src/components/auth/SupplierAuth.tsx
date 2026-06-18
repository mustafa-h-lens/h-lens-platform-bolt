import { useState } from 'react';
import SupplierLogin from './SupplierLogin';
import OTPInput from './OTPInput';

type AuthStep = 'login' | 'otp';

interface SupplierAuthProps {
  onSuccess?: (data: any) => void;
}

export default function SupplierAuth({ onSuccess }: SupplierAuthProps) {
  const [step, setStep]             = useState<AuthStep>('login');
  const [identifier, setIdentifier] = useState('');
  const [mode, setMode]             = useState<'phone' | 'email'>('phone');
  const [devOTP, setDevOTP]         = useState<string | null>(null);

  const handleOTPSent = (sentIdentifier: string, sentMode: 'phone' | 'email', otpCode?: string) => {
    setIdentifier(sentIdentifier);
    setMode(sentMode);
    setDevOTP(otpCode || null);
    setStep('otp');
  };

  const handleBack = () => { setStep('login'); setIdentifier(''); setDevOTP(null); };

  const handleSuccess = (data: any) => {
    localStorage.setItem('vendor_session', JSON.stringify(data.session));
    localStorage.setItem('vendor_data',    JSON.stringify(data.vendor));
    onSuccess?.(data);
  };

  if (step === 'otp') {
    // OTPInput accepts either phone OR email and branches its API calls on
    // whichever is set. We forward only the one that matches the login mode.
    return (
      <OTPInput
        {...(mode === 'phone' ? { phone: identifier } : { email: identifier })}
        onBack={handleBack}
        onSuccess={handleSuccess}
        devOTP={devOTP}
        portalType="vendor"
      />
    );
  }

  return <SupplierLogin onOTPSent={handleOTPSent} />;
}
