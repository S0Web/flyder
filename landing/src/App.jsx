import Nav from './components/Nav';
import Hero from './components/Hero';
import Statement from './components/Statement';
import Solutions from './components/Solutions';
import Features from './components/Features';
import Contact from './components/Contact';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';

export default function App() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <Nav />
      <main>
        <Hero />
        <Statement />
        <Solutions />
        <Features />
        <Contact />
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
