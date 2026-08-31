import { TopNav } from '@/components/layout/top-nav'

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
