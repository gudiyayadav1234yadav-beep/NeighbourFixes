
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

let providers = JSON.parse(fs.readFileSync('./data/providers.json'));
let bookings = [];

app.get('/api/stats', (req, res) => {
  res.json({
    providers: providers.length,
    categories: [...new Set(providers.map(p => p.category))].length,
    bookings: bookings.length
  });
});

app.get('/api/categories', (req, res) => {
  const cats = ["All", ...new Set(providers.map(p => p.category))];
  res.json({ categories: cats });
});

app.get('/api/providers', (req, res) => {
  res.json({ providers });
});

app.post('/api/bookings', (req, res) => {
  const booking = { id: bookings.length + 1, ...req.body };
  bookings.push(booking);
  res.json({ success: true, booking_id: booking.id });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));

module.exports = app;
