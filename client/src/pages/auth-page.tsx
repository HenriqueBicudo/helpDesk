import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  // Tab ativa (login ou registro)
  const [activeTab, setActiveTab] = useState<string>("login");
  
  // Dados dos formulários
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    email: "",
  });
  
  // Erros de validação
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  
  // Hook de autenticação
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  
  // Se já estiver autenticado, redireciona para a home
  if (user && !isLoading) {
    return <Redirect to="/" />;
  }
  
  // Função para fazer login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };
  
  // Função para validar o formulário de registro
  const validateRegisterForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!registerData.username) {
      errors.username = "Nome de usuário é obrigatório";
    }
    
    if (!registerData.fullName) {
      errors.fullName = "Nome completo é obrigatório";
    }
    
    if (!registerData.email) {
      errors.email = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      errors.email = "E-mail inválido";
    }
    
    if (!registerData.password) {
      errors.password = "Senha é obrigatória";
    } else if (registerData.password.length < 6) {
      errors.password = "Senha deve ter pelo menos 6 caracteres";
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = "Senhas não conferem";
    }
    
    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Função para fazer registro
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateRegisterForm()) {
      const { confirmPassword, ...registrationData } = registerData;
      registerMutation.mutate(registrationData);
    }
  };
  
  return (
    <div className="min-h-screen flex">
      {/* Seção do formulário (lado esquerdo) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">HelpDesk</h1>
            <p className="text-muted-foreground">Sistema de gerenciamento de chamados</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Registro</TabsTrigger>
            </TabsList>
            
            {/* Tab de Login */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Faça login na sua conta</CardTitle>
                  <CardDescription>
                    Digite suas credenciais para acessar o sistema
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Nome de usuário</Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="Digite seu nome de usuário"
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Digite sua senha"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            {/* Tab de Registro */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Crie sua conta</CardTitle>
                  <CardDescription>
                    Registre-se para acessar o sistema
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Nome de usuário</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Digite um nome de usuário"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        required
                      />
                      {registerErrors.username && (
                        <p className="text-sm text-destructive">{registerErrors.username}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-fullname">Nome completo</Label>
                      <Input
                        id="register-fullname"
                        type="text"
                        placeholder="Digite seu nome completo"
                        value={registerData.fullName}
                        onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                        required
                      />
                      {registerErrors.fullName && (
                        <p className="text-sm text-destructive">{registerErrors.fullName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-email">E-mail</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Digite seu e-mail"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                      />
                      {registerErrors.email && (
                        <p className="text-sm text-destructive">{registerErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Senha</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Digite uma senha"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                      />
                      {registerErrors.password && (
                        <p className="text-sm text-destructive">{registerErrors.password}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">Confirme a senha</Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="Confirme sua senha"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                      />
                      {registerErrors.confirmPassword && (
                        <p className="text-sm text-destructive">{registerErrors.confirmPassword}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        "Registrar"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Seção de apresentação (lado direito) */}
      <div className="hidden md:flex md:w-1/2 bg-primary text-primary-foreground">
        <div className="flex flex-col justify-center px-8 lg:px-16">
          <h2 className="text-4xl font-bold mb-6">Bem-vindo ao HelpDesk</h2>
          <p className="text-xl mb-8">
            Gerencie seus chamados de suporte de forma eficiente e organizada.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="rounded-full bg-primary-foreground p-2 text-primary mr-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Acompanhamento em tempo real</h3>
                <p>Monitore o progresso dos chamados e receba atualizações instantâneas.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-primary-foreground p-2 text-primary mr-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Relatórios detalhados</h3>
                <p>Visualize estatísticas e dados analíticos sobre desempenho e produtividade.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-primary-foreground p-2 text-primary mr-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Integrações avançadas</h3>
                <p>Conecte-se com outras ferramentas e amplie as capacidades do sistema.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}