'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
    theme: Theme;
    resolvedTheme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'theme-preference';

function getSystemTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'light';
        const storedTheme = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
        return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : getSystemTheme();
    });

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.style.colorScheme = theme;
    }, [theme]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const storedTheme = window.localStorage.getItem(STORAGE_KEY);
            if (!storedTheme) {
                const nextTheme = getSystemTheme();
                setThemeState(nextTheme);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const setTheme = (nextTheme: Theme) => {
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
        setThemeState(nextTheme);
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const value = {
        theme,
        resolvedTheme: theme,
        setTheme,
        toggleTheme,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
