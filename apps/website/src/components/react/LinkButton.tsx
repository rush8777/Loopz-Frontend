import { Button } from "@movecues/ui";

type Props = {
  href: string;
  label: string;
  variant?: "default" | "outline";
  size?: "default" | "lg";
  className?: string;
};

export function LinkButton({ href, label, variant = "default", size = "default", className }: Props) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a href={href}>{label}</a>
    </Button>
  );
}
