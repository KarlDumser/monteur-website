import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'OK', message: 'Simple server works!' }));
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
