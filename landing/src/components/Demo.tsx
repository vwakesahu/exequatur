import { YouTubePlayer } from "@/components/ui/cult/youtube-player";

// Replace with the exequatur demo video id (or a full youtube url).
const DEMO_VIDEO = "dQw4w9WgXcQ";

const BASESCAN_HAPPY =
  "https://sepolia.basescan.org/tx/0x3f4e8c0b160f4540d659a980710b1bcba7cd0e9a667d3dc5c39f0cb2397ebfdf";
const BASESCAN_A2A =
  "https://sepolia.basescan.org/tx/0x0dfff0d31fac997930e0ae8f8833aaf51013a1e0b1330ef38adf016e9af3b95f";

export default function Demo() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <div className="mb-10 text-center md:mb-14">
        <h2 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">
          <span className="text-foreground">Watch it refuse </span>
          <span className="bg-gradient-to-b from-indigo-300 to-indigo-500 bg-clip-text text-transparent">
            the bad payment.
          </span>
        </h2>
      </div>

      <YouTubePlayer
        videoId={DEMO_VIDEO}
        containerClassName="rounded-3xl border-border shadow-2xl shadow-indigo-500/10"
      />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Six scenarios, end to end. Proof on Base Sepolia:{" "}
        <a className="text-indigo-400 underline-offset-2 hover:underline" href={BASESCAN_HAPPY} target="_blank" rel="noreferrer">
          happy path tx
        </a>{" "}
        and{" "}
        <a className="text-indigo-400 underline-offset-2 hover:underline" href={BASESCAN_A2A} target="_blank" rel="noreferrer">
          A2A worker tx
        </a>
        .
      </p>
    </section>
  );
}
