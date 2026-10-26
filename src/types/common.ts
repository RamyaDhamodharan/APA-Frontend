export type PageResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
};

export type AnyRecord = Record<string, unknown>;
