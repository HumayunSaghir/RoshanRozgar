'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import PhoneOtp from '@/components/PhoneOtp';
import { Card } from '@/components/ui';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const role = ['worker', 'customer'].includes(params.get('role')) ? params.get('role') : null;
  const next = params.get('next');

  const done = (user, isNew) => {
    if (user.role === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }
    if (user.role === 'worker') {
      router.replace(user.profileComplete ? '/worker/dashboard' : '/join?step=voice');
      return;
    }
    router.replace(next && next.startsWith('/') ? next : '/');
    void isNew;
  };

  return (
    <div className="container-rr flex min-h-[calc(100vh-420px)] items-start justify-center py-10 sm:py-16">
      <Card className="w-full max-w-[560px] p-6 sm:p-10">
        <PhoneOtp role={role} onDone={done} />
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Shell>
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </Shell>
  );
}
