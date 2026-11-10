import Header from './Header';
import Footer from './Footer';

// Standard page frame: header, main landmark, optional footer.
export default function Shell({ children, footer = true, className = '' }) {
  return (
    <>
      <Header />
      <main id="main" className={`flex-1 ${className}`}>
        {children}
      </main>
      {footer && <Footer />}
    </>
  );
}
