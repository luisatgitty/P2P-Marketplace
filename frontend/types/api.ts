export type ApiSuccess<T> = {
  retCode: string;
  message: string;
  data: T;
};
