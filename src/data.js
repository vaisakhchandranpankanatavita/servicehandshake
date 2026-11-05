/* `price` stays a display string for existing pages; `from` is the numeric starting price used for sorting, filtering and estimates. */
export const serviceCategories = ['Repairs', 'Home care', 'Installation'];

export const services = [
  { name: 'Plumbing', description: 'Leaks, fittings and pipe repairs.', price: '₹500', from: 500, id: 1, category: 'Repairs', duration: 60, rating: 4.7, reviews: 214, terms: 'plumber pipes leak tap bathroom' },
  { name: 'Electrical', description: 'Repairs, fittings and installations.', price: '₹600', from: 600, id: 2, category: 'Repairs', duration: 60, rating: 4.8, reviews: 318, terms: 'electrician wiring lights fan' },
  { name: 'AC repair', description: 'Servicing, repairs and installation.', price: '₹800', from: 800, id: 3, category: 'Installation', duration: 90, rating: 4.6, reviews: 187, terms: 'air conditioning cooling maintenance installation' },
  { name: 'Carpentry', description: 'Furniture repairs and practical woodwork.', price: '₹700', from: 700, id: 4, category: 'Repairs', duration: 120, rating: 4.5, reviews: 96, terms: 'carpenter furniture woodwork custom' },
  { name: 'Painting', description: 'Interior and exterior painting.', price: '₹1,000', from: 1000, id: 5, category: 'Home care', duration: 240, rating: 4.6, reviews: 142, terms: 'painter interior exterior walls' },
  { name: 'Cleaning', description: 'Regular upkeep and deep cleaning.', price: '₹400', from: 400, id: 6, category: 'Home care', duration: 120, rating: 4.9, reviews: 402, terms: 'home cleaning deep clean house' },
  { name: 'Appliances', description: 'Repairs for the things you use every day.', price: '₹550', from: 550, id: 7, category: 'Repairs', duration: 60, rating: 4.4, reviews: 121, terms: 'appliance repair refrigerator washing machine microwave' },
  { name: 'Pest control', description: 'Treatment for common household pests.', price: '₹450', from: 450, id: 8, category: 'Home care', duration: 90, rating: 4.7, reviews: 88, terms: 'extermination insects bugs' },
];

/* Bookable windows, shared by every service for now. */
export const slots = ['09:00', '11:00', '13:00', '15:00', '17:00'];

export const categories = ['Electronics', 'Home & Kitchen', 'Fashion', 'Books', 'Sports & Outdoors', 'Food & Beverages'];

/* Images are placeholders until real product photos exist; categories now match what each product is. */
export const products = [
  { id: 7, img: '/assets/img/framed-art-and-books.webp', name: 'Garden Chickpea Salad', seller: "Jithu's Greens & More", price: 950, old: 1200, category: 'Food & Beverages' },
  { id: 6, img: '/assets/img/decor-vase-and-plant.webp', name: 'Simple Italian Salad', seller: "Jithu's Greens & More", price: 750, old: 900, category: 'Food & Beverages' },
  { id: 5, img: '/assets/img/potted-plant-right.webp', name: 'Caesar Salad', seller: "Jithu's Greens & More", price: 600, old: 800, category: 'Food & Beverages' },
  { id: 4, img: '/assets/img/potted-plant-left.webp', name: 'Penne Pasta Salad', seller: "Jithu's Greens & More", price: 800, old: 1200, category: 'Food & Beverages' },
  { id: 3, img: '/assets/img/cushions.webp', name: 'Crompton Surebreeze Sea Sapphira 1200 mm', seller: 'KV Electrical and Electronics stores', price: 1649, old: 2599, category: 'Electronics' },
  { id: 2, img: '/assets/img/tool-bag.webp', name: 'Bajaj Classico Sleek Plus 5S 1200MM (48")', seller: 'KV Electrical and Electronics stores', price: 2599, old: 5400, category: 'Electronics' },
  { id: 1, img: '/assets/img/floor-lamp.webp', name: 'Tubelight', seller: 'KV Electrical and Electronics stores', price: 350, old: 550, category: 'Electronics', blurb: '15W Philips.' },
];

/* YYYY-MM-DD in the visitor's local time (toISOString would give the UTC date, a day off near midnight). */
export const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const rupee = (n) => '₹' + n.toLocaleString('en-IN');
export const discount = (p) => Math.round((1 - p.price / p.old) * 100);

/* Sample professionals; `serviceIds` links them to services. Avatars are initials until real photos exist. */
export const providers = [
  { id: 1, name: 'Anil Kumar', serviceIds: [1], rating: 4.8, jobs: 412, response: '15 min', years: 9, verified: true },
  { id: 2, name: 'Rahul Menon', serviceIds: [2, 7], rating: 4.9, jobs: 530, response: '10 min', years: 11, verified: true },
  { id: 3, name: 'Sajan Thomas', serviceIds: [3], rating: 4.6, jobs: 288, response: '25 min', years: 7, verified: true },
  { id: 4, name: 'Biju Varghese', serviceIds: [4, 5], rating: 4.5, jobs: 190, response: '30 min', years: 12, verified: true },
  { id: 5, name: 'Meera Nair', serviceIds: [6, 8], rating: 4.9, jobs: 640, response: '12 min', years: 6, verified: true },
];

/* Sample reviews so pages aren't empty; kind is 'product' or 'service'. */
export const seedReviews = [
  { id: 's1', kind: 'service', target: 1, name: 'Divya R.', rating: 5, text: 'Fixed a leaking tap in under an hour. Tidy and on time.', at: 1760000000000 },
  { id: 's2', kind: 'service', target: 2, name: 'Arun P.', rating: 5, text: 'Rewired two switchboards safely and explained everything.', at: 1760500000000 },
  { id: 's3', kind: 'service', target: 6, name: 'Nisha K.', rating: 5, text: 'The deep clean was spotless. Booking was effortless.', at: 1761000000000 },
  { id: 'p1', kind: 'product', target: 3, name: 'Ravi S.', rating: 4, text: 'Quiet fan with good airflow. Fair price.', at: 1760200000000 },
  { id: 'p2', kind: 'product', target: 1, name: 'Latha M.', rating: 5, text: 'Bright and instant start.', at: 1760800000000 },
];
