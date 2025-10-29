"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { CreditCard, DollarSign, Users } from "lucide-react";

interface SplitMintCardHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  headline: string;
  subtext: string;
  cta: string;
  onCtaClick?: () => void;
}

export const SplitMintCardHero = React.forwardRef<
  HTMLDivElement,
  SplitMintCardHeroProps
>(
  (
    {
      className,
      headline,
      subtext,
      cta,
      onCtaClick,
      ...props
    },
    ref,
  ) => {
    // Track mouse movement for tilt
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = ({
      clientX,
      clientY,
      currentTarget,
    }: React.MouseEvent) => {
      const { left, top, width, height } =
        currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    };

    const rotateX = useTransform(mouseY, [0, 400], [8, -8]);
    const rotateY = useTransform(mouseX, [0, 600], [-8, 8]);
    const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 20 });
    const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 20 });

    return (
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          mouseX.set(300);
          mouseY.set(200);
        }}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative flex flex-col items-center justify-center text-center border-12 px-6 py-20 bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl shadow-lg border-gray-700/50",
          className,
        )}
      >
        {/* Text */}
        <div className="relative z-20">
          <h2 className="text-4xl font-bold text-white max-w-xl mb-4">
            {headline}
          </h2>
          <p className="mt-4 text-base text-neutral-300 max-w-md mb-8">
            {subtext}
          </p>
          <button
            onClick={onCtaClick}
            className="mt-8 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-6 py-3 text-sm font-medium text-white cursor-pointer transition-all duration-300 transform hover:scale-105"
          >
            {cta}
          </button>
        </div>

        {/* Floating Cards OUTSIDE the content */}

        {/* SplitMint Card - bottom left */}
        <motion.div
          style={{ transform: "translateZ(50px)" }}
          className="absolute -bottom-20 -left-28 h-44 w-80 rounded-xl bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 shadow-2xl z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/90 via-purple-700/90 to-purple-800/90 rounded-xl" />
          <div className="absolute inset-0 bg-black/20 rounded-xl" />
          <div className="relative z-10 p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <CreditCard className="h-3 w-3" />
                </div>
                <span className="text-xs font-semibold">SPLITMINT</span>
              </div>
              <div className="text-xs">VISA</div>
            </div>
            <p className="text-base font-semibold tracking-widest mb-2">**** 4590</p>
            <div className="flex justify-between text-xs">
              <span>SARAH CHEN</span>
              <span>11/29</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-semibold">$127.50</span>
            </div>
          </div>
        </motion.div>

        {/* Group Card - top right */}
        <motion.div
          style={{ transform: "translateZ(40px)" }}
          className="absolute -top-12 -right-24 h-32 w-60 rounded-xl bg-gradient-to-br from-cyan-600 via-cyan-700 to-cyan-800 shadow-xl z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/90 via-cyan-700/90 to-cyan-800/90 rounded-xl" />
          <div className="absolute inset-0 bg-black/20 rounded-xl" />
          <div className="relative z-10 p-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span className="text-xs font-semibold">GROUP</span>
              </div>
              <div className="text-xs">MC</div>
            </div>
            <p className="text-sm font-semibold tracking-widest mb-1">**** 7421</p>
            <div className="flex justify-between text-[11px] mb-2">
              <span>JOHN DOE</span>
              <span>07/31</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span className="text-xs font-semibold">$63.75</span>
            </div>
          </div>
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          style={{ transform: "translateZ(30px)" }}
          className="absolute top-8 left-8 w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center z-5"
        >
          <DollarSign className="h-6 w-6 text-purple-300" />
        </motion.div>

        <motion.div
          style={{ transform: "translateZ(25px)" }}
          className="absolute bottom-8 right-8 w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center z-5"
        >
          <Users className="h-5 w-5 text-cyan-300" />
        </motion.div>
      </motion.div>
    );
  },
);

SplitMintCardHero.displayName = "SplitMintCardHero";
