import type { ReactNode } from "react";

type Props = {
  role: "ai" | "user";
  children: ReactNode;
  isLoading?: boolean;
};

export function AiMessage({ role, children, isLoading }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-ud-ink text-ud-surface px-[16px] py-[11px] rounded-[12px] max-w-[70%] text-[14px] font-medium tracking-[-0.005em]">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-[12px] items-start">
      <div className="shrink-0 mt-[2px] flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-ud-accent-tint">
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ud-accent"
        >
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        </svg>
      </div>
      <div className="flex-1 bg-ud-surface-soft border border-ud-soft rounded-[12px] p-[14px_16px] text-[14px] text-ud-text leading-[1.6]">
        {isLoading ? (
          <div className="flex gap-1 items-center py-1">
            <span
              className="w-2 h-2 bg-ud-muted rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 bg-ud-muted rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 bg-ud-muted rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
