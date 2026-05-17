const express = require('express');
const cors = require('cors');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let products = [];

function loadData() {
  products = [];
  fs.createReadStream(path.join(__dirname, 'Sample_Data.csv'))
    .pipe(csv())
    .on('data', (row) => {
      products.push(row);
    })
    .on('end', () => {
      console.log(`Loaded ${products.length} products successfully!`);
    })
    .on('error', (err) => console.error('Error loading CSV:', err));
}

loadData();

//Routes
app.get('/api/products', (req, res) => {
  const limit = parseInt(req.query.limit) || 500; //max 14268
  const page = parseInt(req.query.page) || 1;
  const start = (page - 1) * limit;

  const paginated = products.slice(start, start + limit);
  
  res.json({
    products: paginated,
    total: products.length,
    page,
    totalPages: Math.ceil(products.length / limit)
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});