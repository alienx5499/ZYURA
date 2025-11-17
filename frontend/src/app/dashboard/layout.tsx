import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your flight delay insurance policies, purchase new coverage, and track your claims on ZYURA. View your active policies, purchase history, and receive instant USDC payouts for delayed flights.',
  openGraph: {
    title: 'ZYURA Dashboard - Manage Your Flight Insurance Policies',
    description: 'Manage your flight delay insurance policies, purchase new coverage, and track your claims on ZYURA.',
    type: 'website',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

