import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Item from './models/Item.js';
import Claim from './models/Claim.js';

const users = [
  { name: 'Aarav Sharma', email: 'aarav@campus.edu', password: 'password123', phone: '9876543210' },
  { name: 'Priya Nair', email: 'priya@campus.edu', password: 'password123', phone: '9876543211' },
  { name: 'Rahul Verma', email: 'rahul@campus.edu', password: 'password123', phone: '9876543212' },
];

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const items = [
  {
    type: 'found',
    title: 'Student ID card - Computer Science',
    description: 'Found an ID card near the library entrance. Name starts with "S". Kept it at the library help desk.',
    category: 'ID Card',
    location: 'Central Library, main entrance',
    date: daysAgo(1),
  },
  {
    type: 'found',
    title: 'Blue steel water bottle',
    description: 'Dark blue insulated bottle with a dent on the bottom, left in Lecture Hall 3 after the morning class.',
    category: 'Bottles & Containers',
    location: 'Lecture Hall 3',
    date: daysAgo(2),
  },
  {
    type: 'found',
    title: 'Casio scientific calculator',
    description: 'Casio FX-991EX found on a bench outside the canteen. There are initials written on the back cover.',
    category: 'Electronics',
    location: 'Canteen seating area',
    date: daysAgo(3),
  },
  {
    type: 'found',
    title: 'Black hoodie, size M',
    description: 'Plain black hoodie left in the gym changing room. Washed and kept safely.',
    category: 'Clothing',
    location: 'Sports complex, gym',
    date: daysAgo(5),
  },
  {
    type: 'found',
    title: 'Bunch of keys with a red keychain',
    description: 'Three keys on a ring with a red plastic keychain, found in the CS block parking area.',
    category: 'Keys',
    location: 'CS block parking',
    date: daysAgo(1),
  },
  {
    type: 'lost',
    title: 'Lost my brown leather wallet',
    description: 'Lost somewhere between the admin block and hostel gate. Contains my ID and bus pass. Cash not important, please return the cards.',
    category: 'Wallet & Purse',
    location: 'Admin block to hostel gate',
    date: daysAgo(2),
  },
  {
    type: 'lost',
    title: 'Missing Data Structures textbook',
    description: 'Cormen "Introduction to Algorithms", my name is written on the first page. Left it in the reading room.',
    category: 'Books & Stationery',
    location: 'Library reading room, 2nd floor',
    date: daysAgo(4),
  },
  {
    type: 'lost',
    title: 'Lost silver bracelet',
    description: 'Thin silver chain bracelet, has sentimental value. Probably lost near the auditorium during the fest.',
    category: 'Jewellery',
    location: 'Auditorium',
    date: daysAgo(6),
  },
  {
    type: 'found',
    title: 'Grey backpack with laptop sleeve',
    description: 'Found in the bus bay. Contains notebooks but no ID. Handed over to the security office.',
    category: 'Bag',
    location: 'Bus bay',
    date: daysAgo(3),
  },
  {
    type: 'found',
    title: 'Wired earphones in a small pouch',
    description: 'White wired earphones inside a black zip pouch, found in the seminar hall after the workshop.',
    category: 'Electronics',
    location: 'Seminar hall',
    date: daysAgo(7),
  },
];

async function seed() {
  await connectDB(process.env.MONGODB_URI);

  await Promise.all([User.deleteMany({}), Item.deleteMany({}), Claim.deleteMany({})]);

  const created = [];
  for (const user of users) {
    created.push(await User.create(user));
  }

  const savedItems = await Item.create(
    items.map((item, index) => ({ ...item, postedBy: created[index % created.length]._id }))
  );

  await Claim.create({
    item: savedItems[2]._id,
    claimant: created[1]._id,
    message: 'That sounds like my calculator - the initials on the back are P.N. and I lost it last Tuesday.',
  });

  console.log(`Seeded ${created.length} users, ${savedItems.length} items, 1 claim.`);
  console.log('Login with any of these:');
  users.forEach((u) => console.log(`  ${u.email} / ${u.password}`));

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
