'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import MessagesView from '@/components/MessagesView';
import { useAuth } from '@/components/Providers';

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  // Workers use the same inbox inside their dashboard layout so the side menu stays visible.
  useEffect(() => {
    if (user?.role === 'worker') router.replace(`/worker/messages${window.location.search}`);
  }, [user, router]);
  if (user?.role === 'worker') return null;
  return (
    <Shell footer={false}>
      <MessagesView base="/messages" />
    </Shell>
  );
}
