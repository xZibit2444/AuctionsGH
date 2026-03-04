import { cn } from '@/lib/utils';

interface BadgeProps {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    children: React.ReactNode;
    className?: string;
}

const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-black text-white',
    warning: 'bg-gray-100 text-gray-600',
    danger: 'bg-gray-100 text-gray-500',
    info: 'bg-gray-900 text-white',
};

export default function Badge({
    variant = 'default',
    children,
    className,
}: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 text-[10px] font-black tracking-widest uppercase',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
