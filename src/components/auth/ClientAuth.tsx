import { useState } from 'react';
import ClientLogin from './ClientLogin';
import ClientOTP from './ClientOTP';

interface ClientAuthProps {
  onSuccess?: (data: any) => void;
}

export default function ClientAuth({ onSuccess }: ClientAuthProps) {
  const [step, setStep]     = useState<'login' | 'otp'>('login');
  const [email, setEmail]   = useState('');
  const [devOTP, setDevOTP] = useState<string | null>(null);

  const handleOTPSent = (sentEmail: string, otpCode?: string) => {
    setEmail(sentEmail);
    setDevOTP(otpCode || null);
    setStep('otp');
  };

  const handleBack = () => { setStep('login'); setEmail(''); setDevOTP(null); };

  const handleSuccess = (data: any) => {
    localStorage.setItem('client_session', JSON.stringify(data.session));
    localStorage.setItem('client_data',    JSON.stringify(data.vendor ?? data.client ?? data));
    onSuccess?.(data);
  };

  if (step === 'otp') {
    return <ClientOTP email={email} onBack={handleBack} onSuccess={handleSuccess} />;
  }

  return <ClientLogin onOTPSent={handleOTPSent} />;
}
