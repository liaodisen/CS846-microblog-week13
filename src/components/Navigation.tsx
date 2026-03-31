/**
 * Navigation Component
 * Placeholder for main navigation and header.
 * To be implemented in Phase 5.
 */

export function Navigation() {
  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">MiniBlog</h1>
        <ul className="flex gap-6">
          <li><a href="/" className="hover:underline">Feed</a></li>
          <li><a href="/login" className="hover:underline">Login</a></li>
          <li><a href="/register" className="hover:underline">Register</a></li>
        </ul>
      </div>
    </nav>
  );
}
