export function CompareNote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="mt-2 text-xs text-amber-600 font-medium">{text}</p>
  );
}
