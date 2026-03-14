import { useState } from 'react';
import SupplierLogin from './SupplierLogin';
import OTPInput from './OTPInput';

type AuthStep = 'login' | 'otp';

interface SupplierAuthProps {
  onSuccess?: (data: any) => void;
}

export default function SupplierAuth({ onSuccess }: SupplierAuthProps) {
  const [step, setStep]     = useState<AuthStep>('login');
  const [email, setEmail]   = useState('');
  const [devOTP, setDevOTP] = useState<string | null>(null);

  const handleOTPSent = (sentEmail: string, otpCode?: string) => {
    setEmail(sentEmail);
    setDevOTP(otpCode || null);
    setStep('otp');
  };

  const handleBack = () => { setStep('login'); setEmail(''); setDevOTP(null); };

  const handleSuccess = (data: any) => {
    localStorage.setItem('vendor_session', JSON.stringify(data.session));
    localStorage.setItem('vendor_data',    JSON.stringify(data.vendor));
    onSuccess?.(data);
  };

  if (step === 'otp') {
    return <OTPInput email={email} onBack={handleBack} onSuccess={handleSuccess} devOTP={devOTP} />;
  }

  return <SupplierLogin onOTPSent={handleOTPSent} />;
}
