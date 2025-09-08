import { ButtonHTMLAttributes, ReactNode } from "react";

declare module "@/components/ui/button" {
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
    children: ReactNode;
    className?: string;
  }

  const Button: React.FC<ButtonProps>;
  export default Button;
}
