import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function AguardandoVinculacao({ user }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-xl">Conta aguardando vinculação</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Sua conta ainda não está vinculada a nenhuma igreja. Entre em contato com o administrador da sua igreja para que ele associe seu acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.email && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-4 py-2">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Informe seu email ao administrador para que ele possa te adicionar ao sistema.
          </p>
          <Button variant="outline" size="sm" onClick={() => base44.auth.logout()}>
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}