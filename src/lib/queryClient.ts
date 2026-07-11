import { QueryClient } from "@tanstack/react-query";

/**
 * READ BUDGET (see docs/READ_BUDGET.md): Firestore bills per document
 * read, and at 500+ schools navigation-driven refetches are the main
 * cost. Every mutation in the app explicitly invalidates the query keys
 * it changes, so a LONG staleTime is safe: the current user's own
 * writes appear instantly (invalidation), other users' changes appear
 * within the stale window or on reload. 5 minutes cuts re-reads ~10x
 * versus 30s without hurting the single-school workflows.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
