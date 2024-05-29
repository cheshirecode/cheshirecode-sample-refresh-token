import type { ReactNode } from "react";

export type DetailsProps = BaseProps & {
  data: Record<string, ReactNode | ReactNode[]>;
  fieldCopy?: boolean;
  responsiveGrid?: boolean;
  oneFieldPerLine?: boolean;
  contentClassName?: string;
  labelClassName?: string;
  fieldClassName?: string;
};
