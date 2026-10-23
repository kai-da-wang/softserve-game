import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '冰淇淋模拟器', authors: [{ name: 'kai' }], description: '自由卷出你的冰淇淋，解锁口味，挑战每日与总排行榜。' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-Hans"><body>{children}</body></html>;
}
