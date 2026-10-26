export type MatchCandidate = {
  match_id: string;
  po_id: string;
  po_number: string;
  vendor_name?: string | null;
  total_amount?: number | string | null;
  currency?: string | null;
  score: number;
  status: string;
};
