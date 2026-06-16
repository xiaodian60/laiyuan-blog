import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '莱源公司',
  description: '莱源公司官方博客',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
