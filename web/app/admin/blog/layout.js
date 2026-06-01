import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminBlogLayout({ children }) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.isRoot !== 1) {
    redirect('/admin');
  }
  return children;
}
