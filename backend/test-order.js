async function main() {
  const payload = {
    customerId: 'c1',
    customerName: 'Test Customer',
    total: 1500.50,
    items: [
      {
        productId: 'p1',
        name: 'Test Product',
        qty: 10,
        price: 150.05
      }
    ]
  };

  const res = await fetch('http://localhost:5000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
main();
