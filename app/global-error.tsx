"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h1 className="text-xl font-bold text-gray-900">Application error</h1>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
        <button
          type="button"
          className="mt-6 rounded-lg bg-teal-700 px-4 py-2 text-white text-sm"
          onClick={() => reset()}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
