import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import ZoomParallax from "@/components/ZoomParallax";
import StatementMarquee from "@/components/StatementMarquee";
import ScrollReveal from "@/components/ScrollReveal";
import Demo from "@/components/Demo";
import Mechanics from "@/components/Mechanics";
import Cta from "@/components/Cta";
import Footer from "@/components/Footer";
import Grain from "@/components/Grain";

// Soft violet mesh: near-white base with blurred indigo/violet glows (the abstract-2 vibe).
const MESH = {
  backgroundColor: "#fbfaff",
  backgroundImage: [
    "radial-gradient(at 12% 8%, hsla(255,90%,80%,0.22) 0px, transparent 45%)",
    "radial-gradient(at 88% 6%, hsla(270,85%,80%,0.18) 0px, transparent 42%)",
    "radial-gradient(at 72% 52%, hsla(243,90%,82%,0.16) 0px, transparent 45%)",
    "radial-gradient(at 22% 78%, hsla(265,85%,82%,0.14) 0px, transparent 45%)",
  ].join(","),
};

export default function Page() {
  return (
    <div className="relative max-w-full">
      <Grain />
      <div className="relative z-10 mb-[22rem] w-full rounded-b-[60px] pb-24 md:rounded-b-[120px]" style={MESH}>
        <Navbar />
        <Hero />
        <Features />
        <StatementMarquee />
        <ScrollReveal />
        <ZoomParallax />
        <Demo />
        <Mechanics />
        <Cta />
      </div>
      <Footer />
    </div>
  );
}
