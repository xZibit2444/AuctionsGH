'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
    collapsed?: boolean;
    variant?: 'sidebar' | 'drawer';
}

export default function ThemeToggle({ collapsed = false, variant = 'sidebar' }: ThemeToggleProps) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const Icon = isDark ? Sun : Moon;
    const label = isDark ? 'Light mode' : 'Dark mode';

    if (variant === 'drawer') {
        return (
            <button
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 rounded-[3px] px-3 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                aria-label={label}
            >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {label}
            </button>
        );
    }

    if (collapsed) {
        return (
            <button
                onClick={toggleTheme}
                title={label}
                className="p-1.5 text-gray-400 hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] rounded-[3px] transition-colors"
                aria-label={label}
            >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="group w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all rounded-[3px] dark:text-gray-400 dark:hover:text-white dark:hover:bg-zinc-900"
            aria-label={label}
        >
            <Icon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" strokeWidth={1.5} />
            {label}
        </button>
    );
}
