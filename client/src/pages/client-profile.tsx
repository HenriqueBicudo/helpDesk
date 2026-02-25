import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RichTextEditor } from '@/components/tickets/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { User, Building, Mail, Calendar, Key, Camera, FileSignature } from 'lucide-react';
import { ROLE_LABELS } from '@shared/permissions';

export default function ClientProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [emailSignature, setEmailSignature] = useState(user?.emailSignature || '');
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erro ao atualizar perfil');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso'
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar perfil',
        variant: 'destructive'
      });
    }
  });

  // Mutation para upload de avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/auth/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!res.ok) throw new Error('Erro ao fazer upload do avatar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/current-user'] });
      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada com sucesso'
      });
      setSelectedAvatar(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao fazer upload da foto',
        variant: 'destructive'
      });
    }
  });

  // Mutation para atualizar assinatura de email
  const updateSignatureMutation = useMutation({
    mutationFn: async (signature: string) => {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailSignature: signature })
      });
      if (!res.ok) throw new Error('Erro ao atualizar assinatura');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Sucesso',
        description: 'Assinatura de email atualizada com sucesso'
      });
      setIsEditingSignature(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar assinatura',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    const updates: any = {
      fullName: formData.fullName,
      email: formData.email
    };

    if (formData.currentPassword && formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        toast({
          title: 'Erro',
          description: 'As senhas não coincidem',
          variant: 'destructive'
        });
        return;
      }
      updates.currentPassword = formData.currentPassword;
      updates.newPassword = formData.newPassword;
    }

    updateProfileMutation.mutate(updates);
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 5MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = () => {
    if (selectedAvatar) {
      uploadAvatarMutation.mutate(selectedAvatar);
    }
  };

  const handleSaveSignature = () => {
    updateSignatureMutation.mutate(emailSignature);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppLayout title="Meu Perfil">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Meu Perfil</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie suas informações pessoais e preferências</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar com Avatar e Info */}
          <div className="space-y-4">
            {/* Avatar Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4" />
                  Foto de Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={previewUrl || user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-3xl">
                    {user?.avatarInitials || getInitials(user?.fullName || 'U')}
                  </AvatarFallback>
                </Avatar>

                <div className="w-full space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="w-full"
                  />
                  {selectedAvatar && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleUploadAvatar}
                        disabled={uploadAvatarMutation.isPending}
                        size="sm"
                        className="flex-1"
                      >
                        {uploadAvatarMutation.isPending ? 'Enviando...' : 'Salvar Foto'}
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedAvatar(null);
                          setPreviewUrl(null);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Tamanho máximo: 5MB
                  <br />
                  Formatos: JPG, PNG, GIF, WebP
                </p>
              </CardContent>
            </Card>

            {/* Informações da Empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4" />
                  Empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user?.company || 'Não definida'}
                </p>
              </CardContent>
            </Card>

            {/* Atividade Recente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Membro desde:</span>
                  <br />
                  <span className="font-medium">
                    {user?.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                      : 'N/A'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <br />
                  <Badge variant={user?.isActive ? "default" : "secondary"}>
                    {user?.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Informações Principais */}
          <div className="lg:col-span-2 space-y-4">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informações Pessoais
                    </CardTitle>
                    <CardDescription>
                      Suas informações básicas de perfil
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} size="sm">
                      Editar Perfil
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Nome Completo</Label>
                    {isEditing ? (
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        {user?.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        {user?.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        {formData.phone || 'Não informado'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Tipo de Usuário</Label>
                    <div className="text-sm text-gray-900 dark:text-gray-100 mt-1 p-2 rounded">
                      <Badge variant="outline">
                        {user?.role ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] : 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Alterar Senha
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="currentPassword">Senha Atual</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="newPassword">Nova Senha</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {isEditing && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assinatura de Email */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileSignature className="h-5 w-5" />
                      Assinatura de Email
                    </CardTitle>
                    <CardDescription>
                      Configure sua assinatura para emails automáticos
                    </CardDescription>
                  </div>
                  {!isEditingSignature && (
                    <Button onClick={() => setIsEditingSignature(true)} size="sm">
                      Editar Assinatura
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingSignature ? (
                  <>
                    <div>
                      <Label htmlFor="emailSignature" className="mb-2 block">Assinatura de Email</Label>
                      <RichTextEditor
                        content={emailSignature}
                        onChange={(content) => setEmailSignature(content)}
                        placeholder="Digite sua assinatura de email..."
                        showTemplates={false}
                        showTimeTracking={false}
                        showInternalToggle={false}
                        showTimeLog={false}
                        showTaskCompletion={false}
                        showSubmitButton={false}
                        showAttachments={false}
                        showTitle={false}
                        ticketId={undefined}
                        templates={[]}
                        submitLabel=""
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Use a barra de ferramentas para formatar sua assinatura. Você pode inserir imagens, links e texto formatado.
                      </p>
                    </div>

                    {/* Preview da Assinatura */}
                    {emailSignature && (
                      <div className="border-t pt-4">
                        <Label className="mb-2 block">Preview da Assinatura</Label>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border">
                          <div 
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: emailSignature }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveSignature}
                        disabled={updateSignatureMutation.isPending}
                      >
                        {updateSignatureMutation.isPending ? 'Salvando...' : 'Salvar Assinatura'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEmailSignature(user?.emailSignature || '');
                          setIsEditingSignature(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border">
                    {user?.emailSignature ? (
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: user.emailSignature }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhuma assinatura configurada
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}