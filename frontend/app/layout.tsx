import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Paper to Notebook',
  description: 'Convert research papers to executable Jupyter notebooks',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
