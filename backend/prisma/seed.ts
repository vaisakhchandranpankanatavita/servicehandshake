import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const services = [
  { id: 1, name: 'Plumbing', description: 'Leaks, fittings and pipe repairs.', category: 'Repairs', fromPrice: 500, duration: 60, terms: 'plumber pipes leak tap bathroom' },
  { id: 2, name: 'Electrical', description: 'Repairs, fittings and installations.', category: 'Repairs', fromPrice: 600, duration: 60, terms: 'electrician wiring lights fan' },
  { id: 3, name: 'AC repair', description: 'Servicing, repairs and installation.', category: 'Installation', fromPrice: 800, duration: 90, terms: 'air conditioning cooling maintenance installation' },
  { id: 4, name: 'Carpentry', description: 'Furniture repairs and practical woodwork.', category: 'Repairs', fromPrice: 700, duration: 120, terms: 'carpenter furniture woodwork custom' },
  { id: 5, name: 'Painting', description: 'Interior and exterior painting.', category: 'Home care', fromPrice: 1000, duration: 240, terms: 'painter interior exterior walls' },
  { id: 6, name: 'Cleaning', description: 'Regular upkeep and deep cleaning.', category: 'Home care', fromPrice: 400, duration: 120, terms: 'home cleaning deep clean house' },
  { id: 7, name: 'Appliances', description: 'Repairs for the things you use every day.', category: 'Repairs', fromPrice: 550, duration: 60, terms: 'appliance repair refrigerator washing machine microwave' },
  { id: 8, name: 'Pest control', description: 'Treatment for common household pests.', category: 'Home care', fromPrice: 450, duration: 90, terms: 'extermination insects bugs' },
];

const providers = [
  { id: 1, name: 'Anil Kumar', serviceIds: [1], years: 9, response: '15 min' },
  { id: 2, name: 'Rahul Menon', serviceIds: [2, 7], years: 11, response: '10 min' },
  { id: 3, name: 'Sajan Thomas', serviceIds: [3], years: 7, response: '25 min' },
  { id: 4, name: 'Biju Varghese', serviceIds: [4, 5], years: 12, response: '30 min' },
  { id: 5, name: 'Meera Nair', serviceIds: [6, 8], years: 6, response: '12 min' },
];

const seller1 = "Jithu's Greens & More";
const seller2 = 'KV Electrical and Electronics stores';
const products = [
  { id: 7, img: '/assets/img/framed-art-and-books.webp', name: 'Garden Chickpea Salad', seller: seller1, price: 950, oldPrice: 1200, category: 'Food & Beverages' },
  { id: 6, img: '/assets/img/decor-vase-and-plant.webp', name: 'Simple Italian Salad', seller: seller1, price: 750, oldPrice: 900, category: 'Food & Beverages' },
  { id: 5, img: '/assets/img/potted-plant-right.webp', name: 'Caesar Salad', seller: seller1, price: 600, oldPrice: 800, category: 'Food & Beverages' },
  { id: 4, img: '/assets/img/potted-plant-left.webp', name: 'Penne Pasta Salad', seller: seller1, price: 800, oldPrice: 1200, category: 'Food & Beverages' },
  { id: 3, img: '/assets/img/cushions.webp', name: 'Crompton Surebreeze Sea Sapphira 1200 mm', seller: seller2, price: 1649, oldPrice: 2599, category: 'Electronics' },
  { id: 2, img: '/assets/img/tool-bag.webp', name: 'Bajaj Classico Sleek Plus 5S 1200MM (48")', seller: seller2, price: 2599, oldPrice: 5400, category: 'Electronics' },
  { id: 1, img: '/assets/img/floor-lamp.webp', name: 'Tubelight', seller: seller2, price: 350, oldPrice: 550, category: 'Electronics', blurb: '15W Philips.' },
];

async function main() {
  for (const s of services) await prisma.service.upsert({ where: { id: s.id }, create: s, update: s });
  for (const { serviceIds, ...p } of providers) {
    const connect = serviceIds.map((id) => ({ id }));
    await prisma.provider.upsert({ where: { id: p.id }, create: { ...p, services: { connect } }, update: { ...p, services: { set: connect } } });
  }
  for (const p of products) await prisma.product.upsert({ where: { id: p.id }, create: p, update: p });
  await prisma.coupon.upsert({ where: { code: 'FIXZY10' }, create: { code: 'FIXZY10', percent: 10 }, update: {} });
  console.log('Seeded catalog.');
}

main().finally(() => prisma.$disconnect());
