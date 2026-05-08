import { useEffect, useState } from 'react';
import Header from '../components/Header/Header.jsx';
import Hero from '../components/Hero/Hero.jsx';
import HowItWorks from '../components/HowItWorks/HowItWorks.jsx';
import WhyChoose from '../components/WhyChoose/WhyChoose.jsx';
import Footer from '../components/Footer/Footer.jsx';
import PostPage from './PostPage.jsx';
import './FindRide.css';

export default function FindRide() {
  // Find / Post toggle is owned here so we can swap the section under Hero
  const [mode, setMode] = useState('find');

  // Always land on the Hero (top) when this page mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // When the user switches mode, scroll to where the new section starts
  useEffect(() => {
    if (mode === 'post') {
      // wait a tick so the DOM updates first
      requestAnimationFrame(() => {
        const el = document.getElementById('inline-post-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [mode]);

  return (
    <div className="page-find-ride">
      <Header />
      <main>
        <Hero mode={mode} onModeChange={setMode} />

        {mode === 'post' ? (
          <section id="inline-post-section">
            <PostPage />
          </section>
        ) : (
          <>
            <HowItWorks />
            <WhyChoose />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
