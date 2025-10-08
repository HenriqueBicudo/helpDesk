import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Lock, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Dados do perfil
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
  });
  
  // Dados de senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  // Erros de validação
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  
  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Não foi possível atualizar seu perfil",
        variant: "destructive",
      });
    },
  });
  
  // Mutation para atualizar senha
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message || "Não foi possível atualizar sua senha",
        variant: "destructive",
      });
    },
  });
  
  // Função para validar o formulário de senha
  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = "Senha atual é obrigatória";
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = "Nova senha é obrigatória";
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = "Nova senha deve ter pelo menos 6 caracteres";
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Senhas não conferem";
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Função para atualizar perfil
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };
  
  // Função para atualizar senha
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validatePasswordForm()) {
      updatePasswordMutation.mutate(passwordData);
    }
  };
  
  if (!user) {
    return null; // Se não estiver logado, não renderiza nada (a rota protegida já faz redirecionamento)
  }
  
  return (
    <AppLayout title="Minha Conta">
      <div className="container mx-auto py-10 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Minha Conta</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">{user.role}</p>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="perfil" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="senha" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Senha
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notificações
          </TabsTrigger>
        </TabsList>
        
        {/* Tab de Perfil */}
        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <Input
                    id="username"
                    value={user.username}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    O nome de usuário não pode ser alterado
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Input
                    id="role"
                    value={user.role}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    A função é definida pelo administrador do sistema
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        {/* Tab de Senha */}
        <TabsContent value="senha">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Atualize sua senha para manter sua conta segura
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirme a Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={updatePasswordMutation.isPending}>
                  {updatePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    "Alterar Senha"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        {/* Tab de Notificações */}
        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">
                Configurações de notificação em desenvolvimento.
                <br />
                Esta funcionalidade estará disponível em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}