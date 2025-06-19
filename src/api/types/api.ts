export type ApiResponse<T = undefined> = {
    status: number;
    code: string;
    message: string;
    data?: T;
    error?: string;
  };
  