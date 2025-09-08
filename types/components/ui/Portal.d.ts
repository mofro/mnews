import { ReactNode } from "react";

declare module "@/components/ui/Portal" {
  export interface PortalProps {
    children: ReactNode;
    wrapperId?: string;
  }

  const Portal: (props: PortalProps) => React.ReactPortal | null;
  export default Portal;
}
