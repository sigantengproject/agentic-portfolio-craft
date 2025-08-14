import { useAuth } from '@/hooks/useAuth';
import { Auth } from '@/components/Auth';
import { Dashboard } from '@/components/Dashboard';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
};

export default Index;
