import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import AnimatedButton from "@/components/ui/cult/animated-button";
import Magnetic from "@/components/Magnetic";

const APP = "https://app.exequatur.xyz";

export default function Navbar() {
  return (
    <nav className="fixed left-0 top-0 z-50 flex w-full items-center justify-between bg-transparent px-6 py-6 md:px-10">
      <Link href="/" className="font-display text-lg font-normal tracking-tight text-foreground">
        exequatur
      </Link>

      <div className="flex items-center gap-3">
        <Magnetic>
          <Link href={APP} target="_blank" rel="noreferrer">
            <AnimatedButton size="lg" variant="accent" className="font-normal">
              Launch app
              <ArrowUpRight className="h-4 w-4" />
            </AnimatedButton>
          </Link>
        </Magnetic>
      </div>
    </nav>
  );
}
