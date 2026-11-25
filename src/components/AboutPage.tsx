import { ArrowLeft, ArrowRight, X } from 'lucide-react';

interface AboutPageProps {
  open: boolean;
  onGoGallery: () => void;
  onGoList: () => void;
}

const AWARDS = [
  { title: 'Emerging 100 Award', body: 'Recognised as one of 100 emerging companies contributing immensely to the growth of India.' },
  { title: 'India SME 100', body: 'Recognised amongst the Top 100 SMEs of India by the India SME Forum.' },
  { title: 'MSME State Award', body: 'Presented by Sri Naveen Patnaik ji, Honourable CM of Odisha, for the best entrepreneur in micro manufacturing.' },
  { title: 'Legendary Leader in Incense Sticks', body: 'Presented by Anil Kapoor at the Times Business Awards.' },
  { title: 'Best Enterprise Award', body: 'Awarded by MSME for generating the highest employment within Odisha.' },
  { title: 'Best Entrepreneur Award', body: 'Awarded by Andhra Bank.' },
  { title: 'Brand of Odisha', body: 'Declared the best fragrance of Odisha by marketing guru Sri Prahlad Kakkar ji.' },
  { title: 'Best Brand Award', body: 'Awarded at the Brand Leadership Awards 2020.' },
];

const FACTS = [
  { value: '1996', label: 'Began making incense' },
  { value: '2008', label: 'Shri Balaji Incense Industries founded' },
  { value: '#1', label: 'Incense brand in Odisha' },
  { value: 'Top 10', label: 'Incense brand in India' },
];

export function AboutPage({ open, onGoGallery, onGoList }: AboutPageProps) {
  return (
    <section
      id="about"
      className={open ? 'is-open' : ''}
      aria-hidden={!open}
      inert={!open}
      aria-label="About Madhukunj"
    >
      <div className="about-hero">
        <div className="about-hero-inner">
          <p className="about-eyebrow">Our Story</p>
          <h2 className="about-title">About Madhukunj</h2>
          <p className="about-tagline">Agarbatti ho toh Madhukunj</p>
          <p className="about-lede">
            A thread of smoke, and the morning turns sacred. Before the day begins there is a
            small, deliberate quiet — a flame, a curl of fragrance, a moment that belongs to you.
          </p>
        </div>
        <button type="button" className="about-close" aria-label="Close about page" onClick={onGoGallery}>
          <X size={20} strokeWidth={1.6} />
        </button>
      </div>

      <div className="about-body">
        <div className="about-section about-intro">
          <div className="about-image-wrap">
            <img src="/madhukunj/images/about/lifestyle-ritual.png" alt="A serene morning puja setting with incense burning" loading="lazy" />
          </div>
          <div className="about-copy">
            <p className="about-kicker">Rooted in the soil of Kalinga</p>
            <h3 className="about-heading">A fragrance for every mood, moment and ritual.</h3>
            <p>
              Shri Ramawatar Agarwal started his career as an incense sticks trader. He ventured
              into incense manufacturing in 1996; Shri Balaji Incense Industries was founded in
              2008. His vision of excellence has helped the firm grow every moment — making
              Madhukunj the number one incense stick brand of Odisha and one of the top ten in India.
            </p>
            <p>
              Our skilled team is committed to the finest blends. From pooja to meditation to
              relaxation, our range is made to suit your mood and occasion — light a stick and let
              the fragrance create a positive aura around you.
            </p>
            <p>
              Optimum quality at a reasonable price has built lasting relationships with our
              customers. That bond is why we say: <em>Agarbatti ho toh Madhukunj.</em>
            </p>
          </div>
        </div>

        <div className="about-facts">
          {FACTS.map((fact) => (
            <div className="about-fact" key={fact.label}>
              <strong>{fact.value}</strong>
              <span>{fact.label}</span>
            </div>
          ))}
        </div>

        <div className="about-section about-awards">
          <div className="about-copy">
            <p className="about-kicker">Recognised by India</p>
            <h3 className="about-heading">Honoured, again and again.</h3>
            <p>
              From national SME awards to state honours, Madhukunj's craft and enterprise have been
              recognised across India.
            </p>
            <div className="about-award-photos">
              <img src="/madhukunj/images/about/award-1.png" alt="Madhukunj receiving the Times Business Award with Anil Kapoor" loading="lazy" />
              <img src="/madhukunj/images/about/award-2.jpg" alt="Madhukunj honoured at Emerging 100 with Shri Nitin Gadkari" loading="lazy" />
            </div>
          </div>
          <div className="about-award-grid">
            {AWARDS.map((award) => (
              <div className="about-award" key={award.title}>
                <h4>{award.title}</h4>
                <p>{award.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="about-cta">
          <h3>Find your fragrance</h3>
          <p>Explore 107 incense sticks, dhoop and gift combos made in Kalinga.</p>
          <div className="about-cta-actions">
            <button type="button" className="about-cta-primary" onClick={onGoList}>
              Shop all products <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button type="button" className="about-cta-secondary" onClick={onGoGallery}>
              <ArrowLeft size={16} aria-hidden="true" /> Back to gallery
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
