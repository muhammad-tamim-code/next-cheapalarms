import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/admin/layout/AdminLayout';
import { requireAdmin } from '../../../../lib/auth/requireAdmin';
import { QuickQuoteWizard } from '../../../../components/admin/QuickQuoteWizard';
import { useAdminEstimate } from '../../../../lib/react-query/hooks/admin';
import { Spinner } from '../../../../components/ui/spinner';
import { Button } from '../../../../components/ui/button';

export default function AdminQuotesEditPage({ authContext }) {
  const router = useRouter();
  const { estimateId } = router.query;
  const id = typeof estimateId === 'string' ? estimateId : null;

  const { data, isLoading, error } = useAdminEstimate({
    estimateId: id,
    enabled: !!id,
  });

  return (
    <>
      <Head>
        <title>Edit Quick Quote • Admin</title>
      </Head>
      <AdminLayout title="Edit Quick Quote" authContext={authContext}>
        <div className="mb-4">
          <Link href="/admin/quotes" className="text-sm text-primary hover:text-primary-hover">
            ← Back to Quick Quote
          </Link>
        </div>
        {!id && null}
        {id && isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}
        {id && !isLoading && (error || !data?.ok) && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-semibold text-destructive">Could not load quote</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/admin/quotes">Back</Link>
            </Button>
          </div>
        )}
        {id && !isLoading && data?.ok && (
          <QuickQuoteWizard
            key={id}
            mode="edit"
            estimateId={id}
            estimate={data}
          />
        )}
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
