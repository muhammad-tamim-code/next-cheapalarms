import { useRouter } from 'next/router';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BRAND } from '../../config/brand';

export default function QuoteRequestSuccessPage() {
  const router = useRouter();
  const { estimateId, locationId } = router.query;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-success/10 p-4">
            <CheckCircle2 className="h-16 w-16 text-success" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          Quote Request Submitted!
        </h1>
        
        <p className="text-muted-foreground mb-6">
          We&#39;ve received your quote request and created your estimate. Check your email for the portal link and password setup instructions.
        </p>

        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="bg-muted rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-foreground mb-2">
            <strong>What&#39;s next?</strong>
          </p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the &quot;Set Your Password&quot; link in the email</li>
            <li>Create your password to access your portal</li>
            <li>View and manage your quote</li>
          </ol>
        </div>

        <div className="space-y-3">
          {estimateId && (
            <Link
              href={`/portal?estimateId=${estimateId}${locationId ? `&locationId=${locationId}` : ''}`}
              className="w-full bg-primary text-primary-foreground rounded-xl px-6 py-3 font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              View Portal
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          
          <Link
            href="/quote"
            className="block w-full border border-border text-foreground rounded-xl px-6 py-3 font-semibold hover:bg-muted transition-colors text-center"
          >
            Request Another Quote
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Didn&#39;t receive the email? Check your spam folder or{' '}
          <a href={`mailto:${BRAND.supportEmail}`} className="text-primary underline">
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}
