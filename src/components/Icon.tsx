/**
 * Icons from Google's Material Symbols (Outlined, Apache 2.0), loaded as a font
 * that only contains the glyphs listed in MS below (see layout.tsx). They follow
 * `currentColor`. Decorative by default; pass `label` when the icon is the only
 * thing that explains a control.
 */
const MS = {
  home: "home",
  chat: "chat_bubble",
  food: "restaurant",
  clipboard: "assignment",
  user: "person",
  calendar: "calendar_month",
  target: "track_changes",
  dumbbell: "fitness_center",
  camera: "photo_camera",
  mic: "mic",
  plus: "add",
  up: "arrow_upward",
  stop: "stop",
  pen: "edit",
  volume: "volume_up",
  mute: "volume_off",
  x: "close",
  check: "check",
  link: "link",
  play: "play_arrow",
  book: "menu_book",
  brain: "psychology",
  cpu: "memory",
  lock: "lock",
  palette: "palette",
  sparkles: "auto_awesome",
  bulb: "lightbulb",
  timer: "timer",
  flame: "local_fire_department",
  heart: "favorite",
  settings: "settings",
  video: "videocam",
  star: "star",
  alert: "warning",
  chevronLeft: "chevron_left",
  chevronRight: "chevron_right",
  chevronDown: "expand_more",
  arrowRight: "arrow_forward",
  history: "history",
  database: "database",
  key: "key",
  menu: "menu",
  trash: "delete",
  name: "badge",
  bolt: "bolt",
  robot: "smart_toy",
  nutrition: "nutrition",
  chart: "bar_chart",
  account: "account_circle",
  forum: "forum",
  addPhoto: "add_a_photo",
  scale: "monitor_weight",
  checkCircle: "check_circle",
  run: "directions_run",
  spa: "spa",
  bed: "hotel",
  bell: "notifications",
  swap: "swap_horiz",
} as const;

export type IconName = keyof typeof MS;

/** Every glyph the app uses, sorted, for the font request's icon_names. */
export const ICON_GLYPHS = [...new Set(Object.values(MS))].sort().join(",");

export default function Icon({
  name,
  size = 20,
  stroke = 2,
  fill = false,
  label,
  className = "",
}: {
  name: IconName;
  size?: number;
  /** Kept for old callers: 2.5 and up draws a heavier glyph. */
  stroke?: number;
  fill?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`ms shrink-0 ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${fill || name === "play" ? 1 : 0}, 'wght' ${stroke >= 2.5 ? 600 : 400}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
      }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {MS[name]}
    </span>
  );
}
