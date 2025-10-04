import { NavShell } from '@/components/NavShell';

export default function DbaLayout({ children }: { children: React.ReactNode }) {
  return <NavShell>{children}</NavShell>;
}
