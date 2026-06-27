async function main() {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId: 'E1001', password: 'password123' })
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data);
}
main().catch(console.error);
