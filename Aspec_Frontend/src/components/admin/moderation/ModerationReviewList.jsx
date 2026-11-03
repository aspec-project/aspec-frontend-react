import ModerationReviewCard from './ModerationReviewCard'

/**
 * Lista das avaliações da moderação, um cartão por avaliação. Cada `li` guarda o id da avaliação em
 * `data-review-id`, para a página pôr o foco no cartão certo depois de recarregar.
 *
 * @param {{
 *   reviews: object[],
 *   actionsDisabled?: boolean,
 *   onAction: (action: 'hide'|'show'|'unflag', review: object) => void,
 *   listRef?: import('react').Ref<HTMLUListElement>,
 * }} props `listRef` dá à página acesso à lista para gerir o foco.
 * @returns {JSX.Element}
 */
export default function ModerationReviewList({ reviews, actionsDisabled = false, onAction, listRef }) {
  return (
    <ul ref={listRef} aria-label="Avaliações" className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} data-review-id={review.id}>
          <ModerationReviewCard review={review} actionsDisabled={actionsDisabled} onAction={onAction} />
        </li>
      ))}
    </ul>
  )
}
