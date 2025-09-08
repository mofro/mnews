// Type definitions for Next.js

import { IncomingMessage, ServerResponse } from "http";
import { ComponentType, AnchorHTMLAttributes } from "react";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      [key: `NEXT_PUBLIC_${string}`]: string;
    }
  }

  // Next.js API Types
  namespace Next {
    interface NextApiRequest extends IncomingMessage {
      method?: string;
      query: {
        [key: string]: string | string[];
      };
      cookies: {
        [key: string]: string;
      };
      body: any;
      env: NodeJS.ProcessEnv;
      preview?: boolean;
      previewData?: any;
      [key: string]: any;
    }

    interface NextApiResponse<T = any> extends ServerResponse {
      status(code: number): this;
      json(body: T): void;
      send(body: any): void;
      redirect(url: string): void;
      redirect(status: number, url: string): void;
      setHeader(name: string, value: string | string[]): this;
      removeHeader(name: string): this;
      setPreviewData(
        data: any,
        options?: {
          maxAge?: number;
          path?: string;
        },
      ): void;
      clearPreviewData(options?: { path?: string }): void;
      unstable_revalidate(
        urlPath: string,
        opts?: {
          unstable_onlyGenerated?: boolean;
        },
      ): Promise<void>;
      revalidate(
        urlPath: string,
        opts?: {
          unstable_onlyGenerated?: boolean;
        },
      ): Promise<void>;
      [key: string]: any;
    }
  }

  // Next.js Link Component
  module "next/link" {
    import { ComponentType } from "react";

    interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
      href: string;
      as?: string;
      replace?: boolean;
      scroll?: boolean;
      shallow?: boolean;
      passHref?: boolean;
      prefetch?: boolean;
      locale?: string | false;
    }

    const Link: ComponentType<LinkProps>;
    export default Link;
  }

  // Next.js Image Component
  module "next/image" {
    import { CSSProperties, ImgHTMLAttributes, ComponentType } from "react";

    interface StaticImageData {
      src: string;
      height: number;
      width: number;
      blurDataURL?: string;
    }

    interface ImageProps
      extends Omit<
        ImgHTMLAttributes<HTMLImageElement>,
        "src" | "srcSet" | "ref"
      > {
      src: string | StaticImageData;
      width?: number | string;
      height?: number | string;
      layout?: "intrinsic" | "fixed" | "responsive" | "fill";
      loader?: (resolverProps: {
        src: string;
        width: number;
        quality?: number;
      }) => string;
      quality?: number | string;
      priority?: boolean;
      loading?: "lazy" | "eager";
      lazyBoundary?: string;
      unoptimized?: boolean;
      objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
      objectPosition?: string;
      onLoadingComplete?: (result: {
        naturalWidth: number;
        naturalHeight: number;
      }) => void;
    }

    const Image: ComponentType<ImageProps>;
    export default Image;
  }
}

// CSS Modules
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}

// Image and Asset Types
declare module "*.svg" {
  const content: string;
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

declare module "*.ico" {
  const content: string;
  export default content;
}

declare module "*.bmp" {
  const content: string;
  export default content;
}

export {};
