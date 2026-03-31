import { useState } from 'react'

function HomePage() {
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [notes, setNotes] = useState([
    {
      id: 1,
      title: 'Welcome note',
      content: 'Welcome. Type a note and click Add to save it here.',
    },
  ])

  const handleAddNote = () => {
    const trimmedTitle = noteTitle.trim()
    const trimmedNote = noteText.trim()

    if (!trimmedTitle || !trimmedNote) {
      return
    }

    setNotes((currentNotes) => [
      {
        id: Date.now(),
        title: trimmedTitle,
        content: trimmedNote,
      },
      ...currentNotes,
    ])
    setNoteTitle('')
    setNoteText('')
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
            Write a note, click add, and it appears below.
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

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleAddNote}
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
            >
              Add Note
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <article
              key={note.id}
              className="min-h-36 rounded-3xl border border-amber-200 bg-[#fff9d8] p-5 shadow-[0_12px_24px_rgba(120,84,0,0.08)]"
            >
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                {note.title}
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {note.content}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

export default HomePage
