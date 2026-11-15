import { Link } from 'react-router-dom';

export function Proximamente({ titulo }: { titulo: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
      <p className="mt-2 text-slate-600">Esta sección se construye en la próxima fase.</p>
      <Link to="/programas" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
        Mientras tanto, explorá los programas →
      </Link>
    </div>
  );
}
