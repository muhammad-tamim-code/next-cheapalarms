import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import { requireAdmin } from '../../../lib/auth/requireAdmin';
import { QuickQuoteWizard } from '../../../components/admin/QuickQuoteWizard';

export default function AdminQuotesNewPage({ authContext }) {
  return (
    <>
      <Head>
        <title>New Quick Quote • Admin</title>
      </Head>
      <AdminLayout title="New Quick Quote" authContext={authContext}>
        <div className="mb-4">
          <Link href="/admin/quotes" className="text-sm text-primary hover:text-primary-hover">
            ← Back to Quick Quote
          </Link>
        </div>
        <QuickQuoteWizard mode="create" />
      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) {
    return authCheck;
  }
  return { props: { ...(authCheck.props || {}) } };
}
