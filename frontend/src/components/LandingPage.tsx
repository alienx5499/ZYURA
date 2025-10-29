import React from "react";
import dynamic from "next/dynamic";
import { SparklesCore } from "@/components/ui/sparkles"
import { useDev } from "@/contexts/DevContext"
import { Footerdemo } from "@/components/ui/footer-section"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { GooeyText } from "@/components/ui/gooey-text-morphing"
import { Shield, Zap, Lock, Globe, Users } from "lucide-react"
import AboutUs1 from "./mvpblocks/about-us-1"
import BentoGrid1 from "./mvpblocks/bento-grid-1"
import Faq1 from "./mvpblocks/faq-1"
import ContactUs1 from "./mvpblocks/contact-us-1"
import { CreditCardHero } from "./ruixen/credit-card-hero"
import { SplitMintCardHero } from "./SplitMintCardHero"

// Dynamic imports to avoid SSR issues
const SplashCursor = dynamic(() => import("@/components/ui/splash-cursor").then(mod => ({ default: mod.SplashCursor })), {
  ssr: false,
  loading: () => null
});

const TestimonialsColumn = dynamic(() => import("@/components/blocks/testimonials-columns-1").then(mod => ({ default: mod.TestimonialsColumn })), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-900 rounded-lg animate-pulse"></div>
});

const testimonials = [
  {
    text: "ZYURA saved me when my flight was delayed 4 hours. I received my USDC payout automatically—no forms, no waiting. This is the future of travel insurance.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    name: "Sarah Chen",
    role: "Frequent Traveler"
  },
  {
    text: "As a business traveler, I need reliable protection without the hassle. ZYURA's instant payouts and transparent on-chain system give me peace of mind.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    name: "Marcus Rodriguez",
    role: "Business Traveler"
  },
  {
    text: "The transparency is incredible. I can see exactly when my policy activates and when payouts trigger. No black box insurance company nonsense.",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    name: "Emily Johnson",
    role: "DeFi Enthusiast"
  },
  {
    text: "Purchasing cover at checkout is so seamless. The integration with booking platforms makes it effortless to protect every trip without extra steps.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    name: "David Kim",
    role: "Traveler"
  },
  {
    text: "Solana's speed means payouts hit my wallet in seconds. Traditional insurance takes weeks. ZYURA understands the value of instant compensation.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    name: "Lisa Wang",
    role: "Crypto Native"
  },
  {
    text: "Being a liquidity provider for the risk pool has been great. Surplus sharing means I earn while helping travelers get fair protection.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    name: "Alex Thompson",
    role: "Liquidity Provider"
  }
];

const LandingPage = () => {
  const { disableCursor } = useDev();
  return (
    <div className="min-h-screen w-full bg-black">
      {/* Single Splash Cursor for entire page */}
      {!disableCursor && (
        <div className="fixed inset-0 z-10 pointer-events-none">
          <SplashCursor />
        </div>
      )}
      
      {/* Hero Section */}
      <section data-section="hero" className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden relative pt-20">
        
        <div className="relative z-20 mb-8">
          <GooeyText
            texts={[
              "ZYURA",
              "Instant Payouts",
              "Flight Delay Insurance",
              "Solana Powered"
            ]}
            morphTime={3}
            cooldownTime={2}
            className="h-32 flex items-center justify-center"
            textClassName="text-white font-bold"
          />
        </div>
        <p className="text-neutral-300 cursor-default text-center text-xl md:text-2xl mt-4 relative z-20">
          Instant, fair, community-owned flight delay insurance on Solana
        </p>
        <div className="w-[40rem] h-40 relative mt-8">
          {/* Gradients */}
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

          {/* Core component - Reduced particle density */}
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={300}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />

          {/* Radial Gradient to prevent sharp edges */}
          <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
        </div>
      </section>
      
      {/* Payment Features Section */}
      <section className="w-full py-20 px-4 bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
              Automated Flight Delay Protection
            </h2>
            <p className="text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto">
              When your flight is delayed, smart contracts automatically trigger instant USDC payouts—no claims forms, no waiting
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Credit Card Hero */}
            <div className="relative">
              <SplitMintCardHero
                headline="Instant Automated Payouts"
                subtext="Purchase parametric flight delay cover at checkout. When delays occur, oracle-verified data triggers instant USDC payouts directly to your wallet via smart contracts."
                cta="Get Protected"
                onCtaClick={() => {
                  // Scroll to contact section
                  const contactSection = document.querySelector('section:last-of-type');
                  if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="bg-gradient-to-br from-gray-900 via-black to-gray-800 border-gray-700/50"
              />
            </div>
            
            {/* Features List */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Instant Payouts</h3>
                    <p className="text-neutral-300">Sub-second USDC transfers when oracle-verified delays trigger smart contract execution. No manual claims process.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Oracle-Verified Data</h3>
                    <p className="text-neutral-300">Switchboard oracles provide real-time, multi-source flight data with freshness checks for reliable delay verification.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Transparent On-Chain</h3>
                    <p className="text-neutral-300">All policy terms, oracle checks, and payouts are auditable on-chain. Complete transparency, zero opacity.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Community Ownership</h3>
                    <p className="text-neutral-300">Democratic governance and surplus redistribution align incentives with travelers. Owned by the community, for the community.</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-6">
                <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 rounded-xl p-6 border border-purple-500/20">
                  <h4 className="text-lg font-semibold text-white mb-3">Why Choose ZYURA?</h4>
                  <ul className="space-y-2 text-neutral-300">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span>No claims forms or paperwork</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <span>Instant automated payouts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Fully transparent on-chain</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section data-section="about" className="w-full bg-black">
        <AboutUs1 />
      </section>

      {/* Benefits Section */}
      <section data-section="features" className="w-full py-20 px-4 bg-black">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
              Why Choose ZYURA?
            </h2>
            <p className="text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto">
              Discover the advantages of instant, automated flight delay protection powered by Solana.
            </p>
          </div>
          <BentoGrid1 />
        </div>
      </section>

      {/* FAQ Section */}
      <section data-section="faq" className="w-full py-20 px-4 bg-black">
        <div className="container mx-auto">
          <Faq1 />
        </div>
      </section>

      {/* Contact Section */}
      <div data-section="contact">
        <ContactUs1 />
      </div>
      
      {/* Footer Section */}
      <section id="about" className="relative bg-black">
        <div className="relative z-20">
          <Footerdemo />
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
