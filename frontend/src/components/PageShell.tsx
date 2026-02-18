import Link from 'next/link';

type Props = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function PageShell({ title, subtitle, actions, children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
              CPS System
            </Link>
            {title && <div className="text-sm text-gray-600">{title}</div>}
          </div>
          <div className="flex items-center gap-3">{actions}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
