import React from "react";
import { SparklesCore } from "@/components/ui/sparkles"
import { Navbar1 } from "@/components/ui/navbar-1"
import { SplashCursor } from "@/components/ui/splash-cursor"
import { useDev } from "@/contexts/DevContext"
import { Footerdemo } from "@/components/ui/footer-section"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { GooeyText } from "@/components/ui/gooey-text-morphing"
import { TestimonialsColumn } from "@/components/blocks/testimonials-columns-1"
import { Shield, Zap, Lock, Globe, Wallet } from "lucide-react"

const testimonials = [
  {
    text: "EscrowZero revolutionized how I trade. No more waiting for escrow releases or worrying about funds being held hostage. The atomic swaps are game-changing!",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    name: "Sarah Chen",
    role: "DeFi Trader"
  },
  {
    text: "Finally, a P2P platform that actually works. The smart contracts handle everything automatically, and I never have to trust a third party again.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    name: "Marcus Rodriguez",
    role: "Crypto Enthusiast"
  },
  {
    text: "The speed and security of Algorand combined with EscrowZero's trustless design is exactly what the market needed. Trading has never been this smooth.",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    name: "Emily Johnson",
    role: "Blockchain Developer"
  },
  {
    text: "I've been using EscrowZero for months now. The peace of mind knowing my funds are always in my control is priceless. Highly recommended!",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    name: "David Kim",
    role: "NFT Collector"
  },
  {
    text: "The atomic transaction groups ensure everything happens at once or not at all. No partial failures, no lost funds. This is how P2P trading should work.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    name: "Lisa Wang",
    role: "Investment Advisor"
  },
  {
    text: "EscrowZero's integration with Pera and Defly wallets makes it incredibly easy to use. The UI is clean and the process is straightforward.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    name: "Alex Thompson",
    role: "Web3 Entrepreneur"
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
      <section className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden relative">
        {/* Floating Navbar */}
        <div className="absolute top-0 left-0 w-full z-30">
          <Navbar1 />
        </div>
        
        <div className="relative z-20 mb-8">
          <GooeyText
            texts={[
              "EscrowZero",
              "Trustless Trading",
              "Atomic Swaps",
              "Smart Contracts",
              "P2P Marketplace"
            ]}
            morphTime={3}
            cooldownTime={2}
            className="h-32 flex items-center justify-center"
            textClassName="text-white font-bold"
          />
        </div>
        <p className="text-neutral-300 cursor-default text-center text-xl md:text-2xl mt-4 relative z-20">
          Trustless P2P Marketplace on Algorand
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
      
      {/* Features Section with Bento Grid */}
      <section id="features" className="w-full py-20 px-4 bg-black relative">
        <div className="max-w-7xl mx-auto relative z-30">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Choose EscrowZero?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Experience the future of P2P trading with blockchain-powered security
            </p>
          </div>
          
          <BentoGrid className="max-w-4xl mx-auto">
            <BentoCard
              name="100% Trustless"
              className="col-span-3 md:col-span-1"
              description="No custodial escrow. Your funds never leave your control with smart contracts eliminating trusted third parties."
              href="#"
              cta="Learn More"
              Icon={Shield}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              }
            />
            
            <BentoCard
              name="Atomic Swaps"
              className="col-span-3 md:col-span-2"
              description="Either the entire trade completes successfully, or nothing happens at all. No partial failures with atomic transaction groups."
              href="#"
              cta="How It Works"
              Icon={Zap}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              }
            />
            
            <BentoCard
              name="Algorand Powered"
              className="col-span-3 md:col-span-2"
              description="Built on Algorand's fast, secure, and carbon-negative blockchain with 4-second finality and low fees."
              href="#"
              cta="Explore Algorand"
              Icon={Lock}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              }
            />
            
            <BentoCard
              name="Global Access"
              className="col-span-3 md:col-span-1"
              description="Trade with anyone, anywhere in the world. Blockchain technology knows no borders."
              href="#"
              cta="Start Trading"
              Icon={Globe}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              }
            />
            
            <BentoCard
              name="Easy Integration"
              className="col-span-3"
              description="Connect your Pera or Defly wallet and start trading in minutes. Simple, secure, and user-friendly interface."
              href="#"
              cta="Connect Wallet"
              Icon={Wallet}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              }
            />
          </BentoGrid>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section id="testimonials" className="w-full py-20 px-4 bg-black relative">
        <div className="max-w-7xl mx-auto relative z-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Trusted by traders worldwide who have experienced the power of trustless P2P trading
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialsColumn
              className="h-96 overflow-hidden"
              testimonials={testimonials}
              duration={15}
            />
            <TestimonialsColumn
              className="h-96 overflow-hidden"
              testimonials={testimonials}
              duration={20}
            />
            <TestimonialsColumn
              className="h-96 overflow-hidden"
              testimonials={testimonials}
              duration={25}
            />
          </div>
        </div>
      </section>
      
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
