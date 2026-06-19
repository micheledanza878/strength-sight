import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Settings() {
  const navigate = useNavigate();
  const [notifiche, setNotifiche] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Switch
        checked={notifiche}
        onCheckedChange={(checked) => setNotifiche(checked)}
      >
        Notifiche
      </Switch>
      <Button onClick={handleLogout} disabled={loading}>Logout</Button>
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}