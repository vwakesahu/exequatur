import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import { ArrowUpRight } from "lucide-react";
import Magnetic from "@/components/Magnetic";

const REPO = "https://github.com/vwakesahu/exequatur";
const APP = "https://app.exequatur.xyz";

export default function Cta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-28 md:py-36">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-700 px-8 py-16 text-center md:px-16 md:py-24">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" />

        <h2 className="relative mx-auto max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
          Put your agent on a short leash.
        </h2>
        <p className="relative mx-auto mt-6 max-w-xl text-lg text-white/80">
          Scoped delegation, a Venice policy check, and an on-chain enforcer. Read the contracts and
          run the six scenarios yourself.
        </p>

        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <Link
              href={APP}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-white/90"
            >
              Launch app <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <FaGithub className="h-4 w-4" /> View on GitHub
            </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
