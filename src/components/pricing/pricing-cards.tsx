'use client'

import { useState } from 'react'
import { Check, Zap, Shield, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { initializeSubscriptionPayment, verifyAndUpdateSubscription } from '@/app/actions/subscription-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PricingCardsProps {
  currentTier?: string
  isAuthenticated?: boolean
}

export function PricingCards({ currentTier = 'free', isAuthenticated = false }: PricingCardsProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const router = useRouter()

  const handleSubscribe = async (tier: 'pro' | 'enterprise') => {
    router.push('/upgrade')
  }

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      badge: 'Free',
      priceMonthly: 0,
      priceAnnual: 0,
      description: 'Single documents and basic extractions.',
      features: [
        { text: '5 document pages total', included: true },
        { text: 'Single file upload', included: true },
        { text: 'Interactive editor', included: true },
        { text: 'Multi-format exports', included: true },
        { text: 'Secure data handling', included: true },
      ],
      buttonText: currentTier === 'free' ? 'Current Plan' : 'Get Started',
      highlighted: false,
    },
    {
      id: 'pro',
      name: 'Professional',
      badge: 'Popular',
      priceMonthly: 19,
      priceAnnual: 190,
      description: 'Daily document processing and batching.',
      features: [
        { text: '20 pages per day', included: true },
        { text: 'Batch file processing', included: true },
        { text: 'Fast queue', included: true },
        { text: 'Interactive grid editor', included: true },
        { text: 'Multi-format exports', included: true },
        { text: 'Priority support', included: true },
      ],
      buttonText: currentTier === 'pro' ? 'Current Plan' : 'Subscribe to Pro ($19/mo)',
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      badge: 'Scale',
      priceMonthly: 150,
      priceAnnual: 1500,
      description: 'High volume, team portals & data insights.',
      features: [
        { text: 'Unlimited document extractions', included: true },
        { text: 'Spreadsheet Integration & Sync', included: true },
        { text: 'Priority Processing', included: true },
        { text: 'Dedicated Account Manager', included: true },
      ],
      buttonText: currentTier === 'enterprise' ? 'Current Plan' : 'Subscribe to Enterprise ($150/mo)',
      highlighted: false,
    },
  ]

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-muted/30 border-y border-border/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4">
            <Zap className="w-3.5 h-3.5" />
            Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight font-serif text-foreground mb-4">
            Simple Plans for Every Workload
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Choose the plan that fits your workflow. Upgrade or cancel anytime.
          </p>

          <div className="inline-flex items-center p-1 mt-8 bg-background border border-border rounded-md shadow-xs">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 rounded-md">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceAnnual / 12)
            const isCurrent = currentTier === plan.id

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 sm:p-8 bg-card border rounded-md shadow-sm transition-all duration-200 hover:shadow-md ${
                  plan.highlighted
                    ? 'border-primary ring-1 ring-primary/20 bg-gradient-to-b from-card via-card to-primary/5'
                    : plan.id === 'enterprise'
                    ? 'border-primary/40 bg-gradient-to-b from-card via-card to-primary/5'
                    : 'border-border/80'
                }`}
              >
                {plan.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                      plan.highlighted
                        ? 'bg-primary text-primary-foreground'
                        : plan.id === 'enterprise'
                        ? 'bg-primary text-primary-foreground font-black'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold font-serif text-foreground">{plan.name}</h3>
                    {plan.id === 'pro' && <Zap className="w-5 h-5 text-primary" />}
                    {plan.id === 'enterprise' && <Shield className="w-5 h-5 text-primary" />}
                  </div>

                  <p className="text-xs text-muted-foreground mb-6 min-h-[32px]">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground font-sans">
                      ${price}
                    </span>
                    <span className="text-xs text-muted-foreground">/ mo</span>
                  </div>

                  <div className="border-t border-border/50 pt-6 mb-8">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      Included:
                    </h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                          {feature.included ? (
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                          )}
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <Button
                    onClick={() => {
                      if (plan.id === 'free') {
                        router.push('/auth')
                      } else {
                        handleSubscribe(plan.id as 'pro' | 'enterprise')
                      }
                    }}
                    disabled={isCurrent || loadingTier === plan.id}
                    variant={plan.highlighted ? 'default' : plan.id === 'enterprise' ? 'default' : 'outline'}
                    className={`w-full py-4 text-xs font-semibold rounded-md shadow-xs ${
                      plan.highlighted
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : plan.id === 'enterprise'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 font-bold'
                        : ''
                    }`}
                  >
                    {loadingTier === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : (
                      plan.buttonText
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
