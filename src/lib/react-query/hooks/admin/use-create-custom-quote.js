import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '../../../api/apiFetch';
import { DEFAULT_CURRENCY } from '../../../admin/constants';
import { cleanDiscountForGhl, formatGhlLineItems } from '../../../admin/formatGhlEstimatePayload';
import { parseWpFetchError } from '../../../admin/utils/error-handler';

export function useCreateCustomQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactDetails,
      items,
      discount,
      sendNow = false,
      locationId,
    }) => {
      const currency = DEFAULT_CURRENCY;
      const payload = {
        contactDetails: {
          email: contactDetails.email?.trim(),
          firstName: contactDetails.firstName?.trim() || '',
          lastName: contactDetails.lastName?.trim() || '',
          name: [contactDetails.firstName, contactDetails.lastName].filter(Boolean).join(' ').trim(),
          phone: contactDetails.phone?.trim() || '',
        },
        items: formatGhlLineItems(items, currency),
        itemHints: (items || []).map((item) => ({
          name: item?.name || '',
          photoRequired: item?.photoRequired,
          isCustom: item?.isCustom,
        })).filter((hint) => hint.name),
        discount: cleanDiscountForGhl(discount),
        sendNow: Boolean(sendNow),
        altType: 'location',
        locationId: locationId || process.env.NEXT_PUBLIC_GHL_LOCATION_ID || null,
      };

      return apiFetch('/api/admin/quotes/custom-create', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      if (data?.estimateId) {
        queryClient.invalidateQueries({ queryKey: ['admin-estimate', data.estimateId] });
      }
      toast.success(data?.sent ? 'Quote sent to customer' : 'Quote saved as draft');
    },
    onError: (error) => {
      toast.error(parseWpFetchError(error) || 'Failed to create quote');
    },
  });
}
