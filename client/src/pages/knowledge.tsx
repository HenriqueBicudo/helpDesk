import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleRichEditor } from '@/components/knowledge/simple-rich-editor';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, Plus, Trash2, Pencil, Clock, FileQuestion, Loader2, Tag, Eye, Save, MessageSquare, Send } from 'lucide-react';

// Artigos carregados via API em tempo de execução

// Form schema for articles
const articleFormSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres' }),
  content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres' }),
  category: z.string().min(1, { message: 'Selecione uma categoria' }),
  tags: z.string().optional()
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

export default function Knowledge() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [editorContent, setEditorContent] = useState('');
  
  // Sempre carregar artigos via API (não usar mocks)
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const resp = await fetch('/api/knowledge');
        if (!resp.ok) throw new Error(`Status ${resp.status}`);
        const body = await resp.json();
        if (body && Array.isArray(body.data)) {
          setArticles(body.data);
        } else if (Array.isArray(body)) {
          // Compatibilidade com endpoints que retornam array simples
          setArticles(body as any[]);
        } else {
          setArticles([]);
        }
      } catch (err) {
        console.error('Erro ao buscar artigos via API:', err);
        setArticles([]);
      }
    };

    fetchArticles();
  }, []);

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(articles.map(article => article.category)))];
  
  // Form for adding/editing articles
  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
      tags: ''
    }
  });
  
  // Edit form
  const editForm = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: selectedArticle?.title || '',
      content: selectedArticle?.content || '',
      category: selectedArticle?.category || '',
      tags: selectedArticle?.tags?.join(', ') || ''
    }
  });
  
  // Filter articles based on search query and category
  const filteredArticles = articles.filter(article => {
    const tags = article.tags || [];
    const matchesSearch = 
      (article.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (article.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Reset form when opening dialog
  const openAddDialog = () => {
    form.reset();
    setIsAddDialogOpen(true);
  };
  
  // Set up form when opening edit dialog
  const openEditDialog = (article: any) => {
    console.log('[openEditDialog] Article content length:', article.content?.length);
    console.log('[openEditDialog] Tem imagens?', article.content?.includes('<img'));
    
    setSelectedArticle(article);
    setIsEditDialogOpen(false);
    
    // Define o conteúdo no estado
    setEditorContent(article.content || '');
    
    // Reseta o form
    editForm.reset({
      title: article.title,
      content: article.content || '',
      category: article.category,
      tags: (article.tags || []).join(', ')
    });
    
    // Abre o dialog após garantir que tudo está pronto
    setTimeout(() => {
      setIsEditDialogOpen(true);
    }, 100);
  };
  
  // Open view dialog
  const openViewDialog = (article: any) => {
    setSelectedArticle(article);
    setIsViewDialogOpen(true);
    setNewComment('');
    
    // Carregar comentários da API
    (async () => {
      try {
        const resp = await fetch(`/api/knowledge/${article.id}/comments`);
        if (resp.ok) {
          const body = await resp.json();
          setComments(body.data || []);
        } else {
          setComments([]);
        }
      } catch (err) {
        console.error('Erro ao carregar comentários:', err);
        setComments([]);
      }
    })();
    
    // Increment view count
    // Chamar API para incrementar views
    (async () => {
      try {
        const resp = await fetch(`/api/knowledge/${article.id}/views`, { method: 'PATCH' });
        if (!resp.ok) throw new Error('Erro incrementando views');
        const body = await resp.json();
        if (body && body.data) {
          setArticles(prev => prev.map(a => a.id === article.id ? body.data : a));
          setSelectedArticle(body.data);
        } else {
          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, views: (a.views || 0) + 1 } : a));
        }
      } catch (err) {
        console.warn('Não foi possível incrementar views via API:', err);
        setArticles(prev => prev.map(a => a.id === article.id ? { ...a, views: (a.views || 0) + 1 } : a));
      }
    })();
  };
  
  // Handle form submission for new article
  const onSubmit = (data: ArticleFormValues) => {
    (async () => {
      try {
        const resp = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            content: data.content,
            category: data.category,
            tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
            author: user?.name || user?.email || 'Usuário'
          })
        });

        if (!resp.ok) throw new Error(`Status ${resp.status}`);
        const body = await resp.json();
        if (body && body.data) {
          setArticles(prev => [...prev, body.data]);
        }

        setIsAddDialogOpen(false);
        toast({ title: 'Artigo criado', description: 'O artigo foi adicionado à base de conhecimento' });
      } catch (err) {
        console.error('Erro ao criar artigo via API:', err);
        toast({ title: 'Erro', description: 'Não foi possível criar o artigo' });
      }
    })();
  };
  
  // Handle edit form submission
  const onEditSubmit = (data: ArticleFormValues) => {
    if (!selectedArticle) return;

    (async () => {
      try {
        const resp = await fetch(`/api/knowledge/${selectedArticle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            content: data.content,
            category: data.category,
            tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : []
          })
        });

        if (!resp.ok) throw new Error(`Status ${resp.status}`);
        const body = await resp.json();
        if (body && body.data) {
          setArticles(prev => prev.map(article => article.id === selectedArticle.id ? body.data : article));
        }

        setIsEditDialogOpen(false);
        toast({ title: 'Artigo atualizado', description: 'O artigo foi atualizado com sucesso' });
      } catch (err) {
        console.error('Erro ao atualizar artigo via API:', err);
        toast({ title: 'Erro', description: 'Não foi possível atualizar o artigo' });
      }
    })();
  };
  
  // Handle article deletion
  const handleDeleteArticle = (id: number) => {
    (async () => {
      try {
        const resp = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
        if (!resp.ok && resp.status !== 204) throw new Error(`Status ${resp.status}`);

        setArticles(prev => prev.filter(article => article.id !== id));
        toast({ title: 'Artigo excluído', description: 'O artigo foi removido da base de conhecimento' });
      } catch (err) {
        console.error('Erro ao excluir artigo via API:', err);
        toast({ title: 'Erro', description: 'Não foi possível excluir o artigo' });
      }
    })();
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Extract plain text from HTML content
  const extractPlainText = (html: string, maxLength: number = 100) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Handle comment submission
  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !selectedArticle) return;
    
    try {
      const resp = await fetch(`/api/knowledge/${selectedArticle.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (!resp.ok) throw new Error('Erro ao adicionar comentário');
      
      const body = await resp.json();
      if (body && body.data) {
        setComments(prev => [body.data, ...prev]);
        setNewComment('');
        
        toast({
          title: 'Comentário adicionado',
          description: 'Seu comentário foi publicado com sucesso'
        });
      }
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o comentário',
        variant: 'destructive'
      });
    }
  };

  return (
    <AppLayout title="Base de Conhecimento">
      <div className="p-6 space-y-6">
        {/* Search and Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar artigos..."
              className="w-full pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Artigo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Artigo</DialogTitle>
                <DialogDescription>
                  Adicione um novo artigo à base de conhecimento.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o título do artigo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Suporte">Suporte</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="Contas">Contas</SelectItem>
                            <SelectItem value="Acesso">Acesso</SelectItem>
                            <SelectItem value="Segurança">Segurança</SelectItem>
                            <SelectItem value="Software">Software</SelectItem>
                            <SelectItem value="Hardware">Hardware</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (separadas por vírgula)</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: senha, acesso, configuração" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conteúdo</FormLabel>
                        <FormControl>
                          <SimpleRichEditor
                            content={field.value}
                            onChange={field.onChange}
                            placeholder="Digite o conteúdo do artigo..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit">Salvar Artigo</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Categories */}
        <div className="flex overflow-x-auto pb-2">
          {categories.map((category, index) => (
            <Button
              key={index}
              variant={activeCategory === category ? "default" : "outline"}
              className="mr-2 whitespace-nowrap"
              onClick={() => setActiveCategory(category)}
            >
              {category === 'all' ? 'Todas Categorias' : category}
            </Button>
          ))}
        </div>
        
        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <FileQuestion className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">Nenhum artigo encontrado</h3>
              <p className="text-sm text-gray-500 mt-2 text-center">
                {searchQuery 
                  ? "Nenhum artigo corresponde à sua busca. Tente com outros termos."
                  : "Comece adicionando seu primeiro artigo na base de conhecimento."}
              </p>
            </div>
          ) : (
            filteredArticles.map(article => (
              <Card key={article.id} className="flex flex-col h-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge className="mb-2">{article.category}</Badge>
                    <div className="flex items-center text-sm text-gray-500">
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {article.views}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{article.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {extractPlainText(article.content, 150)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(article.tags || []).map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t flex flex-col gap-2">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex flex-col text-xs text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> 
                        Criado em {formatDate(article.createdAt)}
                      </div>
                      {article.lastEditedAt && article.lastEditedBy && (
                        <div className="flex items-center mt-1 text-muted-foreground">
                          <Pencil className="h-3 w-3 mr-1" />
                          Editado em {formatDate(article.lastEditedAt)} por {article.lastEditedBy}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => openViewDialog(article)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => openEditDialog(article)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteArticle(article.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
        
        {/* View Article Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedArticle?.title}</DialogTitle>
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-2">
                  <Badge>{selectedArticle?.category}</Badge>
                  <span className="text-sm text-gray-500">
                    Criado em {selectedArticle ? formatDate(selectedArticle.createdAt) : ''}
                  </span>
                </div>
                {selectedArticle?.lastEditedAt && selectedArticle?.lastEditedBy && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                    <span>
                      Editado em {formatDate(selectedArticle.lastEditedAt)} por {selectedArticle.lastEditedBy}
                    </span>
                  </div>
                )}
              </div>
            </DialogHeader>
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">
                  <FileText className="h-4 w-4 mr-2" />
                  Conteúdo
                </TabsTrigger>
                <TabsTrigger value="comments">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comentários ({comments.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="space-y-4 mt-4">
                {/* Article content */}
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedArticle?.content || '' }}
                />
                
                <Separator />
                
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-500">Tags:</span>
                      <div className="flex flex-wrap gap-1 ml-1">
                        {(selectedArticle?.tags || []).map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <span>Criado por:</span>
                      <span className="font-medium">{selectedArticle?.author}</span>
                    </div>
                  </div>
                  
                  {selectedArticle?.lastEditedAt && selectedArticle?.lastEditedBy && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                      <Pencil className="h-3.5 w-3.5" />
                      <span>
                        Editado em {formatDate(selectedArticle.lastEditedAt)} por{' '}
                        <span className="font-medium">{selectedArticle.lastEditedBy}</span>
                      </span>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="comments" className="space-y-4 mt-4">
                {/* Add comment form */}
                <div className="space-y-3">
                  <Label>Adicionar Comentário</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escreva seu comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                {/* Comments list */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum comentário ainda</p>
                      <p className="text-sm">Seja o primeiro a comentar!</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <Card key={comment.id}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-sm font-medium">
                                {comment.author}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {formatDate(comment.createdAt)}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm">{comment.content}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        
        {/* Edit Article Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Artigo</DialogTitle>
              <DialogDescription>
                Edite as informações do artigo abaixo.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o título do artigo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Suporte">Suporte</SelectItem>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Contas">Contas</SelectItem>
                          <SelectItem value="Acesso">Acesso</SelectItem>
                          <SelectItem value="Segurança">Segurança</SelectItem>
                          <SelectItem value="Software">Software</SelectItem>
                          <SelectItem value="Hardware">Hardware</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (separadas por vírgula)</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: senha, acesso, configuração" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="content"
                  render={({ field }) => {
                    console.log('[FormField render] editorContent length:', editorContent?.length);
                    console.log('[FormField render] Tem imagens no editorContent?', editorContent?.includes('<img'));
                    return (
                      <FormItem>
                        <FormLabel>Conteúdo</FormLabel>
                        <FormControl>
                          {isEditDialogOpen && editorContent ? (
                            <SimpleRichEditor
                              key={selectedArticle?.id}
                              content={editorContent}
                              onChange={field.onChange}
                              placeholder="Digite o conteúdo do artigo..."
                            />
                          ) : (
                            <div className="min-h-[200px] flex items-center justify-center border rounded-lg bg-muted/5">
                              <p className="text-sm text-muted-foreground">Carregando editor...</p>
                            </div>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <DialogFooter>
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Atualizar Artigo
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}