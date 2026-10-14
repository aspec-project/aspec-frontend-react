import { Star } from 'lucide-react'

export default function RatingStars({ rating, size = 16 }) {
  return (
    <span className="inline-flex gap-0.5 text-[#8a7043]" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={size} fill={index < Math.round(rating ?? 0) ? 'currentColor' : 'none'} />
      ))}
    </span>
  )
}
