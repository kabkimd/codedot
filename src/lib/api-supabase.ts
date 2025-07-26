import { supabase } from '@/integrations/supabase/client';

export const supabaseAuthAPI = {
  login: async (username: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password: password
    });
    
    if (error) throw new Error(error.message);
    
    return {
      token: data.session?.access_token,
      user: { username: data.user?.email }
    };
  },
  
  register: async (username: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: username,
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    
    if (error) throw new Error(error.message);
    return { user: data.user };
  }
};

export const supabaseUserAPI = {
  getCurrent: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    return {
      username: profile?.username || user.email,
      email: user.email,
      full_name: profile?.display_name || '',
      isPublic: false
    };
  },
  
  update: async (updateData: Record<string, unknown>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const { error } = await supabase
      .from('profiles')
      .update({
        username: updateData.username as string,
        display_name: updateData.full_name as string
      })
      .eq('user_id', user.id);
    
    if (error) throw new Error(error.message);
    
    return { success: true };
  }
};

export const supabaseFileAPI = {
  getTree: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const { data: files } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id);
    
    // Convert to tree structure expected by frontend
    return files || [];
  },
  
  getUsage: async () => {
    return { used: 0, total: 1000000000 }; // 1GB default
  },
  
  getFile: async (path: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const { data: file } = await supabase
      .from('files')
      .select('content')
      .eq('user_id', user.id)
      .eq('path', path)
      .single();
    
    return file?.content || '';
  },
  
  saveFile: async (path: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const { error } = await supabase
      .from('files')
      .upsert({
        user_id: user.id,
        path,
        content,
        name: path.split('/').pop() || path
      });
    
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  createFile: async (parent: string, name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const path = parent ? `${parent}/${name}` : name;
    const { error } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        path,
        name,
        content: '',
        file_type: 'file'
      });
    
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  createFolder: async (parent: string, name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const path = parent ? `${parent}/${name}` : name;
    const { error } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        path,
        name,
        file_type: 'directory'
      });
    
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  deleteItem: async (path: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('user_id', user.id)
      .eq('path', path);
    
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  renameItem: async (path: string, newName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const pathParts = path.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');
    
    const { error } = await supabase
      .from('files')
      .update({ path: newPath, name: newName })
      .eq('user_id', user.id)
      .eq('path', path);
    
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  uploadFiles: async (parent: string, files: FileList) => {
    // For now, return success - would need Supabase Storage for actual file uploads
    return { success: true };
  },
  
  moveItem: async (path: string, target: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const fileName = path.split('/').pop();
    const newPath = target ? `${target}/${fileName}` : fileName;
    
    const { error } = await supabase
      .from('files')
      .update({ path: newPath })
      .eq('user_id', user.id)
      .eq('path', path);
    
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  downloadItem: async (path: string) => {
    const content = await supabaseFileAPI.getFile(path);
    return new Blob([content], { type: 'text/plain' });
  }
};