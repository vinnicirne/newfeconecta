import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="text-8xl font-black text-white/10">404</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black">Página não encontrada</h1>
          <p className="text-gray-400 text-sm">
            Esta página não existe ou foi removida.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-whatsapp-teal text-white font-bold hover:opacity-90 transition-opacity"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
