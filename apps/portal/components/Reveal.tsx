"use client";

import { useEffect, useRef } from "react";

type Props = {
  children: React.ReactNode;
  stagger?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
};

export function Reveal({ children, stagger = false, className = "", as = "div" }: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Cmp = as as React.ElementType;
  const cls = `${stagger ? "reveal-stagger" : "reveal"} ${className}`.trim();
  return (
    <Cmp ref={ref} className={cls}>
      {children}
    </Cmp>
  );
}
