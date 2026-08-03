export function Loader({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${sizes[size]} animate-spin rounded-full border-2 border-slate-200 border-t-blue-600`} />
      {label ? <p className="text-sm text-slate-500">{label}</p> : null}
    </div>
  );
}
