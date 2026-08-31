import { TopNav } from '@/components/layout/top-nav'

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <TopNav />
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  )
}
