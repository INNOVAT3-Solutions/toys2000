'use client';

import { hasHtmlMarkup } from '@/lib/format-description';

export default function ProductDescription({ description }) {
  if (!description) return null;

  if (hasHtmlMarkup(description)) {
    return (
      <div
        className="text-sm text-[#5f6980] leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    );
  }

  return <p className="text-sm text-[#5f6980] leading-relaxed">{description}</p>;
}
