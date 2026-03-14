import { Routes, Route } from 'react-router-dom'

// Pages will be added as each module is built
function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-brand-600">EventMeet</h1>
              <p className="mt-2 text-gray-500">Meet real people at real events.</p>
              <p className="mt-6 text-sm text-gray-400">Frontend coming soon — server is up.</p>
            </div>
          </div>
        }
      />
    </Routes>
  )
}

export default App
