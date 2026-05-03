import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
        <p className="mb-3 text-sm font-semibold text-brand-600">AI活用無料診断</p>
        <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-4xl">AIを使いたいけど、何から始めるべきか迷う方へ</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          町工場・個人事業主の方にも分かりやすい形で、あなたの状況に合ったAI活用の第一歩をご案内します。
        </p>
        <Link
          href="/diagnosis"
          className="mt-8 inline-flex rounded-lg bg-brand-600 px-8 py-4 text-lg font-semibold text-white shadow hover:bg-brand-500"
        >
          無料診断をはじめる
        </Link>
      </div>
    </main>
  );
}
