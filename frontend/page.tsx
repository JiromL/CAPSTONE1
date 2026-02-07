export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">Reservation Management System</h1>
      </div>

      <div className="relative flex place-items-center">
        <div className="relative w-full max-w-md">
          <div className="rounded-lg border border-gray-200 p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-semibold">Welcome</h2>
            <p className="mb-6 text-gray-600">
              Start managing your reservations with our modern system.
            </p>
            <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Get Started
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl text-left">
        <h3 className="mb-4 text-xl font-semibold">Features</h3>
        <ul className="list-inside list-disc space-y-2 text-gray-600">
          <li>Easy reservation booking</li>
          <li>Real-time availability</li>
          <li>AI chatbot support</li>
          <li>Admin dashboard</li>
        </ul>
      </div>
    </main>
  );
}
