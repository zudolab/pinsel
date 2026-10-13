import type { Child } from "@takazudo/zfb/zudo-react";

export interface PriceDetailCardProps {
  name: string;
  price: string;
  /** `税込 / 1ヶ月あたり25,000円`. */
  note: string;
}

export function PriceDetailCard({ name, price, note }: PriceDetailCardProps): Child {
  return (
    <div class="price-detail__card">
      <h3>{name}</h3>
      <p class="price">{price}</p>
      <p class="quiet">{note}</p>
    </div>
  );
}

export interface PriceDetailProps {
  /** `pinsel.price-detail-card` children (the two- and four-month courses). */
  items?: readonly unknown[];
}

/** The lessons クラス価格 cards. */
export function PriceDetail(props: PriceDetailProps): Child {
  return <div class="price-detail">{(props.items ?? []) as Child}</div>;
}
