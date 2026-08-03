import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import OrderExperience from '@/components/order/OrderExperience';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Order Online',
  description:
    'Order Fusion Coffee ahead for pickup — specialty espresso, matcha, breakfast sandwiches and eats, made fresh in downtown Fairfield, IL. Skip the line.',
  alternates: { canonical: '/order/' },
};

export default function OrderPage() {
  return (
    <>
      <PageHero
        eyebrow="Order online"
        title="Skip the line."
        intro={`Build your order for pickup at ${site.address.street}. Made fresh when you arrive.`}
        ghost="Order"
      />
      <OrderExperience />
    </>
  );
}
