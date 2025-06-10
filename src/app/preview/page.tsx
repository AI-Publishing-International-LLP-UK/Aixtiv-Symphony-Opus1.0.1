import Link from 'next/link';

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">Vision Lake Preview</h1>
        <p className="text-xl mb-8 text-gray-300">
          Please select a firm from the main page to access the AI workflow demonstration.
        </p>
        <Link 
          href="/"
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
        >
          Return to Main Page
        </Link>
      </div>
    </div>
  );
}

