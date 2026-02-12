import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// AppLayout intentionally not used here; page is a smaller settings panel
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
// checkbox not used in this page
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo, Image as ImageIcon, Link as LinkIcon, Code, Hash, FileText } from 'lucide-react';

interface Template {
  id: number;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
}

export default function ResponseTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['response-templates'],
    queryFn: async () => {
      const res = await fetch('/api/response-templates');
      if (!res.ok) throw new Error('Falha ao carregar templates');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; category: string; isActive: boolean }) => {
      const res = await fetch('/api/response-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Erro ao criar template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response-templates'] });
      toast({ title: '✅ Template criado', description: 'Template criado com sucesso' });
      setTitle('');
      setContent('');
      setCategory('general');
      setIsActive(true);
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível criar o template', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/response-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Erro ao deletar template');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response-templates'] });
      toast({ title: '🗑️ Template removido', description: 'Template removido com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível remover o template', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, content, category, isActive }: { id: number; title: string; content: string; category: string; isActive: boolean }) => {
      const res = await fetch(`/api/response-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, isActive })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Erro ao atualizar template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response-templates'] });
      toast({ title: '✅ Template atualizado', description: 'Template atualizado com sucesso' });
      setEditingId(null);
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível atualizar o template', variant: 'destructive' });
    }
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  // Use valid categories from shared schema. Default to 'other' (Geral).
  const [category, setCategory] = useState('other');
  const [isActive, setIsActive] = useState(true);

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingCategory, setEditingCategory] = useState('other');
  const [editingIsActive, setEditingIsActive] = useState(true);

  const handleCreate = () => {
    if (!title.trim() || !content.trim() || !category.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha título, conteúdo e categoria', variant: 'destructive' });
      return;
    }

    createMutation.mutate({ title: title.trim(), content: content.trim(), category: category.trim(), isActive });
  };

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setEditingTitle(t.title || '');
    setEditingContent(t.content || '');
    setEditingCategory(t.category || 'other');
    setEditingIsActive(Boolean(t.isActive));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
    setEditingContent('');
    setEditingCategory('other');
    setEditingIsActive(true);
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editingTitle.trim() || !editingContent.trim() || !editingCategory.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha título, conteúdo e categoria', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({ id: editingId, title: editingTitle.trim(), content: editingContent.trim(), category: editingCategory.trim(), isActive: editingIsActive });
  };

  // TipTap editor for creating new templates
  const createEditor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Placeholder.configure({ placeholder: 'Conteúdo do template (use macros como {{Cliente}}, {{ClienteEmail}}, {{DataAtual}})' })
    ],
    content,
    onUpdate: ({ editor }) => setContent(editor.getHTML()),
  });

  // TipTap editor for editing an existing template
  const editingEditor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Placeholder.configure({ placeholder: 'Edite o conteúdo do template aqui' })
    ],
    content: editingContent,
    onUpdate: ({ editor }) => setEditingContent(editor.getHTML()),
  });

  // Ensure editingEditor content sync when startEdit sets editingContent
  React.useEffect(() => {
    if (editingEditor && editingId !== null) {
      editingEditor.commands.setContent(editingContent || '');
    }
  }, [editingEditor, editingId]);

  // Helper to insert image files (used for drag/paste)
  const insertImageFiles = React.useCallback((editorInstance: any, files: File[] | FileList) => {
    const list = Array.from(files as File[])
    list.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const src = e.target?.result as string
          editorInstance?.chain().focus().setImage({ src }).run()
        }
        reader.readAsDataURL(file)
      }
    })
  }, [])

  const handleDropCreate = (e: React.DragEvent) => {
    e.preventDefault()
    const dt = e.dataTransfer
    if (!dt) return
    if (dt.files && dt.files.length > 0 && createEditor) {
      insertImageFiles(createEditor, dt.files)
    }
  }

  const handlePasteCreate = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0 && createEditor) {
      e.preventDefault()
      insertImageFiles(createEditor, files)
    }
  }

  const handleDropEdit = (e: React.DragEvent) => {
    e.preventDefault()
    const dt = e.dataTransfer
    if (!dt) return
    if (dt.files && dt.files.length > 0 && editingEditor) {
      insertImageFiles(editingEditor, dt.files)
    }
  }

  const handlePasteEdit = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0 && editingEditor) {
      e.preventDefault()
      insertImageFiles(editingEditor, files)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Respostas Prontas</h2>

      <div className="space-y-3 max-w-3xl">
        <div className="flex items-center gap-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-sm w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technical_support">Suporte Técnico</SelectItem>
              <SelectItem value="financial">Financeiro</SelectItem>
              <SelectItem value="commercial">Comercial</SelectItem>
              <SelectItem value="other">Geral</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Ativo</Label>
            <Switch checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />{createMutation.isPending ? 'Criando...' : 'Criar'}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Conteúdo do template</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">?</Button>
                </TooltipTrigger>
                <TooltipContent>{"Exemplos de macros: {{Cliente}}, {{ClienteEmail}}, {{Empresa}}, {{Assunto}}, {{DataAtual}}, {{HoraAtual}}"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Toolbar (create) */}
          <div className="border rounded-lg">
            <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().toggleBold().run()} data-active={createEditor?.isActive('bold') as any} className="data-[active=true]:bg-muted"><Bold className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().toggleItalic().run()} data-active={createEditor?.isActive('italic') as any} className="data-[active=true]:bg-muted"><Italic className="h-4 w-4" /></Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().toggleBulletList().run()} data-active={createEditor?.isActive('bulletList') as any}><List className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().toggleOrderedList().run()} data-active={createEditor?.isActive('orderedList') as any}><ListOrdered className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().toggleBlockquote().run()} data-active={createEditor?.isActive('blockquote') as any}><Quote className="h-4 w-4" /></Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="ghost" size="sm" onClick={() => { const url = window.prompt('URL da imagem'); if (url) createEditor?.chain().focus().setImage({ src: url }).run() }}><ImageIcon className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { const url = window.prompt('URL do link'); if (url) createEditor?.chain().focus().setLink({ href: url }).run() }}><LinkIcon className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().toggleCodeBlock().run()}><Code className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().toggleCode().run()}><FileText className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().toggleHeading({ level: 2 }).run()}><Hash className="h-4 w-4" /></Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().undo().run()} disabled={!createEditor?.can().undo()}><Undo className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => createEditor?.chain().focus().redo().run()} disabled={!createEditor?.can().redo()}><Redo className="h-4 w-4" /></Button>
            </div>

            <div onDrop={handleDropCreate} onDragOver={(e) => e.preventDefault()} onPaste={handlePasteCreate}>
              <EditorContent editor={createEditor} className="prose prose-sm max-w-none p-3 min-h-[120px]" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <div>Carregando...</div>
          ) : (
            templates.map((t: Template) => (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {editingId === t.id ? (
                      <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                    ) : (
                      <span>{t.title}</span>
                    )}

                    <div className="flex items-center gap-2">
                      {editingId === t.id ? (
                        <>
                          <Button size="sm" onClick={saveEdit}>Salvar</Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-muted-foreground">{t.category}</span>
                          {!t.isActive && <span className="text-xs text-muted-foreground">(inativo)</span>}
                          <Button variant="ghost" onClick={() => startEdit(t)}>
                            Editar
                          </Button>
                          <Button variant="ghost" onClick={() => deleteMutation.mutate(t.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editingId === t.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <Select value={editingCategory} onValueChange={setEditingCategory}>
                          <SelectTrigger className="h-8 text-sm w-48">
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical_support">Suporte Técnico</SelectItem>
                            <SelectItem value="financial">Financeiro</SelectItem>
                            <SelectItem value="commercial">Comercial</SelectItem>
                            <SelectItem value="other">Geral</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Ativo</Label>
                          <Switch checked={editingIsActive} onCheckedChange={(v) => setEditingIsActive(Boolean(v))} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Conteúdo</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm">?</Button>
                              </TooltipTrigger>
                              <TooltipContent>{"Exemplos de macros: {{Cliente}}, {{ClienteEmail}}, {{Empresa}}, {{Assunto}}, {{DataAtual}}, {{HoraAtual}}"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {/* Toolbar (edit) */}
                        <div className="border rounded-lg">
                          <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().toggleBold().run()} data-active={editingEditor?.isActive('bold') as any} className="data-[active=true]:bg-muted"><Bold className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().toggleItalic().run()} data-active={editingEditor?.isActive('italic') as any} className="data-[active=true]:bg-muted"><Italic className="h-4 w-4" /></Button>
                            <Separator orientation="vertical" className="h-6" />
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().toggleBulletList().run()} data-active={editingEditor?.isActive('bulletList') as any}><List className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().toggleOrderedList().run()} data-active={editingEditor?.isActive('orderedList') as any}><ListOrdered className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().toggleBlockquote().run()} data-active={editingEditor?.isActive('blockquote') as any}><Quote className="h-4 w-4" /></Button>
                            <Separator orientation="vertical" className="h-6" />
                            <Button variant="ghost" size="sm" onClick={() => { const url = window.prompt('URL da imagem'); if (url) editingEditor?.chain().focus().setImage({ src: url }).run() }}><ImageIcon className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { const url = window.prompt('URL do link'); if (url) editingEditor?.chain().focus().setLink({ href: url }).run() }}><LinkIcon className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().toggleCodeBlock().run()}><Code className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().toggleCode().run()}><FileText className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().toggleHeading({ level: 2 }).run()}><Hash className="h-4 w-4" /></Button>
                            <Separator orientation="vertical" className="h-6" />
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().undo().run()} disabled={!editingEditor?.can().undo()}><Undo className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => editingEditor?.chain().focus().redo().run()} disabled={!editingEditor?.can().redo()}><Redo className="h-4 w-4" /></Button>
                          </div>

                          <div onDrop={handleDropEdit} onDragOver={(e) => e.preventDefault()} onPaste={handlePasteEdit}>
                            <EditorContent editor={editingEditor} className="prose prose-sm max-w-none p-3 min-h-[160px]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: t.content }} />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
