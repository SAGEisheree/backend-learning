import { useEffect, useState } from 'react'

function StickyNotes() {
  const [stickyText, setStickyText] = useState('')
  const [stickyColor, setStickyColor] = useState('yellow')
  const [stickies, setStickies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

  const stickyThemes = {
    yellow: 'bg-[#f3d34a] text-black',
    pink: 'bg-[#ff7ab6] text-black',
    blue: 'bg-[#66d9ef] text-black',
    green: 'bg-[#8ce99a] text-black',
  }

  useEffect(() => {
    const fetchStickies = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stickynotes`)

        if (!response.ok) {
          throw new Error('Unable to load sticky notes right now.')
        }

        const data = await response.json()
        setStickies(data)
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStickies()
  }, [API_BASE_URL])

  const handleSaveSticky = async () => {
    const trimmedStickyText = stickyText.trim()

    if (!trimmedStickyText) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/stickynotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          color: stickyColor,
          desc: trimmedStickyText,
        }),
      })

      if (!response.ok) {
        throw new Error('Unable to save the sticky note right now.')
      }

      const createdSticky = await response.json()
      setStickies((currentStickies) => [createdSticky, ...currentStickies])
      setStickyText('')
      setStickyColor('yellow')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleDeleteSticky = async (stickyId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stickynotes/${stickyId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Unable to delete the sticky note right now.')
      }

      setStickies((currentStickies) =>
        currentStickies.filter((sticky) => sticky.id !== stickyId)
      )
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  return (
    <section className="mt-14">
      <div className="mb-8 flex flex-col gap-4 border-4 border-black bg-[#f6f2e8] p-6 text-black shadow-[8px_8px_0_#000] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5d73]">
            Sticky Wall
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase md:text-4xl">
            Quick capture notes
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-[#34363d]">
            This section talks to the FastAPI sticky routes and saves short
            color-coded reminders into MongoDB.
          </p>
        </div>

        <div className="border-4 border-black bg-[#2f3137] px-4 py-3 text-sm font-black uppercase text-white">
          Total Stickies: {stickies.length}
        </div>
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="border-4 border-black bg-[#ff5d73] p-6 text-black shadow-[8px_8px_0_#000]">
          <p className="text-sm font-black uppercase tracking-[0.3em]">
            New Sticky
          </p>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.25em]">
              Color
            </label>
            <select
              value={stickyColor}
              onChange={(event) => setStickyColor(event.target.value)}
              className="w-full border-4 border-black bg-[#f6f2e8] px-4 py-3 text-sm font-black uppercase outline-none"
            >
              <option value="yellow">Yellow</option>
              <option value="pink">Pink</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
            </select>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.25em]">
              Sticky text
            </label>
            <textarea
              value={stickyText}
              onChange={(event) => setStickyText(event.target.value)}
              placeholder="Drop a quick reminder..."
              className="h-40 w-full resize-none border-4 border-black bg-[#f6f2e8] p-4 text-sm font-bold outline-none placeholder:text-[#6b6b6b]"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveSticky}
            className="mt-5 border-4 border-black bg-[#f3d34a] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Add Sticky
          </button>

          {errorMessage && (
            <p className="mt-4 border-4 border-black bg-white px-4 py-3 text-sm font-bold text-[#b42318]">
              {errorMessage}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="border-4 border-black bg-[#66d9ef] p-8 text-center text-sm font-black uppercase text-black shadow-[8px_8px_0_#000]">
            Loading sticky notes...
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {stickies.map((sticky) => (
              <article
                key={sticky.id}
                className={`min-h-48 rotate-[-1deg] border-4 border-black p-5 shadow-[8px_8px_0_#000] ${
                  stickyThemes[sticky.color] ?? stickyThemes.yellow
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="border-2 border-black bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em]">
                    {sticky.color}
                  </span>
                  <span className="text-xs font-black uppercase">Sticky</span>
                </div>

                <p className="whitespace-pre-wrap text-base font-bold leading-7">
                  {sticky.desc}
                </p>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteSticky(sticky.id)}
                    className="border-4 border-black bg-white px-4 py-2 text-xs font-black uppercase text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default StickyNotes
