import React from "react";
import logoImage from "@/assets/logo.png";

type LogoProps = {
  className?: string
  size?: number
  title?: string
}

const Logo: React.FC<LogoProps> = ({ className, size = 28, title = "SplitMint" }) => {
  const logoSrc = typeof logoImage === 'string' ? logoImage : logoImage.src;
  
  return (
    <img 
      src={logoSrc}
      alt={title}
      width={size} 
      height={size} 
      className={className}
      style={{ display: 'inline-block' }}
    />
  );
}

export { Logo }


