import Head from 'next/head';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import { requireAdmin } from '../../../lib/auth/requireAdmin';
import QuickQuoteBuilder from '../../../components/admin/QuickQuoteBuilder';

export default function AdminQuotesIndex({ authContext }) {
  return (
    <>
      <Head><title>Quick Quote • Admin</title></Head>
      <AdminLayout title="Quick Quote" subtitle="Build a custom estimate from products" authContext={authContext}>
        <QuickQuoteBuilder />
      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) return authCheck;
  return { props: { ...(authCheck.props || {}) } };
}
