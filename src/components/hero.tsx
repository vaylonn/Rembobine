"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { trackTitle } from "@/app/actions";
import type { MediaType } from "@/lib/schema";
import { CheckIcon, InfoIcon, PlusIcon, StarIcon } from "./icons";

export type HeroSlide = {
  id: number;
  mediaType: MediaType;
  title: string;
  href: string;
  backdrop: string;
  overview: string;
  facts: string[];
  voteAverage: number;
  rank: number;
  inLibrary: boolean;
};

const DELAY = 8000;

function AddButton({ slide }: { slide: HeroSlide }) {
  const [added, setAdded] = useState(slide.inLibrary);
  const [pending, startTransition] = useTransition();

  if (added) {
    return (
      <Link href={slide.href} className="btn-ghost">
        <CheckIcon width={18} height={18} />
        Dans ta bibliothèque
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost"
      onClick={() =>
        startTransition(async () => {
          try {
            await trackTitle({
              mediaType: slide.mediaType,
              tmdbId: slide.id,
              status: "planned",
              rating: null,
              season: null,
              episode: null,
            });
            setAdded(true);
          } catch {
            // L'utilisateur peut toujours passer par la fiche.
          }
        })
      }
    >
      <PlusIcon width={18} height={18} />
      {pending ? "Ajout…" : "À voir"}
    </button>
  );
}

/** Grand bandeau d'accueil qui fait défiler les titres du moment. */
export function Hero({ slides, label }: { slides: HeroSlide[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), DELAY);
    return () => clearTimeout(t);
  }, [index, paused, slides.length]);

  if (!slides.length) return null;
  const slide = slides[index];

  return (
    <section
      className="full-bleed relative -mt-24 h-[78vh] min-h-[460px] max-h-[820px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrousel"
    >
      {slides.map((s, i) => (
        <Image
          key={`${s.mediaType}:${s.id}`}
          src={s.backdrop}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover object-top transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-black/40" />

      <div className="container-page relative flex h-full flex-col justify-end pb-14 sm:pb-20">
        <div key={`${slide.mediaType}:${slide.id}`} className="max-w-xl animate-fade-up space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
            <span className="text-accent">N°{slide.rank}</span>
            {label}
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight drop-shadow-lg sm:text-6xl">
            {slide.title}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg/80">
            {slide.voteAverage > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-accent">
                <StarIcon />
                {slide.voteAverage.toFixed(1)}
              </span>
            )}
            {slide.facts.map((f) => (
              <span key={f} className="before:mr-2 before:text-fg/40 before:content-['•'] first:before:hidden">
                {f}
              </span>
            ))}
          </p>
          {slide.overview && <p className="line-clamp-3 text-sm leading-relaxed text-fg/75 sm:text-base">{slide.overview}</p>}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={slide.href} className="btn-primary">
              <InfoIcon width={18} height={18} />
              Voir la fiche
            </Link>
            <AddButton key={`${slide.mediaType}:${slide.id}`} slide={slide} />
          </div>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-6 right-4 flex gap-1.5 sm:right-8">
            {slides.map((s, i) => (
              <button
                key={`${s.mediaType}:${s.id}`}
                type="button"
                aria-label={`Afficher ${s.title}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-accent" : "w-3 bg-white/30 hover:bg-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
