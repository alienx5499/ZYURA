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
    text: "ZYURA saved me thousands when my flight was delayed 4 hours. The automatic payout hit my wallet before I even landed. This is the future of travel insurance!",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    name: "Sarah Chen",
    role: "Frequent Traveler"
  },
  {
    text: "Finally, insurance that actually works! No paperwork, no waiting weeks for claims. The smart contracts handle everything automatically based on real flight data.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    name: "Marcus Rodriguez",
    role: "Business Traveler"
  },
  {
    text: "The parametric insurance model is brilliant. I get paid instantly when my flight is delayed, and the oracle data ensures it's always accurate. Game changer!",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    name: "Emily Johnson",
    role: "Tech Professional"
  },
  {
    text: "I've been using ZYURA for all my flights. The peace of mind knowing I'm covered automatically is priceless. Traditional insurance can't compete.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    name: "David Kim",
    role: "Digital Nomad"
  },
  {
    text: "The rebooking feature is incredible. When my original flight was cancelled, I could opt for a new flight and still maintain coverage. So smart!",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    name: "Lisa Wang",
    role: "Travel Consultant"
  },
  {
    text: "ZYURA's integration with MetaMask makes it incredibly easy to use. Buy insurance, get covered, and receive payouts all in one seamless experience.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    name: "Alex Thompson",
    role: "Web3 Enthusiast"
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
              "ZYURA",
              "Flight Insurance",
              "Parametric Coverage",
              "Smart Contracts",
              "Decentralized Insurance"
            ]}
            morphTime={3}
            cooldownTime={2}
            className="h-32 flex items-center justify-center"
            textClassName="text-white font-bold"
          />
        </div>
        <p className="text-neutral-300 cursor-default text-center text-xl md:text-2xl mt-4 relative z-20">
          Decentralized Parametric Flight Insurance on Arbitrum
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
              Why Choose ZYURA?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Experience the future of travel insurance with blockchain-powered automation
            </p>
          </div>
          
          <BentoGrid className="max-w-4xl mx-auto">
            <BentoCard
              name="Automatic Payouts"
              className="col-span-3 md:col-span-1"
              description="Get paid instantly when your flight is delayed or cancelled. No paperwork, no waiting weeks for claims processing."
              href="#"
              cta="Learn More"
              Icon={Shield}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              }
            />
            
            <BentoCard
              name="Parametric Insurance"
              className="col-span-3 md:col-span-2"
              description="Coverage based on real flight data from oracles. Smart contracts automatically trigger payouts when conditions are met."
              href="#"
              cta="How It Works"
              Icon={Zap}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              }
            />
            
            <BentoCard
              name="Arbitrum Powered"
              className="col-span-3 md:col-span-2"
              description="Built on Arbitrum's fast, secure, and cost-effective network with USDC for stable, reliable payouts."
              href="#"
              cta="Explore Arbitrum"
              Icon={Lock}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              }
            />
            
            <BentoCard
              name="Global Coverage"
              className="col-span-3 md:col-span-1"
              description="Insure flights to and from anywhere in the world. Blockchain technology knows no borders."
              href="#"
              cta="Get Coverage"
              Icon={Globe}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              }
            />
            
            <BentoCard
              name="Easy Integration"
              className="col-span-3"
              description="Connect your MetaMask wallet and purchase insurance in minutes. Simple, secure, and user-friendly interface."
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
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Trusted by travelers worldwide who have experienced the power of decentralized insurance
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
