import React from 'react';

/**
 * Official Freshioz Brand Logo
 * Loads the authentic high-resolution 3D glossy logo asset:
 * "Freshioz • FRUITS, VEGETABLES & MORE •"
 */
export default function FreshiozLogo({ height = 44, className = '', showTagline = true, variant = 'standard' }) {
  const isWhiteVariant = variant === 'white';

  return (
    <div 
      className={`inline-flex items-center select-none ${className}`} 
      style={{ 
        lineHeight: 1,
        ...(isWhiteVariant ? {
          background: '#FFFFFF',
          padding: '4px 10px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          display: 'inline-flex'
        } : {})
      }}
    >
      <img
        src="/freshioz-logo.png"
        alt="Freshioz - Fruits, Vegetables & More"
        style={{
          height: `${height}px`,
          width: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
        loading="eager"
      />
    </div>
  );
}
