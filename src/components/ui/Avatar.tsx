import Image from 'next/image';
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
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-full bg-gray-100 text-black flex items-center justify-center font-bold ring-2 ring-white',
                sizes[size],
                className
            )}
        >
            <Image
                src={src || '/avatar-placeholder.svg'}
                alt={name}
                fill
                sizes={size === 'lg' ? '56px' : size === 'md' ? '40px' : '32px'}
                className={cn('object-cover', !src && 'opacity-60')}
            />
            {!src && <span className="relative z-10">{getInitials(name)}</span>}
        </div>
    );
}
