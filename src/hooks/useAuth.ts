// Re-export from the global AuthContext so all components share one subscription.
// All existing imports (from '@/hooks/useAuth') continue to work unchanged.
export { useAuth } from '@/contexts/AuthContext';
