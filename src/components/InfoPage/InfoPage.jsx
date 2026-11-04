import Header from '../Header/Header.jsx';
import Footer from '../Footer/Footer.jsx';
import './InfoPage.css';

/* Shared layout for the simple informational pages (About, Contact, Privacy,
   Terms). Keeps them consistent with the rest of the portal. */
export default function InfoPage({ title, subtitle, children }) {
  return (
    <div className="infopage">
      <Header />
      <header className="infopage__hero">
        <div className="container">
          <h1 className="infopage__title">{title}</h1>
          {subtitle && <p className="infopage__subtitle">{subtitle}</p>}
        </div>
      </header>
      <main className="infopage__body">
        <div className="container infopage__content">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
