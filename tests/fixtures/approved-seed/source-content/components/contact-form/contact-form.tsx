'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

const defaultCourseOptions = ['未定', '有料進路相談', '2ヶ月コース', '4ヶ月コース'];

export type ContactFormProps = {
  courseOptions?: string[];
};

export function ContactForm({ courseOptions = defaultCourseOptions }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        params.append(key, value);
      }
    });
    const body = params.toString();

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) {
        throw new Error(`${res.status}`);
      }
      setSubmitted(true);
    } catch {
      setError('送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-vgap-xl">
        <p className="text-lg font-bold text-pd-link">送信ありがとうございます</p>
        <p className="mt-vgap-sm text-sm text-pd-muted">
          通常2〜3営業日以内にご返信いたします。しばらくお待ちください。
        </p>
      </div>
    );
  }

  return (
    <form
      name="contact"
      data-netlify="true"
      onSubmit={handleSubmit}
      className="max-w-[600px] mx-auto flex flex-col gap-vgap-md"
    >
      <input type="hidden" name="form-name" value="contact" />

      {error && (
        <p className="text-sm text-pd-error text-center" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-pd-fg mb-vgap-2xs">
          お名前
          <span className="text-pd-accent ml-hgap-2xs text-xs">必須</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="w-full rounded-[3px] border border-pd-border bg-pd-bg px-hgap-xs py-vgap-xs text-sm text-pd-fg outline-none focus:border-pd-link"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-pd-fg mb-vgap-2xs">
          メールアドレス
          <span className="text-pd-accent ml-hgap-2xs text-xs">必須</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="w-full rounded-[3px] border border-pd-border bg-pd-bg px-hgap-xs py-vgap-xs text-sm text-pd-fg outline-none focus:border-pd-link"
        />
      </div>

      <div>
        <label htmlFor="course" className="block text-sm font-medium text-pd-fg mb-vgap-2xs">
          ご希望のコース
        </label>
        <select
          id="course"
          name="course"
          className="w-full rounded-[3px] border border-pd-border bg-pd-bg px-hgap-xs py-vgap-xs text-sm text-pd-fg outline-none focus:border-pd-link"
        >
          {courseOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-pd-fg mb-vgap-2xs">
          ご相談内容
          <span className="text-pd-accent ml-hgap-2xs text-xs">必須</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className="w-full rounded-[3px] border border-pd-border bg-pd-bg px-hgap-xs py-vgap-xs text-sm text-pd-fg outline-none focus:border-pd-link resize-y"
        />
      </div>

      <div className="text-center">
        <button
          type="submit"
          disabled={submitting}
          className="inline-block bg-pd-accent text-pd-bg px-hgap-md py-vgap-xs rounded-[3px] text-sm font-bold tracking-[1px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? '送信中...' : '送信する'}
        </button>
      </div>
    </form>
  );
}
