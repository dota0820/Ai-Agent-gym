/** A person's avatar: the first letter of their name, capitalised (Jason → J). */
export function avatarLetter(name?: string): string {
  const c = (name ?? "").trim().charAt(0);
  return c ? c.toUpperCase() : "我";
}

export default function Avatar({
  name,
  size = 40,
  className = "",
}: {
  name?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-forest font-['Space_Grotesk'] font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
    >
      {avatarLetter(name)}
    </span>
  );
}
