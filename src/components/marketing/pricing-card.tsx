import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  popular?: boolean;
  popularLabel?: string;
  href?: string;
}

export function PricingCard({
  name,
  description,
  price,
  period,
  features,
  cta,
  popular,
  popularLabel,
  href = '/signup',
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground ring-foreground/10 relative flex flex-col gap-4 overflow-hidden rounded-xl py-4 text-sm ring-1',
        popular && 'ring-primary shadow-lg ring-2'
      )}
    >
      {popular && (
        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          {popularLabel}
        </Badge>
      )}
      <div
        data-slot="card-header"
        className="grid auto-rows-min items-start gap-1 rounded-t-xl px-4"
      >
        <div
          data-slot="card-title"
          className="font-heading text-base leading-snug font-medium"
        >
          {name}
        </div>
        <div
          data-slot="card-description"
          className="text-muted-foreground text-sm"
        >
          {description}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground text-sm">{period}</span>
        </div>
      </div>
      <div data-slot="card-content" className="flex-1 px-4">
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        data-slot="card-footer"
        className="bg-muted/50 flex items-center rounded-b-xl border-t p-4"
      >
        <a
          href={href}
          className={cn(
            buttonVariants({ variant: popular ? 'default' : 'outline' }),
            'w-full'
          )}
        >
          {cta}
        </a>
      </div>
    </div>
  );
}
