import { Search } from 'lucide-react'

export const publicFilterLabelClass = 'mb-1.5 block text-sm font-medium text-[#0d1f35]'
export const publicFilterButtonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50'
export const publicFilterClearClass = 'rounded-lg border border-[#d4d8e3] px-4 py-2.5 text-sm font-medium text-[#0d1f35] hover:bg-[#f5f3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'

export function PublicFilterSearch({ iconSize = 16, ...props }) {
  return (
    <div className="relative">
      <Search size={iconSize} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input {...props} type="search" className="w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-9 pr-4 text-sm text-[#0d1f35] outline-none focus:border-blue-300 disabled:opacity-60" />
    </div>
  )
}
