// Type definitions for next 14.2.32
// Project: https://nextjs.org

/// <reference types="node" />
/// <reference types="react" />

import { IncomingMessage, ServerResponse } from "http";
import { ComponentType, AnchorHTMLAttributes } from "react";

// Global augmentation for Next.js types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      [key: `NEXT_PUBLIC_${string}`]: string;
    }
  }

  // Next.js Core Types
  namespace Next {
    // API Request/Response types
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
    import { ComponentType, AnchorHTMLAttributes } from "react";

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

    interface ImageProps
      extends Omit<
        ImgHTMLAttributes<HTMLImageElement>,
        "src" | "srcSet" | "ref"
      > {
      src: string | StaticImport;
      width?: number | string;
      height?: number | string;
      layout?: "intrinsic" | "fixed" | "responsive" | "fill";
      loader?: ImageLoader;
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

    interface StaticImport {
      src: string;
      height: number;
      width: number;
      blurDataURL?: string;
      blurWidth?: number;
      blurHeight?: number;
    }

    type ImageLoader = (resolverProps: ImageLoaderProps) => string;

    interface ImageLoaderProps {
      src: string;
      width: number;
      quality?: number;
    }

    const Image: ComponentType<ImageProps>;
    export default Image;
  }

  // CSS Modules
  module "*.module.css" {
    const classes: { [key: string]: string };
    export default classes;
  }

  module "*.module.scss" {
    const classes: { [key: string]: string };
    export default classes;
  }

  // Image and Asset Types
  module "*.svg" {
    const content: string;
    export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    export default content;
  }

  module "*.png" {
    const content: string;
    export default content;
  }

  module "*.jpg" {
    const content: string;
    export default content;
  }

  module "*.jpeg" {
    const content: string;
    export default content;
  }

  module "*.gif" {
    const content: string;
    export default content;
  }

  module "*.webp" {
    const content: string;
    export default content;
  }

  module "*.ico" {
    const content: string;
    export default content;
  }

  module "*.bmp" {
    const content: string;
    export default content;
  }
}
