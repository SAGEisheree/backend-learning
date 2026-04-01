import { useEffect, useState } from 'react'

function HomePage() {
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [isImportant, setIsImportant] = useState(false)
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/notes`)

        if (!response.ok) {
          throw new Error('Unable to load notes right now.')
        }

        const data = await response.json()
        setNotes(data)
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotes()
  }, [API_BASE_URL])

  const handleAddNote = async () => {
    const trimmedTitle = noteTitle.trim()
    const trimmedNote = noteText.trim()

    if (!trimmedTitle || !trimmedNote) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: trimmedTitle,
          desc: trimmedNote,
          important: isImportant,
        }),
      })

      if (!response.ok) {
        throw new Error('Unable to save the note right now.')
      }

      const createdNote = await response.json()

      setNotes((currentNotes) => [createdNote, ...currentNotes])
      setNoteTitle('')
      setNoteText('')
      setIsImportant(false)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f3e8] px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
            Notes
          </p>
          <h1 className="mt-3 text-4xl font-bold">Simple Keep Style Notes</h1>
          <p className="mt-2 text-sm text-slate-600">
            Write a note, save it to FastAPI, and it appears below.
          </p>
        </div>

        <section className="mx-auto mb-10 max-w-2xl rounded-3xl border border-amber-200 bg-white p-5 shadow-[0_16px_40px_rgba(120,84,0,0.08)]">
          <input
            type="text"
            className="mb-4 w-full rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-base outline-none transition focus:border-amber-400"
            placeholder="Note title"
            value={noteTitle}
            onChange={(event) => setNoteTitle(event.target.value)}
          />

          <textarea
            className="h-36 w-full resize-none rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-base outline-none transition focus:border-amber-400"
            placeholder="Take a note..."
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
          />

          <div className="mt-4 flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                checked={isImportant}
                onChange={(event) => setIsImportant(event.target.checked)}
              />
              Important
            </label>
            <button
              type="button"
              onClick={handleAddNote}
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
            >
              Add Note
            </button>
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </p>
          )}
        </section>

        {isLoading ? (
          <section className="rounded-3xl border border-amber-200 bg-white p-8 text-center text-sm text-slate-600">
            Loading notes...
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <article
              key={note.id}
              className={`min-h-36 rounded-3xl border p-5 shadow-[0_12px_24px_rgba(120,84,0,0.08)] ${
                note.important
                  ? 'border-amber-400 bg-amber-100'
                  : 'border-amber-200 bg-[#fff9d8]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {note.title}
                </h2>
                {note.important && (
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-900">
                    Important
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {note.desc}
              </p>
            </article>
          ))}
          </section>
        )}
      </div>
    </main>
  )
}

export default HomePage
