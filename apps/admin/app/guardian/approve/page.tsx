import type { Metadata } from 'next';
import { Suspense } from 'react';
import GuardianApprovalForm from './GuardianApprovalForm';

export const metadata: Metadata = {
  title: 'Autorizar cadastro de menor | FéConecta',
  robots: { index: false, follow: false },
};

export default function GuardianApprovalPage() {
  return <Suspense fallback={<main className="min-h-[80vh] bg-black" />}><GuardianApprovalForm /></Suspense>;
}
