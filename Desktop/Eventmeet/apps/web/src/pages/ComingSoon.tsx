import { Construction } from 'lucide-react'

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-14 h-14 rounded-xl bg-violet/15 flex items-center justify-center mb-4">
        <Construction className="w-7 h-7 text-violet-light" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-text-secondary text-sm">This page is being built. Check back soon.</p>
    </div>
  )
}
