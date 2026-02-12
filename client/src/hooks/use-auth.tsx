import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Tipo estendido para incluir flag de troca de senha obrigatória
type UserWithPasswordChange = User & {
  requiresPasswordChange?: boolean;
};

type AuthContextType = {
  user: UserWithPasswordChange | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLogin>;
  logoutMutation: ReturnType<typeof useLogout>;
  registerMutation: ReturnType<typeof useRegister>;
};

// Tipos para as credenciais de login e registro
type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role?: string;
};

// Hook para login
function useLogin() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: (user: UserWithPasswordChange) => {
      console.log('🔐 Login successful, user data:', { 
        id: user.id, 
        username: user.username, 
        requiresPasswordChange: user.requiresPasswordChange 
      });
      
      // Se precisar trocar senha, salvar no sessionStorage para não perder
      if (user.requiresPasswordChange) {
        sessionStorage.setItem('pending-password-change', 'true');
      }
      
      // Apenas setar os dados, NÃO invalidar (isso causaria uma nova query que retorna 401)
      queryClient.setQueryData(["/api/auth/current-user"], user);
      
      // Só mostrar toast se não precisar trocar senha
      if (!user.requiresPasswordChange) {
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo de volta, ${user.fullName}!`,
        });
      }
    },
    onError: (error: Error) => {
      console.error('❌ Login failed:', error);
      toast({
        title: "Falha no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });
}

// Hook para logout
function useLogout() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/current-user"], null);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao desconectar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para registro
function useRegister() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return await res.json();
    },
    onSuccess: (user: UserWithPasswordChange) => {
      queryClient.setQueryData(["/api/auth/current-user"], user);
      toast({
        title: "Registro realizado com sucesso",
        description: `Bem-vindo, ${user.fullName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Contexto de autenticação
export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserWithPasswordChange>({
    queryKey: ["/api/auth/current-user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false, // Não tentar novamente em caso de erro
    staleTime: Infinity, // Considerar dados sempre frescos
    gcTime: Infinity, // Nunca remover do cache
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const registerMutation = useRegister();

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}