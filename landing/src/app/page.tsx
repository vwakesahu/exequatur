import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Demo from "@/components/Demo";
import HowItHolds from "@/components/HowItHolds";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <div className="relative max-w-full">
      <div className="relative z-10 mb-[22rem] w-full rounded-b-[60px] bg-background pb-24 md:rounded-b-[120px]">
        <Navbar />
        <Hero />
        <Features />
        <Demo />
        <HowItHolds />
      </div>
      <Footer />
    </div>
  );
}
