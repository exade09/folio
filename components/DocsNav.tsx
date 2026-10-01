"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { spring } from "@/lib/motion";

/** The docs' table of contents: sticky beside the text, marks the section in view. */
export function DocsNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <div className="sticky top-24">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-mute)] mb-3">On this page</div>
        <ul className="space-y-0.5 border-l hairline">
          {sections.map((s) => {
            const on = s.id === active;
            return (
              <li key={s.id} className="relative">
                {on && (
                  <motion.span
                    layoutId="docs-nav-mark"
                    className="absolute -left-px top-1 bottom-1 w-0.5 bg-[var(--tag-red)] rounded-full"
                    transition={spring.layout}
                  />
                )}
                <a
                  href={`#${s.id}`}
                  aria-current={on ? "location" : undefined}
                  className={`block pl-4 py-1.5 text-sm transition-colors ${on ? "text-[var(--foreground)] font-semibold" : "text-[var(--ink-mute)] hover:text-[var(--foreground)]"}`}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
