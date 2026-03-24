'use client';

import { useState } from 'react';

export function TiltCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [transform, setTransform] = useState('perspective(900px) rotateX(0deg) rotateY(0deg)');

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 10;
    const rotateX = (0.5 - (y / rect.height)) * 10;
    setTransform(`perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`);
  }

  function onLeave() {
    setTransform('perspective(900px) rotateX(0deg) rotateY(0deg)');
  }

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ transform, transition: 'transform 220ms ease' }}
    >
      {children}
    </div>
  );
}

