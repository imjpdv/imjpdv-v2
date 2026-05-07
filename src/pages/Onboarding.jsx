import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Onboarding({ user, onComplete }) {
  const [nomeIgreja, setNomeIgreja] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCriar = async () => {
    if (!nomeIgreja.trim()) return toast.error('Informe o nome da igreja.');
    setSaving(true);

    // 1. Criar a Igreja
    const igreja = await base44.entities.Igreja.create({ nome: nomeIgreja.trim() });

    // 2. Vincular o usuário à igreja como admin
    await base44.auth.updateMe({ igreja_id: igreja.id, role: 'admin' });

    toast.success('Igreja criada com sucesso!');
    setSaving(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Bem-vindo ao sistema de Tesouraria</CardTitle>
          <CardDescription>
            Para começar, informe o nome da sua igreja. Você será definido como administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-1.5 block">Nome da igreja *</Label>
            <Input
              placeholder="Ex: Igreja Batista Central"
              value={nomeIgreja}
              onChange={(e) => setNomeIgreja(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCriar()}
              autoFocus
            />
          </div>
          <Button className="w-full" onClick={handleCriar} disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Criar minha igreja</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}