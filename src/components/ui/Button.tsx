import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const baseStyles =
            'inline-flex items-center justify-center font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed';

        const variants = {
            primary:
                'bg-black text-white hover:bg-gray-900',
            secondary:
                'bg-white text-black border border-gray-900 hover:bg-gray-50',
            destructive:
                'bg-black text-white hover:bg-gray-900 border border-black',
            ghost:
                'text-black hover:bg-gray-100',
        };

        const sizes = {
            sm: 'text-sm px-4 py-2 gap-1.5',
            md: 'text-sm px-5 py-2.5 gap-2',
            lg: 'text-base px-6 py-3 gap-2',
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
