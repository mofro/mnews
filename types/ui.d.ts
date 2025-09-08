// UI Component Type Declarations

declare module "@/components/ui/Portal" {
  import { ReactNode } from "react";

  interface PortalProps {
    children: ReactNode;
    container?: HTMLElement | null;
  }

  export const Portal: React.FC<PortalProps>;
}

declare module "@/components/ui/button" {
  import { ButtonHTMLAttributes, ReactNode } from "react";

  interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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
  }

  export const Button: React.FC<ButtonProps>;
}

declare module "@/components/ui/card" {
  import { HTMLAttributes, ReactNode } from "react";

  interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
  }

  interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
  }

  interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
  }

  export const Card: React.FC<CardProps>;
  export const CardContent: React.FC<CardContentProps>;
  export const CardFooter: React.FC<CardFooterProps>;
}

declare module "@/components/ui/skeleton" {
  import { HTMLAttributes } from "react";

  interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
  }

  export const Skeleton: React.FC<SkeletonProps>;
}
