import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { MapPin, Users } from 'lucide-react';

export default function FooterIgreja() {
  const { user } = useCurrentUser();
  const [churchSettings, setChurchSettings] = useState(null);

  useEffect(() => {
    if (!user?.igreja_id) return;
    base44.entities.ChurchSettings.filter({ igreja_id: user.igreja_id }, '-created_date', 1)
      .then(cs => setChurchSettings(cs[0] || null));
  }, [user?.igreja_id]);

  if (!churchSettings) return null;
  if (!churchSettings.church_name && !churchSettings.address && !churchSettings.pastors) return null;

  return (
    <footer className="border-t border-border/40 py-6 px-4 text-center space-y-1 bg-card">
      {churchSettings.church_name && (
        <p className="text-sm font-display font-bold text-foreground">{churchSettings.church_name}</p>
      )}
      {churchSettings.address && (
        <p className="text-xs font-body text-muted-foreground flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" /> {churchSettings.address}
        </p>
      )}
      {churchSettings.pastors && (
        <p className="text-xs font-body text-muted-foreground flex items-center justify-center gap-1">
          <Users className="w-3 h-3" /> {churchSettings.pastors}
        </p>
      )}
    </footer>
  );
}