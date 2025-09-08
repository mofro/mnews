import { HTMLAttributes, ReactNode } from "react";

declare module "@/components/ui/card" {
  export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
  }

  export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
  }

  export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
  }

  export const Card: React.FC<CardProps>;
  export const CardContent: React.FC<CardContentProps>;
  export const CardFooter: React.FC<CardFooterProps>;
}
