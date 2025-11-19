'use client';

import { useEffect } from 'react';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zyura.vercel.app';
// Using ZYURA SVG logo from /public/logo.svg for all images and logos
const logoUrl = `${baseUrl}/logo.svg`;

export function StructuredData() {
  useEffect(() => {
    // Organization Schema
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'ZYURA',
      url: baseUrl,
      logo: logoUrl,
      description: 'Instant, fair, community-owned flight delay insurance on Solana. Automated USDC payouts for flight delays powered by smart contracts and oracle data.',
      foundingDate: '2024',
      founders: [
        {
          '@type': 'Person',
          name: 'ZYURA Team',
        },
      ],
      sameAs: [
        'https://github.com/alienX5499/ZYURA',
        'https://x.com/alienx5499',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        availableLanguage: ['English'],
      },
      areaServed: 'Worldwide',
      knowsAbout: [
        'Flight Delay Insurance',
        'Parametric Insurance',
        'DeFi Insurance',
        'Solana Blockchain',
        'Smart Contracts',
        'Oracle Data',
        'USDC Payments',
      ],
    };

    // WebSite Schema
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ZYURA',
      url: baseUrl,
      description: 'Instant, automated USDC payouts for flight delays on Solana. No claims forms, no adjusters—just transparent, community-governed protection.',
      publisher: {
        '@type': 'Organization',
        name: 'ZYURA',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/dashboard?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
      inLanguage: 'en-US',
    };

    // FinancialService Schema
    const financialServiceSchema = {
      '@context': 'https://schema.org',
      '@type': 'FinancialService',
      name: 'ZYURA Flight Delay Insurance',
      description: 'Parametric flight delay insurance with instant USDC payouts on Solana blockchain. Automated claims processing through smart contracts and oracle verification.',
      provider: {
        '@type': 'Organization',
        name: 'ZYURA',
      },
      areaServed: 'Worldwide',
      serviceType: 'Insurance',
      category: 'Travel Insurance',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USDC',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/dashboard`,
      },
      termsOfService: `${baseUrl}/terms`,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '127',
        bestRating: '5',
        worstRating: '1',
      },
    };

    // Product Schema
    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'ZYURA Flight Delay Insurance',
      description: 'Instant parametric flight delay insurance with automated USDC payouts. Powered by Solana blockchain, Switchboard oracles, and smart contracts.',
      brand: {
        '@type': 'Brand',
        name: 'ZYURA',
      },
      category: 'Travel Insurance',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USDC',
        availability: 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          priceCurrency: 'USDC',
          price: 'Variable',
        },
      },
      feature: [
        'Instant automated payouts',
        'No claims forms required',
        'Transparent on-chain operations',
        'Oracle-verified delays',
        'Community governance',
        'Soulbound NFT policy proof',
        'Sub-second transaction speed',
      ],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '127',
      },
    };

    // FAQPage Schema for GEO
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is ZYURA?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ZYURA is an instant, fair, community-owned flight delay insurance platform on Solana. When your flight is delayed beyond a defined threshold, smart contracts automatically trigger instant USDC payouts—no claims forms, no adjusters, no waiting. All terms, payouts, and accounting are 100% transparent on-chain.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does ZYURA flight delay insurance work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ZYURA uses parametric insurance powered by Solana smart contracts. You purchase coverage for your flight, and if the flight is delayed beyond the threshold (verified by Switchboard oracles), the smart contract automatically transfers USDC from the risk pool vault to your wallet. No manual claims process required.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is parametric insurance?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Parametric insurance pays out automatically when a specific, measurable event occurs (like a flight delay exceeding a threshold). Unlike traditional insurance that requires claims assessment, parametric insurance uses objective data (oracle-verified flight delays) to trigger instant payouts.',
          },
        },
        {
          '@type': 'Question',
          name: 'How fast are payouts on ZYURA?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Payouts are instant—sub-second USDC transfers from the risk pool vault to your wallet once the delay threshold is verified by the oracle. This is made possible by Solana\'s high-speed blockchain and automated smart contract execution.',
          },
        },
        {
          '@type': 'Question',
          name: 'What blockchain does ZYURA use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ZYURA is built on Solana blockchain, which enables high-speed transactions (sub-second finality) and low fees, making instant micro-payouts economically viable. All insurance operations, policy data, and payouts are recorded on-chain.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to file a claim?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. ZYURA uses automated parametric insurance. When your flight delay exceeds the threshold, verified by Switchboard oracles, the smart contract automatically processes the payout. There are no claims forms, no adjusters, and no waiting period.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is a soulbound NFT policy?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'When you purchase insurance on ZYURA, you receive a non-transferable (soulbound) NFT as proof of your policy. This NFT contains all policy details on-chain and cannot be traded, ensuring authenticity and preventing policy fraud.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is flight delay data verified?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ZYURA uses Switchboard oracles to verify flight delay data from multiple sources. The oracle aggregates data from flight APIs, reconciles discrepancies, and updates on-chain accounts. The smart contract checks this oracle data to determine if payout conditions are met.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the risk pool?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The risk pool is a USDC vault that holds premiums from policyholders and liquidity provider deposits. When a payout is triggered, USDC is automatically transferred from this vault to the policyholder\'s wallet. Liquidity providers earn yield on their deposits.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is ZYURA decentralized?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. ZYURA is built on Solana blockchain with smart contracts that execute automatically. All policy terms, payouts, and accounting are transparent and auditable on-chain. The protocol is designed to evolve into a community-governed model with surplus sharing.',
          },
        },
        {
          '@type': 'Question',
          name: 'What payment method does ZYURA accept?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ZYURA uses USDC (USD Coin) on Solana for all transactions. You pay premiums in USDC and receive payouts in USDC. You need a Solana-compatible wallet (like Phantom) to interact with the platform.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I get a refund if my flight is not delayed?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Insurance premiums are non-refundable. You pay for coverage during the specified time window. If your flight is not delayed beyond the threshold, no payout occurs, but the premium covers the risk protection you received.',
          },
        },
      ],
    };

    // HowTo Schema
    const howToSchema = {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Purchase Flight Delay Insurance on ZYURA',
      description: 'Step-by-step guide to purchasing instant flight delay insurance on ZYURA using Solana blockchain.',
      image: logoUrl,
      totalTime: 'PT5M',
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: 'USDC',
        value: 'Variable',
      },
      tool: [
        {
          '@type': 'HowToTool',
          name: 'Solana Wallet (Phantom recommended)',
        },
        {
          '@type': 'HowToTool',
          name: 'USDC on Solana',
        },
      ],
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Connect Your Wallet',
          text: 'Visit ZYURA dashboard and connect your Solana-compatible wallet (Phantom, Solflare, etc.).',
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Enter Flight Details',
          text: 'Enter your flight number, departure date, and departure time. Optionally, enter your PNR code for automatic data fetching.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Select Insurance Product',
          text: 'Choose an insurance product that matches your coverage needs (delay threshold, coverage amount, premium rate).',
        },
        {
          '@type': 'HowToStep',
          position: 4,
          name: 'Review and Purchase',
          text: 'Review the policy terms, premium amount, and coverage details. Approve the transaction in your wallet to purchase the policy.',
        },
        {
          '@type': 'HowToStep',
          position: 5,
          name: 'Receive Policy NFT',
          text: 'Once the transaction is confirmed, you will receive a soulbound NFT as proof of your policy. The policy is now active.',
        },
        {
          '@type': 'HowToStep',
          position: 6,
          name: 'Automatic Payout',
          text: 'If your flight is delayed beyond the threshold (verified by oracle), you will automatically receive USDC payout in your wallet—no claims needed.',
        },
      ],
    };

    // BreadcrumbList Schema
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: baseUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Dashboard',
          item: `${baseUrl}/dashboard`,
        },
      ],
    };

    // Add all schemas to the page
    const schemas = [
      organizationSchema,
      websiteSchema,
      financialServiceSchema,
      productSchema,
      faqSchema,
      howToSchema,
      breadcrumbSchema,
    ];

    schemas.forEach((schema, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = `structured-data-${index}`;
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    // Cleanup function
    return () => {
      schemas.forEach((_, index) => {
        const script = document.getElementById(`structured-data-${index}`);
        if (script) {
          script.remove();
        }
      });
    };
  }, []);

  return null;
}

