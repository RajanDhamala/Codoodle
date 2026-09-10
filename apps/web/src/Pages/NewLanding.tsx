import { useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import "./NewLanding.css";

const howToPlay = [
  {
    title: "Get your secret.",
    description:
      "Artists see the same word. One secret imposter only sees the category.",
  },
  {
    title: "Make your mark.",
    description:
      "Take turns adding to a shared drawing. The imposter has to draw along and blend in.",
  },
  {
    title: "Find the faker.",
    description:
      "Compare your suspicions, then vote. Who knew the word, and who was winging it?",
  },
];

function NewLanding() {
  const rulesDialog = useRef<HTMLDialogElement>(null);
  const openRules = () => rulesDialog.current?.showModal();

  return (
    <div className="new-landing">
      <a className="new-landing__skip" href="#main-content">
        Skip to content
      </a>

      <header className="new-landing__header new-landing__container">
        <Link className="new-landing__brand" to="/new" aria-label="Coloodle home">
          <img src="/coloodle.svg" alt="" width="48" height="27" />
          <span>
            Coloodle<span className="text-[#c57f00] motion-safe:animate-[coloodle-dot_2s_steps(1,end)_infinite]">.</span>
          </span>
        </Link>

        <nav className="new-landing__nav" aria-label="Main navigation">
          <Link className="new-landing__home" to="/new" aria-current="page">
            Home
          </Link>
          <button type="button" onClick={openRules}>How to play</button>
          <Link className="new-landing__nav-play" to="/lobby">
            Let’s play <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <main id="main-content" className="new-landing__main new-landing__container" tabIndex={-1}>
        <section className="new-landing__hero" aria-labelledby="hero-title">
          <div className="new-landing__copy">
            <h1 id="hero-title">
              <span>Everyone draws.</span>
              <span>Someone’s faking.</span>
            </h1>
            <p className="new-landing__description">
              One friend doesn’t know the secret word. Take turns drawing, then
              vote for the imposter.
            </p>

            <div className="new-landing__actions">
              <Link className="new-landing__button new-landing__button--primary" to="/lobby">
                Create a room <ArrowRight size={20} aria-hidden="true" />
              </Link>
              <button
                className="new-landing__button new-landing__button--text"
                type="button"
                onClick={openRules}
              >
                How to play <span aria-hidden="true">↗</span>
              </button>
            </div>
            <p className="new-landing__note">
              No art skills needed. A good poker face helps.
            </p>
          </div>

          <figure className="new-landing__art">
            <picture>
              <source
                srcSet="/coloodle-cat-drawing.webp"
                type="image/webp"
                media="(prefers-reduced-motion: no-preference)"
                width="1000"
                height="540"
              />
              <img
                className="new-landing__illustration"
                src="/withyellobg.png"
                alt="Friends drawing a cat together. The artists see the word cat, while the imposter only sees the category animal."
                width="1706"
                height="922"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            <figcaption>Someone’s drawing. Someone’s guessing. Someone’s lying.</figcaption>
          </figure>
        </section>
      </main>

      <footer className="new-landing__footer new-landing__container">
        <p>Bad drawings. <span>Good company.</span></p>
        <p>Gather your friends. Play in your browser.</p>
      </footer>

      <dialog
        ref={rulesDialog}
        className="new-landing__rules"
        aria-labelledby="rules-title"
        aria-describedby="rules-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) rulesDialog.current?.close();
        }}
      >
        <div className="new-landing__rules-content">
          <form method="dialog" className="new-landing__rules-close">
            <button type="submit" aria-label="Close how to play" autoFocus>
              <X size={22} aria-hidden="true" />
            </button>
          </form>
          <p className="new-landing__eyebrow">A quick sketch of the rules</p>
          <h2 id="rules-title">Everyone draws.<br />One of you bluffs.</h2>
          <p id="rules-description">Create a room, share the invite, and get your friends together.</p>

          <ol className="new-landing__steps">
            {howToPlay.map((step, index) => (
              <li key={step.title}>
                <span className="new-landing__step-number" aria-hidden="true">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link className="new-landing__button new-landing__button--primary" to="/lobby">
            Let’s play <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </div>
      </dialog>
    </div>
  );
}

export default NewLanding;
