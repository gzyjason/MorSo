/**
 * StepOne landing page.
 *
 * The four selling-point sections are generated from SECTIONS and revealed by an
 * IntersectionObserver as they scroll into view. Everything else is static markup.
 */

/* Design-time props, mirroring the design component's prop panel. */
const CONFIG = {
  /** App Store listing. '#' until the app ships. */
  appStoreUrl: '#',
  /** Alternate the phone mocks left/right by 2.2°. */
  tiltFrames: true,
};

const SECTIONS = [
  { img: './assets/home.png', headline: 'Build motivation by completing simple, achievable tasks' },
  { img: './assets/types.png', headline: 'Wide range of different types of tasks to choose from' },
  { img: './assets/swipe.png', headline: 'Completing tasks add progress to your journey' },
  { img: './assets/journey.png', headline: 'Achieve milestones through consistency' },
];

function buildSection({ img, headline }, i) {
  const section = document.createElement('section');
  section.className = `section ${i % 2 === 0 ? 'section--even' : 'section--odd'}`;

  const media = document.createElement('div');
  media.className = 'section-media';

  const phone = document.createElement('div');
  phone.className = 'phone';

  const shot = document.createElement('img');
  shot.className = 'phone-shot';
  shot.src = img;
  shot.alt = headline;
  shot.loading = 'lazy';

  const frame = document.createElement('img');
  frame.className = 'phone-frame';
  frame.src = './assets/phone-frame.png';
  frame.alt = '';
  frame.setAttribute('aria-hidden', 'true');

  phone.append(shot, frame);
  media.append(phone);

  const copy = document.createElement('div');
  copy.className = 'section-copy';

  const h2 = document.createElement('h2');
  h2.className = 'headline';
  h2.textContent = headline;
  copy.append(h2);

  section.append(media, copy);
  return section;
}

const container = document.getElementById('sections');
if (!CONFIG.tiltFrames) container.classList.add('no-tilt');
const sections = SECTIONS.map(buildSection);
container.append(...sections);

document.getElementById('appStoreLink').href = CONFIG.appStoreUrl || '#';

// Reveal once, then stop watching — these never animate back out.
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.22 }
);

sections.forEach((section) => observer.observe(section));
