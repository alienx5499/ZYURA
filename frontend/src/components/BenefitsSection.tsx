"use client";
import React from "react";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { Zap, FileText, Layers, ShieldCheck, GaugeCircle, Globe, CreditCard, Users, DollarSign } from "lucide-react";
import { CreditCardHero } from "./ruixen/credit-card-hero";

const features = [
  {
    Icon: Zap,
    name: "Instant Automated Payouts",
    description: "Sub-second USDC transfers when oracle-verified delays trigger smart contract execution. No claims forms or manual processing.",
    href: "#",
    cta: "Learn More",
    className: "md:col-span-2",
    background: <div className="absolute inset-0 bg-gradient-to-br from-green-900/50 to-black opacity-30 group-hover:opacity-50 transition-opacity" />,
  },
  {
    Icon: ShieldCheck,
    name: "Oracle-Verified Protection",
    description: "Switchboard oracles provide real-time, multi-source flight data with freshness checks for reliable delay verification.",
    href: "#",
    cta: "Learn More",
    className: "md:col-span-1",
    background: <div className="absolute inset-0 bg-gradient-to-br from-orange-900/50 to-black opacity-30 group-hover:opacity-50 transition-opacity" />,
  },
  {
    Icon: Globe,
    name: "Transparent On-Chain",
    description: "All policy terms, oracle checks, and payouts are auditable on-chain. Complete transparency with zero opacity—you can verify everything.",
    href: "#",
    cta: "Learn More",
    className: "md:col-span-2",
    background: <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/50 to-black opacity-30 group-hover:opacity-50 transition-opacity" />,
  },
  {
    Icon: Users,
    name: "Community Ownership",
    description: "Democratic governance and surplus redistribution align incentives with travelers. Owned by the community, for the community.",
    href: "#",
    cta: "Learn More",
    className: "md:col-span-1",
    background: <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-black opacity-30 group-hover:opacity-50 transition-opacity" />,
  },
  {
    Icon: CreditCard,
    name: "Seamless Checkout Integration",
    description: "Purchase parametric cover directly at booking. OTAs and airline partners can bundle protection with zero friction for travelers.",
    href: "#",
    cta: "Learn More",
    className: "md:col-span-1",
    background: <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-black opacity-30 group-hover:opacity-50 transition-opacity" />,
  },
  {
    Icon: DollarSign,
    name: "Micro-Insurance Pricing",
    description: "Affordable, event-based coverage. Solana's low fees make instant micro-payouts viable. Transparent pricing with no hidden costs.",
    href: "#",
    cta: "Learn More",
    className: "md:col-span-1",
    background: <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-black opacity-30 group-hover:opacity-50 transition-opacity" />,
  },
];

const BenefitsSection = () => {
  return (
    <section id="benefits" className="w-full py-20 px-4 bg-black">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Why Choose ZYURA?
          </h2>
          <p className="text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto">
            Discover the advantages of instant, automated flight delay protection powered by Solana blockchain.
          </p>
        </div>

        <BentoGrid>
          {features.map((feature, idx) => (
            <BentoCard key={idx} {...feature} />
          ))}
        </BentoGrid>

        {/* Payment Showcase */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
              See ZYURA in Action
            </h3>
            <p className="text-lg text-neutral-300 max-w-2xl mx-auto">
              Experience how instant automated payouts work when flight delays occur
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <CreditCardHero
              headline="Purchase Flight Delay Cover"
              subtext="Buy parametric insurance at checkout. When delays happen, oracle-verified data triggers instant USDC payouts to your wallet automatically."
              cta="Try It Now"
              onCtaClick={() => {
                const contactSection = document.querySelector('section:last-of-type');
                if (contactSection) {
                  contactSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              primaryCardImage="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=250&fit=crop&crop=center"
              secondaryCardImage="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=250&fit=crop&crop=center"
              className="bg-gradient-to-br from-gray-900 via-black to-gray-800 border-gray-700/50"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;