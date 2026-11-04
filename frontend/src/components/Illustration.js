// Decorative art from the FeedingHands illustration library (public/illustrations/<name>.webp, pre-sharpened 2x).
// Always aria-hidden: every page says in text what the picture shows.
export default function Illustration({ name, className = "", style }) {
  return (
    <img
      src={`/illustrations/${name}.webp`}
      alt=""
      aria-hidden="true"
      draggable="false"
      decoding="async"
      className={`fh-art ${className}`}
      style={style}
    />
  );
}
