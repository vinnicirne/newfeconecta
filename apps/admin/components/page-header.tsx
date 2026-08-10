import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold dark:text-white tracking-tight">{title}</h1>
        {description && <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );
}
