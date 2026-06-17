import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import { requireAdmin } from '../../../lib/auth/requireAdmin';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { useAdminEstimates } from '../../../lib/react-query/hooks/admin';
import { Spinner } from '../../../components/ui/spinner';
import { formatCurrencyAmount } from '../../../components/admin/EstimateDetailContent/helpers';
import { DEFAULT_CURRENCY } from '../../../lib/admin/constants';

export default function AdminQuotesIndex({ authContext }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [pickSearch, setPickSearch] = useState('');

  const { data, isLoading } = useAdminEstimates({
    search: pickSearch || undefined,
    pageSize: 20,
    enabled: pickSearch.length >= 2,
  });

  const estimates = data?.estimates || data?.items || [];

  return (
    <>
      <Head>
        <title>Quick Quote • Admin</title>
      </Head>
      <AdminLayout title="Quick Quote" authContext={authContext}>
        <div className="mx-auto max-w-3xl space-y-8">
          <p className="text-sm text-muted-foreground">
            Build or update a quote with the same line-item editor as estimate detail.
            Create new quotes need a customer email; editing an existing quote keeps the linked customer.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>Create new quote</CardTitle>
                <CardDescription>
                  Start from scratch, enter customer email, send or save as draft.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/admin/quotes/new">New quote →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Edit existing quote</CardTitle>
                <CardDescription>
                  Overwrite line items and notify the customer their quote was updated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search by email or estimate #…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && search.trim()) {
                      setPickSearch(search.trim());
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setPickSearch(search.trim())}
                  disabled={search.trim().length < 2}
                >
                  Search quotes
                </Button>
              </CardContent>
            </Card>
          </div>

          {pickSearch.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pick a quote to edit</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Spinner />
                  </div>
                ) : estimates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No quotes found.</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {estimates.map((est) => (
                      <li key={est.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{est.contactEmail || est.email || 'No email'}</p>
                          <p className="text-xs text-muted-foreground">
                            {est.estimateNumber || est.id}
                            {est.total != null && ` · ${formatCurrencyAmount(est.total, est.currency || DEFAULT_CURRENCY)}`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => router.push(`/admin/quotes/edit/${est.id}`)}
                        >
                          Edit
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
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
