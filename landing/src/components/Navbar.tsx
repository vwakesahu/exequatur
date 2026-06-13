import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import AnimatedButton from "@/components/ui/cult/animated-button";
import Magnetic from "@/components/Magnetic";

const REPO = "https://github.com/vwakesahu/exequatur";

export default function Navbar() {
  return (
    <nav className="fixed left-0 top-0 z-50 flex w-full items-center justify-between bg-transparent px-6 py-6 md:px-10">
      <Link href="/" className="font-display text-lg font-normal tracking-tight text-foreground">
        exequatur
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href={`${REPO}#tests`}
          className="hidden text-sm font-normal text-muted-foreground transition-colors hover:text-foreground sm:block"
        >
          How it works
        </Link>
        <Magnetic>
          <Link href={REPO} target="_blank" rel="noreferrer">
            <AnimatedButton size="lg" variant="accent" className="font-normal">
              <FaGithub className="h-4 w-4" />
              View on GitHub
            </AnimatedButton>
          </Link>
        </Magnetic>
      </div>
    </nav>
  );
}
