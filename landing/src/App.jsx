import Nav from './components/Nav';
import Hero from './components/Hero';
import Solutions from './components/Solutions';
import Features from './components/Features';
import Contact from './components/Contact';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <Nav />
      <Hero />
      <Solutions />
      <Features />
      <Contact />
      <Footer />
    </div>
  );
}
