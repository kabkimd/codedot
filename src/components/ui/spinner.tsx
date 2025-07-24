import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'

interface SpinnerProps extends React.HTMLAttributes<SVGSVGElement> {}

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, ...props }, ref) => (
    <Loader2
      ref={ref}
      className={cn('animate-spin text-primary', className)}
      {...props}
    />
  )
)
Spinner.displayName = 'Spinner'
