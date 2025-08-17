import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Building2, Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

import { Button, Input, Card } from './ui'

export const LoginForm: React.FC = () => {
  const { signIn, loading, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (error) {
      setFormError(error)
    }
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    clearError()

    if (!email || !password) {
      setFormError('Por favor, preencha todos os campos')
      return
    }

    console.log('Tentando fazer login com:', { email, password: '***' })
    
    const result = await signIn(email, password)
    
    console.log('Resultado do login:', result)
    
    if (result.success) {
      console.log('Login realizado com sucesso!')
      // Login realizado com sucesso - o redirecionamento é feito automaticamente pelo useAuth
    } else {
      console.error('Erro no login:', result.error)
      setFormError(result.error || 'Erro ao fazer login')
    }
  }

  const clearErrors = () => {
    setFormError(null)
    clearError()
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-md" padding="lg">
          <div className="text-center mb-8">
            <Building2 className="mx-auto h-12 w-12 text-blue-600" />
            <h2 className="mt-4 text-3xl font-bold text-gray-900">
              Sistema de Diário
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Faça login para acessar o sistema
            </p>
          </div>

        {/* Error Alert */}
        {(formError || error) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{formError || error}</p>
              <button
                onClick={clearErrors}
                className="text-xs text-red-600 hover:text-red-800 mt-1 underline"
              >
                Limpar erro
              </button>
            </div>
          </div>
        )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Email */}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              placeholder="Digite seu email"
              autoComplete="email"
              fullWidth
              required
            />

            {/* Senha */}
            <div>
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={Lock}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                fullWidth
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 mt-6"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}