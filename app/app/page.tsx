import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">SynapseDB</h1>
      <p className="mb-6 text-gray-700">Choose a tool to get started:</p>

      <ul className="space-y-3">
        <li>
          <Link href="/hybrid" className="text-blue-600 underline">
            Hybrid Query (SQL + Documents)
          </Link>
        </li>
        <li>
          <Link href="/db" className="text-blue-600 underline">
            Inspect Database Schema
          </Link>
        </li>
        <li>
          <Link href="/upload" className="text-blue-600 underline">
            Upload Documents
          </Link>
        </li>
        <li>
          <Link href="/query" className="text-blue-600 underline">
            Run a Natural Language Query
          </Link>
        </li>
      </ul>
    </div>
  )
}
