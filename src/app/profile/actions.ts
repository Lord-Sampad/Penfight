'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const username = formData.get('username') as string
  const password = formData.get('password') as string

  try {
    // Update password if provided
    if (password && password.trim() !== '') {
      const confirmPassword = formData.get('confirmPassword') as string
      if (password !== confirmPassword) {
        return { error: 'Passwords do not match' }
      }
      
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      })
      if (authError) throw authError
    }

    const updates: any = {}
    
    if (username && username.trim() !== '') {
      updates.username = username
    }
    
    const avatarFile = formData.get('avatar_file') as File
    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
        
      updates.avatar_url = publicUrl
    }

    if (Object.keys(updates).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
      
      if (profileError) {
        if (profileError.code === '23505') {
          return { error: 'Username is already taken' }
        }
        throw profileError
      }
    }

    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'An error occurred' }
  }
}
