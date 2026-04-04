import { useEffect, useState } from 'react'

function HomePage() {
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [isImportant, setIsImportant] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'


    // getting data from backend
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

  const resetForm = () => {
    setNoteTitle('')
    setNoteText('')
    setIsImportant(false)
    setEditingNoteId(null)
  }

  const handleEditClick = (note) => {
    setEditingNoteId(note.id)
    setNoteTitle(note.title)
    setNoteText(note.desc)
    setIsImportant(note.important)
    setErrorMessage('')
  }

  const handleCancelEdit = () => {
    resetForm()
    setErrorMessage('')
  }

  // adding/updating data in backend
  const handleSaveNote = async () => {
    const trimmedTitle = noteTitle.trim()
    const trimmedNote = noteText.trim()

    if (!trimmedTitle || !trimmedNote) {
      return
    }

    try {
      const isEditing = Boolean(editingNoteId)
      const requestUrl = isEditing
        ? `${API_BASE_URL}/api/notes/${editingNoteId}`
        : `${API_BASE_URL}/api/notes`

      const response = await fetch(
        requestUrl,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: trimmedTitle,
            desc: trimmedNote,
            important: isImportant,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          isEditing
            ? 'Unable to update the note right now.'
            : 'Unable to save the note right now.'
        )
      }

      const savedNote = await response.json()

      if (isEditing) {
        setNotes((currentNotes) =>
          currentNotes.map((note) =>
            note.id === editingNoteId ? savedNote : note
          )
        )
      } else {
        setNotes((currentNotes) => [savedNote, ...currentNotes])
      }

      resetForm()
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Unable to delete the note right now.')
      }

      setNotes((currentNotes) =>
        currentNotes.filter((note) => note.id !== noteId)
      )
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message)
    }
  }


  return (
    <main className="min-h-screen bg-[#1f2023] px-4 py-6 text-[#f6f2e8]">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex flex-col gap-4 border-4 border-black bg-[#f3d34a] px-5 py-4 text-black shadow-[8px_8px_0_#000] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em]">
              lets save some words with
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase md:text-4xl">
              NEO NOTES
            </h1>
          </div>

          <div className="flex flex-wrap gap-3 text-sm font-bold uppercase">
            <div className="border-4 border-black bg-white px-4 py-2">
              Total Notes: {notes.length}
            </div>
            <div className="border-4 border-black bg-[#ff8a5b] px-4 py-2">
              Important: {notes.filter((note) => note.important).length}
            </div>
          </div>
        </nav>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-4 border-black bg-[#2f3137] p-6 shadow-[8px_8px_0_#000]">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-[#f3d34a]">
              Workspace
            </p>
            <h2 className="mt-3 max-w-xl text-4xl font-black uppercase leading-tight text-white md:text-5xl">
              Write fast. Save hard. Keep your messy brain organized.
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-[#d7d9df] md:text-base">
              This notes page now talks directly to FastAPI. Add, edit, delete,
              and mark notes as important from one dark neobrutalist workspace.
            </p>
          </div>

          <div className="border-4 border-black bg-[#66d9ef] p-6 text-black shadow-[8px_8px_0_#000]">
            <p className="text-sm font-black uppercase tracking-[0.3em]">
              Current Mode
            </p>
            <h3 className="mt-3 text-3xl font-black uppercase">
              {editingNoteId ? 'Editing Note' : 'Creating Note'}
            </h3>
            <p className="mt-4 text-sm font-bold leading-7">
              {editingNoteId
                ? 'You are editing an existing card. Update the fields and save your changes.'
                : 'Create a new note with a title, details, and an optional important marker.'}
            </p>
          </div>
        </section>

        <section className="mx-auto mb-10 max-w-3xl border-4 border-black bg-[#f6f2e8] p-6 text-black shadow-[10px_10px_0_#000]">
          <input
            type="text"
            className="mb-4 w-full border-4 border-black bg-white px-4 py-3 text-base font-bold outline-none placeholder:text-[#7b7b7b]"
            placeholder="Note title"
            value={noteTitle}
            onChange={(event) => setNoteTitle(event.target.value)}
          />

          <textarea
            className="h-40 w-full resize-none border-4 border-black bg-white p-4 text-base font-medium outline-none placeholder:text-[#7b7b7b]"
            placeholder="Take a note..."
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
          />

          <div className="mt-4 flex items-center justify-between gap-4">
            <label className="flex items-center gap-3 border-4 border-black bg-[#66d9ef] px-4 py-3 text-sm font-black uppercase">
              <input
                type="checkbox"
                className="h-5 w-5 border-2 border-black accent-black"
                checked={isImportant}
                onChange={(event) => setIsImportant(event.target.checked)}
                />
              Important
            </label>
            <button
              type="button"
              onClick={handleSaveNote}
              className="border-4 border-black bg-[#ff8a5b] px-6 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              {editingNoteId ? 'Update Note' : 'Add Note'}
            </button>
          </div>

          {editingNoteId && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="border-4 border-black bg-white px-5 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                Cancel Edit
              </button>
            </div>
          )}

          {errorMessage && (
            <p className="mt-4 border-4 border-black bg-[#ff6b6b] px-4 py-3 text-sm font-bold text-black">
              {errorMessage}
            </p>
          )}
        </section>

        {isLoading ? (
          <section className="border-4 border-black bg-[#f3d34a] p-8 text-center text-sm font-black uppercase text-black shadow-[8px_8px_0_#000]">
            Loading notes...
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <article
              key={note.id}
              className={`min-h-40 border-4 border-black p-5 text-black shadow-[8px_8px_0_#000] ${
                note.important
                  ? 'bg-[#ff8a5b]'
                  : 'bg-[#f6f2e8]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black uppercase">
                  {note.title}
                </h2>
                {note.important && (
                  <span className="border-2 border-black bg-[#f3d34a] px-3 py-1 text-xs font-black uppercase tracking-wide text-black">
                    Important
                  </span>
                )}
              </div>

              <p className="min-h-24 whitespace-pre-wrap text-sm font-medium leading-6 text-black">
                {note.desc}
              </p>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleEditClick(note)}
                  className="border-4 border-black bg-[#66d9ef] px-4 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  className="border-4 border-black bg-[#ff6b6b] px-4 py-2 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          </section>
        )}
      </div>
    </main>
  )
}

export default HomePage
