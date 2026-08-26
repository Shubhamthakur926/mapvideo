import { useLocation, useNavigate } from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    refresh: () => window.location.reload(),
  };
}

export function useSearchParams() {
  return new URLSearchParams(useLocation().search);
}

export function notFound(): never {
  throw new Error("Page not found");
}
