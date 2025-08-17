import { useState, useEffect, useCallback } from 'react'
import { supabase, User } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  // Função para buscar dados do usuário
  const fetchUserData = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('useAuth: Erro ao buscar dados do usuário:', userError)
        return null
      }

      return userData
    } catch (error) {
      console.error('useAuth: Exceção ao buscar dados do usuário:', error)
      return null
    }
  }, [])

  // Função para processar mudança de sessão
  const handleSessionChange = useCallback(async (session: Session | null) => {
    if (session?.user) {
        // Buscar dados completos do usuário
        const userData = await fetchUserData(session.user.id)
        
        if (userData) {
          setAuthState({ user: userData, loading: false, error: null })
        } else {
          setAuthState({ user: null, loading: false, error: 'Usuário não encontrado na base de dados' })
        }
      } else {
        setAuthState({ user: null, loading: false, error: null })
      }
  }, [fetchUserData])

  useEffect(() => {
    let mounted = true
    let isInitialized = false

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('useAuth: Erro ao obter sessão:', error)
          if (mounted) {
            setAuthState({ user: null, loading: false, error: error.message })
          }
          return
        }

        if (mounted) {
          await handleSessionChange(session)
          isInitialized = true
        }
      } catch (error) {
        console.error('useAuth: Exceção ao verificar sessão:', error)
        if (mounted) {
          setAuthState({ 
            user: null, 
            loading: false, 
            error: error instanceof Error ? error.message : 'Erro desconhecido' 
          })
        }
      }
    }

    getSession()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || !isInitialized) return

        if (event === 'SIGNED_IN' && session?.user) {
          await handleSessionChange(session)
        } else if (event === 'SIGNED_OUT') {
          setAuthState({ user: null, loading: false, error: null })
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Não refazer a busca do usuário no refresh do token
        } else if (event === 'INITIAL_SESSION') {
          // Ignorar evento inicial para evitar duplicação
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [handleSessionChange])

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }

      // O onAuthStateChange vai lidar com a atualização do estado
      return { success: true, user: data.user }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }

      // O onAuthStateChange vai lidar com a limpeza do estado
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...authState,
    signIn,
    signOut,
    clearError,
    isAuthenticated: !!authState.user,
    isAdmin: authState.user?.role === 'admin',
    isClusterManager: authState.user?.role === 'cluster_manager' || authState.user?.role === 'admin',
    isMaintainer: authState.user?.role === 'maintainer' || authState.user?.role === 'cluster_manager' || authState.user?.role === 'admin'
  }
}