'use client';

const logos = [
  'Fence Contractors',
  'Landscaping Pros',
  'Home Builders',
  'Property Managers',
  'Material Suppliers',
  'Installation Teams',
];

export function LogoMarquee() {
  return (
    <div className="relative overflow-hidden py-8">
      <div className="flex animate-marquee gap-12 whitespace-nowrap">
        {[...logos, ...logos].map((name, i) => (
          <span
            key={i}
            className="text-lg font-semibold text-slate-300 sm:text-xl"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
