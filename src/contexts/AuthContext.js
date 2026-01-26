import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { user, error } = await auth.getCurrentUser()
        if (error) throw error
        
        setUser(user)
        setIsAuthenticated(!!user)
      } catch (error) {
        console.error('Error getting initial session:', error)
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      setUser(session?.user || null)
      setIsAuthenticated(!!session?.user)
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    try {
      setLoading(true)
      const { data, error } = await auth.signUp(email, password, fullName)
      
      if (error) throw error
      
      // Note: User might need to confirm email before being fully authenticated
      return { success: true, message: 'Account created! Please check your email to confirm your account.' }
    } catch (error) {
      console.error('Sign up error:', error)
      return { success: false, message: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await auth.signIn(email, password)
      
      if (error) throw error
      
      return { success: true, message: 'Successfully signed in!' }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, message: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await auth.signOut()
      
      if (error) throw error
      
      return { success: true, message: 'Successfully signed out!' }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, message: error.message }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
