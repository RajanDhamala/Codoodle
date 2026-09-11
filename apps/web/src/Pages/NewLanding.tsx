import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import "./NewLanding.css";
const CreateRoomModal = lazy(() => import("./CreateRoomModal"));



function NewLanding() {
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
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const roomDialog = useRef<HTMLDialogElement>(null);
  const rulesDialog = useRef<HTMLDialogElement>(null);
  const openRules = () => rulesDialog.current?.showModal();
  const openRoom = () => {
    rulesDialog.current?.close();
    setIsRoomOpen(true);
    roomDialog.current?.showModal();
  };
  const closeRoom = () => {
    if (!isCreating) roomDialog.current?.close();
  };

  useEffect(() => {
    if (!isRoomOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isRoomOpen]);

  const closeButton = (
    <button
      type="button"
      onClick={closeRoom}
      disabled={isCreating}
      aria-label="Close create room"
      autoFocus
      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#777780] transition hover:bg-[#f5f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#956008] disabled:cursor-wait disabled:opacity-50"
    >
      <X size={20} aria-hidden="true" />
    </button>
  );

  return (
    <>
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
            <span className="inline-flex">
              <button className="new-landing__nav-play inline-flex min-h-11 items-center justify-center" type="button" onClick={openRoom}>
                Let’s play <ArrowRight size={17} aria-hidden="true" />
              </button>
            </span>
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
                <button className="new-landing__button new-landing__button--primary" type="button" onClick={openRoom}>
                  Create a room <ArrowRight size={20} aria-hidden="true" />
                </button>
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
            <button className="new-landing__button new-landing__button--primary" type="button" onClick={openRoom}>
              Let’s play <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </dialog>
      </div>
      <dialog
        ref={roomDialog}
        aria-labelledby="create-room-title"
        aria-busy={isCreating}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[540px] overflow-y-auto overscroll-contain rounded-2xl border border-[#e7e7ea] bg-white p-5 text-[#191923] shadow-2xl [font-family:'Avenir_Next','Segoe_UI',ui-sans-serif,system-ui,sans-serif] backdrop:bg-black/70 sm:p-6"
        onCancel={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          closeRoom();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) closeRoom();
        }}
        onClose={(event) => {
          if (event.target === event.currentTarget) setIsRoomOpen(false);
        }}
      >
        {isRoomOpen && (
          <Suspense fallback={
            <div className="flex min-h-40 items-start justify-between gap-4">
              <div>
                <h2 id="create-room-title" className="text-2xl font-bold">Create room</h2>
                <p role="status" className="mt-4 text-sm text-slate-500">Loading room controls…</p>
              </div>
              {closeButton}
            </div>
          }>
            <CreateRoomModal closeButton={closeButton} onCreatingChange={setIsCreating} />
          </Suspense>
        )}
      </dialog>
    </>
  );
}

export default NewLanding;
