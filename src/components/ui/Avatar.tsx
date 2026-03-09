import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps {
    src?: string | null;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizes = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-24 w-24',
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
                'relative overflow-hidden bg-gray-100 text-black flex items-center justify-center ring-2 ring-white',
                sizes[size],
                className
            )}
        >
            <Image
                src={src || '/avatar-placeholder.png'}
                alt={name}
                fill
                sizes={size === 'lg' ? '96px' : size === 'md' ? '56px' : '40px'}
                className="object-cover"
            />
        </div>
    );
}
