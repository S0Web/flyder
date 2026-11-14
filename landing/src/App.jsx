import Nav from './components/Nav';
import Hero from './components/Hero';
import Bandeau from './components/Bandeau';
import Statement from './components/Statement';
import Solutions from './components/Solutions';
import Features from './components/Features';
import Equipe from './components/Equipe';
import Contact from './components/Contact';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';

export default function App() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <Nav />
      <main>
        <Hero />
        <Bandeau />
        <Statement />
        <Solutions />
        <Features />
        <Equipe />
        <Contact />
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
