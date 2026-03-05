// Auth group layout — strips the main navigation and footer
// so that login/signup pages are full-screen, uncluttered.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-white">
            {children}
        </div>
    );
}
