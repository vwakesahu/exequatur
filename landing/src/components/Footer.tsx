import Link from "next/link";

const REPO = "https://github.com/vwakesahu/exequatur";

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 -z-10 flex min-h-[22rem] w-full items-end bg-neutral-950">
      <div className="w-full px-6 pb-10 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-8 border-b border-white/10 pb-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="exequatur" width={28} height={28} className="h-7 w-7" />
                <span className="font-display text-lg font-bold text-white">exequatur</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                A firewall for autonomous payment agents. Scoped delegation, a Venice policy check,
                and an on-chain enforcer no agent can talk its way past.
              </p>
            </div>
            <div className="flex gap-12 sm:gap-16">
              <div>
                <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Project</p>
                <ul className="space-y-2 text-sm text-white/60">
                  <li>
                    <Link href={REPO} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                      GitHub
                    </Link>
                  </li>
                  <li>
                    <Link href={`${REPO}#tests`} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                      How it works
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Built on</p>
                <ul className="space-y-2 text-sm text-white/60">
                  <li>MetaMask Smart Accounts</li>
                  <li>Venice</li>
                  <li>Base Sepolia</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="pt-6 text-sm text-white/40">
            &copy; 2026 exequatur. Built for the A2A, Best Agent and Venice tracks.
          </p>
        </div>
      </div>
    </footer>
  );
}
