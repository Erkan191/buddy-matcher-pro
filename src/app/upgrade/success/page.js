import Link from "next/link";

export default function UpgradeSuccessPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-3 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
          Payment received
        </div>

        <h1 className="text-4xl font-bold">Thank you</h1>

        <p className="mt-4 text-lg text-zinc-600">
          Your payment went through. Pro unlock will be connected next.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white"
          >
            Back to Buddy Matcher
          </Link>

          <Link
            href="/upgrade"
            className="rounded-xl border border-zinc-300 px-5 py-3 font-medium hover:bg-zinc-50"
          >
            Back to upgrade page
          </Link>
        </div>
      </div>
    </main>
  );
}