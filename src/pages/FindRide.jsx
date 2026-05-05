import Header from '../components/Header/Header.jsx';
import Hero from '../components/Hero/Hero.jsx';
import HowItWorks from '../components/HowItWorks/HowItWorks.jsx';
import WhyChoose from '../components/WhyChoose/WhyChoose.jsx';
import Footer from '../components/Footer/Footer.jsx';
import './FindRide.css';

function FindRide() {
  return (
    <div className="page-find-ride">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <WhyChoose />
      </main>
      <Footer />
    </div>
  );
}

export default FindRide;
