"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import AnimatedButton from "@/components/ui/cult/animated-button";

const REPO = "https://github.com/vwakesahu/exequatur";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed left-0 top-0 z-50 flex w-full items-center justify-between px-6 py-6 transition-all duration-300 md:px-10 ${
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <Link href="/" className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="exequatur" width={32} height={32} className="h-8 w-8" />
        <span className="font-display text-lg font-bold tracking-tight text-foreground">exequatur</span>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href={`${REPO}#tests`}
          className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
        >
          How it works
        </Link>
        <Link href={REPO} target="_blank" rel="noreferrer">
          <AnimatedButton size="lg" variant="accent" className="font-medium">
            <FaGithub className="h-4 w-4" />
            View on GitHub
          </AnimatedButton>
        </Link>
      </div>
    </nav>
  );
}
