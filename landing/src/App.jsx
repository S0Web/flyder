import Nav from './components/Nav';
import Hero from './components/Hero';
import Probleme from './components/Probleme';
import CeQueChangeFlyder from './components/CeQueChangeFlyder';
import Resultat from './components/Resultat';
import Preuve from './components/Preuve';
import Demarrage from './components/Demarrage';
import Features from './components/Features';
import Contact from './components/Contact';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import MobileCTA from './components/MobileCTA';

export default function App() {
  return (
    <div className="min-h-screen bg-cream-textured">
      <Nav />
      <Hero />
      <Probleme />
      <CeQueChangeFlyder />
      <Resultat />
      <Preuve />
      <Demarrage />
      <Features />
      <Contact />
      <Footer />
      <CookieConsent />
      <MobileCTA />
    </div>
  );
}
