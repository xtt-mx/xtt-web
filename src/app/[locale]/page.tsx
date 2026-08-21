import { setRequestLocale } from 'next-intl/server';

import { OrbitHero } from '@/components/OrbitHero';

const HomePage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OrbitHero />;
};

export default HomePage;
