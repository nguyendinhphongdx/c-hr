import { CTA } from "../components/CTA";
import { Comparison } from "../components/Comparison";
import { Features } from "../components/Features";
import { Footer } from "../components/Footer";
import { Hero } from "../components/Hero";
import { HowItWorks } from "../components/HowItWorks";
import { Nav } from "../components/Nav";
import { Stack } from "../components/Stack";

export function LandingView() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Comparison />
        <Stack />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
