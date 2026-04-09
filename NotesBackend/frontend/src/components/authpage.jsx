import { useState } from 'react'

function AuthPage({ onAuthSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

  const resetFormMessages = () => {
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async () => {
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('Email and password are required.')
      return
    }

    if (trimmedPassword.length < 8 || trimmedPassword.length > 32) {
      setErrorMessage('Password must be between 8 and 32 characters.')
      return
    }

    try {
      setIsSubmitting(true)
      resetFormMessages()

      const endpoint = isLoginMode ? '/auth/login' : '/auth/signup'
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed.')
      }

      if (isLoginMode) {
        localStorage.setItem('token', data.access_token)
        onAuthSuccess(data.user)
        return
      }

      setSuccessMessage('Signup successful. You can log in now.')
      setIsLoginMode(true)
      setPassword('')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#1f2023] px-4 py-8 text-[#f6f2e8]">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 flex flex-col gap-4 border-4 border-black bg-[#f3d34a] px-5 py-4 text-black shadow-[8px_8px_0_#000] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em]">
              Secure Workspace
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase md:text-4xl">
              Neo Notes Auth
            </h1>
          </div>

          <div className="border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase">
            {isLoginMode ? 'Login Mode' : 'Signup Mode'}
          </div>
        </nav>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-4 border-black bg-[#2f3137] p-6 shadow-[8px_8px_0_#000]">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#f3d34a]">
              Access Notes
            </p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-tight text-white md:text-5xl">
              Sign in and keep your notes private.
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-[#d7d9df] md:text-base">
              Create an account with any email and password, log in, and your
              notes plus sticky notes will be tied to your user account through
              the FastAPI backend.
            </p>
          </div>

          <div className="border-4 border-black bg-[#f6f2e8] p-6 text-black shadow-[10px_10px_0_#000]">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#ff5d73]">
              {isLoginMode ? 'Welcome Back' : 'Create Account'}
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.25em]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border-4 border-black bg-white px-4 py-3 text-sm font-bold outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.25em]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border-4 border-black bg-white px-4 py-3 text-sm font-bold outline-none"
                placeholder="Enter password"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="mt-6 border-4 border-black bg-[#66d9ef] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? 'Please Wait'
                : isLoginMode
                  ? 'Login'
                  : 'Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLoginMode((currentMode) => !currentMode)
                resetFormMessages()
              }}
              className="mt-4 ml-3 border-4 border-black bg-[#ff8a5b] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              {isLoginMode ? 'Need Sign Up?' : 'Need Login?'}
            </button>

            {errorMessage && (
              <p className="mt-5 border-4 border-black bg-[#ff6b6b] px-4 py-3 text-sm font-bold text-black">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="mt-5 border-4 border-black bg-[#8ce99a] px-4 py-3 text-sm font-bold text-black">
                {successMessage}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default AuthPage
