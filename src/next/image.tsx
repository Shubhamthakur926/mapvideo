import type { ImgHTMLAttributes } from "react";

export default function Image({ alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img alt={alt} {...props} />;
}
