import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, AlertTriangle, ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";

interface ForcePasswordChangeDialogProps {
  open: boolean;
}

export function ForcePasswordChangeDialog({ open }: ForcePasswordChangeDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();

  // Garantir que o dialog permanece aberto enquanto a prop open for true
  useEffect(() => {
    if (open) {
      setIsOpen(true);
    }
  }, [open]);

  // Validação de força da senha
  const getPasswordStrength = () => {
    if (!newPassword) return { level: 0, text: "", color: "" };
    
    let strength = 0;
    if (newPassword.length >= 6) strength++;
    if (newPassword.length >= 10) strength++;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) strength++;
    if (/\d/.test(newPassword)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) strength++;

    if (strength <= 2) return { level: 1, text: "Fraca", color: "bg-red-500" };
    if (strength <= 3) return { level: 2, text: "Média", color: "bg-yellow-500" };
    if (strength <= 4) return { level: 3, text: "Boa", color: "bg-blue-500" };
    return { level: 4, text: "Forte", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength();

  const changePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/auth/force-change-password", {
        newPassword: password
      });
      return await res.json();
    },
    onSuccess: (user) => {
      sessionStorage.removeItem('pending-password-change');
      queryClient.setQueryData(["/api/auth/current-user"], user);
      toast({
        title: "✅ Senha alterada com sucesso!",
        description: "Redirecionando para o sistema...",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error: Error) => {
      setError(error.message || "Erro ao alterar senha");
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    changePasswordMutation.mutate(newPassword);
  };

  return (
    <Dialog 
      open={isOpen} 
      modal={true}
      onOpenChange={(open) => {
        if (!open) {
          setError("⚠️ Você precisa alterar sua senha para continuar");
        }
      }}
    >
      <DialogContent 
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto" 
        onInteractOutside={(e) => {
          e.preventDefault();
          setError("⚠️ Você precisa alterar sua senha para continuar");
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          setError("⚠️ Você precisa alterar sua senha para continuar");
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3">
              <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl">Alteração de Senha Obrigatória</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Configure uma nova senha segura para continuar
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
            <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Primeira vez no sistema?</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Por questões de segurança, você precisa criar uma senha pessoal antes de acessar o sistema.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Nova Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua nova senha"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError("");
                    }}
                    disabled={changePasswordMutation.isPending}
                    autoComplete="new-password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Força da senha:</span>
                      <span className={`font-medium ${
                        passwordStrength.level === 1 ? 'text-red-600' :
                        passwordStrength.level === 2 ? 'text-yellow-600' :
                        passwordStrength.level === 3 ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < passwordStrength.level ? passwordStrength.color : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres • Use letras, números e símbolos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Confirmar Nova Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite novamente sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    disabled={changePasswordMutation.isPending}
                    autoComplete="new-password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    As senhas não coincidem
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Button 
            type="submit" 
            className="w-full h-11"
            disabled={changePasswordMutation.isPending || !newPassword || newPassword !== confirmPassword}
          >
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Alterando senha...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Confirmar Nova Senha
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Esta é uma medida de segurança obrigatória para proteger sua conta
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
