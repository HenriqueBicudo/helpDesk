import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  // Tab ativa (login ou registro)
  const [activeTab, setActiveTab] = useState<string>("login");
  
  // Dados dos formulários
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    fullName: "",
    email: "",
    company: "",
  });
  
  // Estado de sucesso do registro
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // Erros de validação
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  
  // Hook de autenticação (DEVE vir antes de qualquer return condicional)
  const { user, isLoading, loginMutation } = useAuth();
  
  // Mutation para enviar solicitação de acesso
  const requestAccessMutation = useMutation({
    mutationFn: async (data: typeof registerData) => {
      const response = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao enviar solicitação');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setRegistrationSuccess(true);
    },
  });
  
  // Se já estiver autenticado, verificar se precisa trocar senha antes de redirecionar
  if (user && !isLoading) {
    const requiresPasswordChange = (user as any).requiresPasswordChange;
    
    // Só redirecionar se NÃO precisar trocar senha
    if (!requiresPasswordChange) {
      return <Redirect to="/" />;
    }
    // Se precisar trocar senha, ficar na página de auth para mostrar o dialog
  }
  
  // Função para fazer login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };
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
    
    if (!registerData.company) {
      errors.company = "Empresa é obrigatória";
    }
    
    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Função para enviar solicitação de registro
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateRegisterForm()) {
      requestAccessMutation.mutate(registerData);
    }
  };
  
  return (
    <div className="min-h-screen flex">
      {/* Seção do formulário (lado esquerdo) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">SCC - TOTVS Curitiba</h1>
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
                    Digite seu usuário/email e senha para acessar o sistema
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Nome de usuário ou Email</Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="Digite seu nome de usuário ou email"
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
                  <CardTitle>Solicite seu acesso</CardTitle>
                  <CardDescription>
                    Preencha os dados abaixo e aguarde a aprovação por email
                  </CardDescription>
                </CardHeader>
                
                {registrationSuccess ? (
                  // Mensagem de sucesso
                  <CardContent className="space-y-4 py-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="rounded-full bg-green-100 p-4">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Solicitação Enviada!</h3>
                        <p className="text-muted-foreground">
                          Recebemos sua solicitação de acesso ao sistema.
                        </p>
                      </div>
                      
                      <Alert className="text-left">
                        <Mail className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Aguarde o contato:</strong> Você receberá um email com suas 
                          credenciais de acesso assim que sua conta for aprovada e criada pelo administrador.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                        <p>
                          <strong>Dados enviados:</strong>
                        </p>
                        <ul className="space-y-1">
                          <li>👤 {registerData.fullName}</li>
                          <li>📧 {registerData.email}</li>
                          <li>🏢 {registerData.company}</li>
                        </ul>
                      </div>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRegistrationSuccess(false);
                          setActiveTab("login");
                          setRegisterData({ username: "", fullName: "", email: "", company: "" });
                        }}
                        className="mt-4"
                      >
                        Voltar para Login
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  // Formulário de registro
                  <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                      {requestAccessMutation.isError && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            {requestAccessMutation.error instanceof Error 
                              ? requestAccessMutation.error.message 
                              : 'Erro ao enviar solicitação'}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="register-fullname">Nome completo *</Label>
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
                        <Label htmlFor="register-username">Nome de usuário *</Label>
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
                        <Label htmlFor="register-email">E-mail *</Label>
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
                        <Label htmlFor="register-company">Empresa vinculada *</Label>
                        <Input
                          id="register-company"
                          type="text"
                          placeholder="Digite o nome da sua empresa"
                          value={registerData.company}
                          onChange={(e) => setRegisterData({ ...registerData, company: e.target.value })}
                          required
                        />
                        {registerErrors.company && (
                          <p className="text-sm text-destructive">{registerErrors.company}</p>
                        )}
                      </div>
                      
                      <Alert>
                        <Mail className="h-4 w-4" />
                        <AlertDescription>
                          Após o envio, você receberá suas credenciais de acesso por email.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full" disabled={requestAccessMutation.isPending}>
                        {requestAccessMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando solicitação...
                          </>
                        ) : (
                          "Solicitar Acesso"
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Seção de apresentação (lado direito) */}
      <div className="hidden md:flex md:w-1/2 bg-primary text-primary-foreground">
        <div className="flex flex-col justify-center px-8 lg:px-16">
          <h2 className="text-4xl font-bold mb-6">Bem-vindo ao SCC TOTVS Curitiba</h2>
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