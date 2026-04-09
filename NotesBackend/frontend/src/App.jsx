import { useEffect, useState } from 'react'

import AuthPage from './components/authpage.jsx'
import HomePage from './components/homepage.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token')

      if (!token) {
        setIsCheckingSession(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Session expired')
        }

        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        localStorage.removeItem('token')
        setUser(null)
      } finally {
        setIsCheckingSession(false)
      }
    }

    restoreSession()
  }, [API_BASE_URL])

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-[#1f2023] px-4 py-8 text-[#f6f2e8]">
        <div className="mx-auto max-w-4xl border-4 border-black bg-[#f3d34a] p-8 text-center text-lg font-black uppercase text-black shadow-[8px_8px_0_#000]">
          Checking session...
        </div>
      </main>
    )
  }

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />
  }

  return <HomePage user={user} onLogout={handleLogout} />
}

export default App
