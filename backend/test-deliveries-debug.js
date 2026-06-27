async function main() {
  const payload = {
    driverName: 'Raju',
    vehicleNo: 'TG-01-MJ-8822',
    stops: [
      {
        orderId: 'o102',
        customerName: 'Grand Royal Hotel',
        address: 'Unknown Address',
        qty: 35
      }
    ]
  };

  const res = await fetch('http://localhost:5000/api/deliveries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
main();
