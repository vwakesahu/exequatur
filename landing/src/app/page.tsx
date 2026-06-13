import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import StatementMarquee from "@/components/StatementMarquee";
import Demo from "@/components/Demo";
import Mechanics from "@/components/Mechanics";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <div className="relative max-w-full">
      <div className="relative z-10 mb-[22rem] w-full rounded-b-[60px] bg-background pb-24 md:rounded-b-[120px]">
        <Navbar />
        <Hero />
        <Features />
        <StatementMarquee />
        <Demo />
        <Mechanics />
      </div>
      <Footer />
    </div>
  );
}
