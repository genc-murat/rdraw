// Generic slice creator type that allows cross-slice access via get()
export type StoreCreator<T> = (
  set: (partial: Partial<any> | ((state: any) => Partial<any>)) => void,
  get: () => any
) => T;
