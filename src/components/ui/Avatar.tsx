import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
    src?: string | null;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
};

export default function Avatar({
    src,
    name,
    size = 'md',
    className,
}: AvatarProps) {
    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className={cn(
                    'rounded-full object-cover ring-2 ring-white dark:ring-gray-800',
                    sizes[size],
                    className
                )}
            />
        );
    }

    return (
        <div
            className={cn(
                'rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-semibold ring-2 ring-white dark:ring-gray-800',
                sizes[size],
                className
            )}
        >
            {getInitials(name)}
        </div>
    );
}
