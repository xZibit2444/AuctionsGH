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
    name,
    size = 'md',
    className,
}: AvatarProps) {
    return (
        <div
            className={cn(
                'rounded-full bg-gray-100 text-black flex items-center justify-center font-bold ring-2 ring-white',
                sizes[size],
                className
            )}
        >
            {getInitials(name)}
        </div>
    );
}
