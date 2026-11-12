import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { catalogQueryKey } from "@/features/catalog/useCatalog";
import * as api from "./api";

export const adminKeys = {
  all: ["admin"] as const,
  products: ["admin", "products"] as const,
  tags: ["admin", "tags"] as const,
  productTags: ["admin", "product-tags"] as const,
  categories: ["admin", "categories"] as const,
  baseCategories: ["admin", "base-categories"] as const,
  orders: ["admin", "orders"] as const,
  orderItems: (orderId: string) => ["admin", "order-items", orderId] as const,
  users: ["admin", "users"] as const,
  invoiceSettings: ["admin", "invoice-settings"] as const,
};

export const useProducts = () => useQuery({ queryKey: adminKeys.products, queryFn: api.listProducts });
export const useTags = () => useQuery({ queryKey: adminKeys.tags, queryFn: api.listTags });
export const useProductTags = () => useQuery({ queryKey: adminKeys.productTags, queryFn: api.listProductTags });
export const useCategories = () => useQuery({ queryKey: adminKeys.categories, queryFn: api.listCategories });
export const useBaseCategories = () =>
  useQuery({ queryKey: adminKeys.baseCategories, queryFn: api.listBaseCategories });
export const useOrders = () => useQuery({ queryKey: adminKeys.orders, queryFn: api.listOrders });
export const useOrderItems = (orderId: string) =>
  useQuery({ queryKey: adminKeys.orderItems(orderId), queryFn: () => api.listOrderItems(orderId) });
export const useUsers = () => useQuery({ queryKey: adminKeys.users, queryFn: api.listProfiles });
export const useInvoiceSettings = () =>
  useQuery({ queryKey: adminKeys.invoiceSettings, queryFn: api.getInvoiceSettings, staleTime: Infinity });

interface AdminMutationOptions<TData, TVars> {
  /** Toast shown on success. */
  success: string | ((data: TData, vars: TVars) => string);
  /** Toast title shown on failure; the underlying message becomes the description. */
  error: string;
  onSuccess?: (data: TData, vars: TVars) => void;
}

/**
 * The one way the admin writes data: runs the call, toasts the outcome, and
 * refreshes every admin list plus the public catalog. The data set is small,
 * so refetching everything is cheaper than tracking what each write touches.
 */
export function useAdminMutation<TVars, TData = unknown>(
  mutationFn: (vars: TVars) => Promise<TData>,
  options: AdminMutationOptions<TData, TVars>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      toast.success(typeof options.success === "function" ? options.success(data, vars) : options.success);
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      queryClient.invalidateQueries({ queryKey: catalogQueryKey });
      options.onSuccess?.(data, vars);
    },
    onError: (error) => {
      console.error(options.error, error);
      toast.error(options.error, {
        description: error instanceof Error ? error.message : (error as { message?: string })?.message,
      });
    },
  });
}
