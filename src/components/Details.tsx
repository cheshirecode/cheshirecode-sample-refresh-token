import cx from "classnames";

import type { DetailsProps } from "./typings";
import createOnClickCopyToClipboard from "../services/browser/createOnClickCopyToClipboard";

const Details = (props: DetailsProps) => {
  const {
    className,
    labelClassName,
    fieldClassName,
    fieldCopy,
    data = {},
    children,
    ...rest
  } = props;
  if (!children && Object.keys(data)?.length === 0) {
    return null;
  }
  return (
    <section
      className={cx(
        "contain-content",
        "@container",
        "flex flex-col",
        className,
      )}
      {...rest}
    >
      {children ??
        Object.keys(data).map((k) => {
          const v = data[k];
          // if (typeof v === "undefined" || v === null || v === "") {
          //   return null;
          // }
          const isFieldCopyPossible = fieldCopy && v;
          return (
            <div key={k} className="flex min-w-0">
              <span
                className={cx(
                  "border border-transparent",
                  "color-secondary opacity-60",
                  "flex-none flex-basis-[10rem]",
                  "text-right",
                  labelClassName,
                )}
              >
                {k}
              </span>
              <span
                className={cx(
                  "px-1",
                  "border border-transparent",
                  "color-primary truncate min-w-0",
                  isFieldCopyPossible &&
                    "cursor-copy border border-solid @hover:border-black ",
                  fieldClassName,
                )}
                {...(isFieldCopyPossible
                  ? {
                      onClick: createOnClickCopyToClipboard(String(v), {
                        preventDefault: true,
                      }),
                    }
                  : {})}
                data-testid={`${k}-value`}
              >
                {v}
              </span>
            </div>
          );
        })}
    </section>
  );
};

export default Details;
