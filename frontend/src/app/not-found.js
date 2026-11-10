import BrandPage from '@/components/BrandPage';

export const metadata = { title: 'Page not found - RoshanRozgar' };

export default function NotFound() {
  return <BrandPage code="404" title="We could not find that page" text="The page may have moved or the link is wrong. Let us get you back on track." />;
}
