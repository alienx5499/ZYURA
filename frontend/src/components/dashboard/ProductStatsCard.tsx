'use client';

import { motion } from 'framer-motion';

interface ProductStatsCardProps {
  productInfo: any;
}

export function ProductStatsCard({ productInfo }: ProductStatsCardProps) {
  if (!productInfo) return null;

  const toNumber = (v: any): number | undefined => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return parseFloat(v);
    if (typeof v === 'object' && 'toString' in v) {
      const str = v.toString();
      return parseFloat(str);
    }
    return undefined;
  };

  const idNum = toNumber(productInfo.product_id ?? productInfo.productId ?? productInfo.id);
  const delayMin = toNumber(productInfo.delay_threshold_minutes ?? productInfo.delayThresholdMinutes);
  const coverageAmount = toNumber(productInfo.coverage_amount ?? productInfo.coverageAmount);
  const premiumBps = toNumber(productInfo.premium_rate_bps ?? productInfo.premiumRateBps);
  const claimHours = toNumber(productInfo.claim_window_hours ?? productInfo.claimWindowHours);
  const isActive = productInfo.active !== undefined ? Boolean(productInfo.active) : undefined;

  const coverageUsd = coverageAmount
    ? (coverageAmount / 1_000_000).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      })
    : '—';

  const premiumPct = premiumBps ? `${(premiumBps / 100).toFixed(2)}%` : '—';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-black border border-dark-border rounded-xl p-6"
    >
      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-indigo-500 rounded-full"></span>
        Product Details
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-dark-border bg-dark-elevated/30 p-4">
          <div className="text-xs text-gray-400 mb-1">Product ID</div>
          <div className="text-white text-lg font-semibold">{idNum ?? '—'}</div>
        </div>

        <div className="rounded-lg border border-dark-border bg-dark-elevated/30 p-4">
          <div className="text-xs text-gray-400 mb-1">Delay Threshold</div>
          <div className="text-white text-lg font-semibold">
            {delayMin ?? '—'}{typeof delayMin === 'number' ? ' min' : ''}
          </div>
        </div>

        <div className="rounded-lg border border-dark-border bg-dark-elevated/30 p-4">
          <div className="text-xs text-gray-400 mb-1">Coverage Amount</div>
          <div className="text-emerald-400 text-lg font-semibold">{coverageUsd}</div>
        </div>

        <div className="rounded-lg border border-dark-border bg-dark-elevated/30 p-4">
          <div className="text-xs text-gray-400 mb-1">Premium Rate</div>
          <div className="text-white text-lg font-semibold">{premiumPct}</div>
        </div>

        <div className="rounded-lg border border-dark-border bg-dark-elevated/30 p-4">
          <div className="text-xs text-gray-400 mb-1">Claim Window</div>
          <div className="text-white text-lg font-semibold">
            {claimHours ?? '—'}{typeof claimHours === 'number' ? ' hrs' : ''}
          </div>
        </div>

        <div className="rounded-lg border border-dark-border bg-dark-elevated/30 p-4">
          <div className="text-xs text-gray-400 mb-1">Status</div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium border ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            {isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

