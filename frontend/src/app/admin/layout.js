import Header from '@/components/Header';

export const metadata = { title: 'Admin · RoshanRozgar' };

export default function AdminLayout({ children }) {
  return (
    <>
      <Header />
      <main id="main" className="container-rr min-w-0 flex-1 pb-16 pt-6 sm:pt-10">{children}</main>
    </>
  );
}
