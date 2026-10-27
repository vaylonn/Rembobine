"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/** Rangée défilante horizontale, avec flèches sur grand écran. */
export function ScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow =
    "absolute top-0 bottom-8 z-20 hidden w-16 items-center justify-center text-fg opacity-0 transition group-hover/row:opacity-100 sm:flex";

  return (
    <div className="group/row full-bleed relative">
      <div ref={ref} className="no-scrollbar bleed-row flex snap-x gap-3 overflow-x-auto pb-2 sm:gap-4">
        {children}
      </div>
      {!edges.start && (
        <button
          type="button"
          aria-label="Défiler vers la gauche"
          onClick={() => scroll(-1)}
          className={`${arrow} left-0 bg-gradient-to-r from-bg to-transparent`}
        >
          <ChevronLeftIcon width={28} height={28} />
        </button>
      )}
      {!edges.end && (
        <button
          type="button"
          aria-label="Défiler vers la droite"
          onClick={() => scroll(1)}
          className={`${arrow} right-0 bg-gradient-to-l from-bg to-transparent`}
        >
          <ChevronRightIcon width={28} height={28} />
        </button>
      )}
    </div>
  );
}
