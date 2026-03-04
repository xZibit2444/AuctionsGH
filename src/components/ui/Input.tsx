import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    prefix?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, prefix, id, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label
                        htmlFor={id}
                        className="block text-xs font-bold text-black uppercase tracking-widest"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {prefix && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                            {prefix}
                        </span>
                    )}
                    <input
                        ref={ref}
                        id={id}
                        className={cn(
                            'w-full border border-gray-200 bg-white px-4 py-3 text-base sm:text-sm text-black placeholder-gray-400',
                            'focus:border-black focus:ring-2 focus:ring-black focus:ring-offset-0 focus:outline-none',
                            'disabled:bg-gray-50 disabled:cursor-not-allowed',
                            'transition-colors duration-150',
                            prefix && 'pl-10',
                            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs font-medium text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
