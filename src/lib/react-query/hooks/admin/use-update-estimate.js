import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../api/apiFetch';
import { GHL_CURRENCY } from '../../../admin/constants';
import { cleanDiscountForGhl, formatGhlLineItems, toGhlCurrency } from '../../../admin/formatGhlEstimatePayload';
import { BRAND } from '../../../../config/brand';

/**
 * React Query hook for updating estimate items/prices
 * Used in admin photo review panel for quick adjustments
 */
export function useUpdateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ estimateId, locationId, items, discount, termsNotes, revisionData }) => {
      // First, fetch current estimate to get all required fields for GHL
      const params = new URLSearchParams();
      if (locationId) params.set('locationId', locationId);
      const search = params.toString();
      
      // Use Next.js API route instead of direct wpFetch
      // The API route runs server-side and can read httpOnly cookies
      const url = `/api/admin/estimates/${estimateId}${search ? `?${search}` : ''}`;
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.err || 'Invalid estimate data');
      }

      const currentData = json;

      const current = currentData;

      // Build compliant update payload
      const currency = toGhlCurrency(current.currency || GHL_CURRENCY);
      const name40 = (current.title || 'Estimate').substring(0, 40);
      const title = current.title || 'ESTIMATE';
      
      const businessDetails = current.businessDetails || [{ name: BRAND.name }];
      
      // Build contactDetails with required ID field (GHL requirement)
      const contactDetails = {
        id: current.contact?.id || '', // Required by GHL - must be a non-empty string
        name: current.contact?.name || '',
        email: current.contact?.email || '',
        phoneNo: current.contact?.phone || ''
      };
      
      // Validate contact ID is present
      if (!contactDetails.id) {
        throw new Error('Contact ID is required to update estimate. Estimate must have a linked contact.');
      }

      // Format dates
      const formatDate = (dateValue) => {
        if (!dateValue) return new Date().toISOString().split('T')[0];
        const d = new Date(dateValue);
        return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
      };

      const issueDate = formatDate(current.issueDate);
      const expiryDate = formatDate(current.expiryDate || Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Format items
      const formattedItems = formatGhlLineItems(items, currency);

      // Prepare discount (use provided or existing)
      const discountData = discount ?? current.discount ?? { type: 'percentage', value: 0 };
      const cleanDiscount = cleanDiscountForGhl(discountData);

      const payload = {
        estimateId,
        altId: locationId || current.locationId, // Backend extracts this and passes as query param, then removes from body
        altType: 'location',
        name: name40,
        title,
        businessDetails,
        currency,
        discount: cleanDiscount, // Use cleaned discount (only type and value)
        contactDetails,
        issueDate,
        expiryDate,
        frequencySettings: current.frequencySettings || { enabled: false },
        liveMode: current.liveMode !== undefined ? current.liveMode : true,
        items: formattedItems,
        termsNotes: termsNotes !== undefined ? termsNotes : (current.termsNotes || '')
      };

      // Include revision data if provided (for tracking estimate changes)
      if (revisionData) {
        payload.revisionData = revisionData;
      }

      // PUT to Next.js API route (which proxies to WordPress)
      return apiFetch('/api/admin/estimate/update', {
        method: 'PUT',
        body: payload,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate estimate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['admin-estimate', variables.estimateId] });
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      // Also invalidate portal queries so customer sees updated estimate
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'portal-status' && 
          query.queryKey[1] === variables.estimateId,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ 
        queryKey: ['portal-dashboard'],
        refetchType: 'active',
      });
    },
  });
}

