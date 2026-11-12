import { useQuery } from "@tanstack/react-query";
import { fetchCatalog } from "./api";

export const catalogQueryKey = ["catalog"] as const;

export function useCatalog() {
  return useQuery({
    queryKey: catalogQueryKey,
    queryFn: fetchCatalog,
    staleTime: 5 * 60 * 1000,
  });
}
