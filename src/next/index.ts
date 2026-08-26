import { lazy, type ComponentType } from "react";

export default function dynamic<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>, _options?: unknown) {
  return lazy(loader);
}
