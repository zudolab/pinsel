'use client';

import { useState } from 'react';

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqAccordionProps = {
  items: FaqItem[];
};

function FaqAccordionItem({ question, answer, index }: FaqItem & { index: number }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${index}`;
  const buttonId = `faq-button-${index}`;

  return (
    <div className="border-b border-pd-border">
      <h3>
        <button
          type="button"
          id={buttonId}
          className="flex w-full cursor-pointer items-center justify-between py-vgap-sm text-left"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <span className="text-sm font-medium text-pd-fg">{question}</span>
          <span
            className={`ml-hgap-xs text-pd-muted transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>
      </h3>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="pb-vgap-sm text-xs text-pd-muted"
        >
          {answer}
        </div>
      )}
    </div>
  );
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div>
      {items.map((item, index) => (
        <FaqAccordionItem key={item.question} {...item} index={index} />
      ))}
    </div>
  );
}
