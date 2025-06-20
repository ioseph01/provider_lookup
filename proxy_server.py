# proxy_server.py
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import json

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Enable CORS for all requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        if self.path.startswith('/api/'):
            # Forward API requests to the NPI registry
            url = 'https://npiregistry.cms.hhs.gov' + self.path
            try:
                print(f"Fetching: {url}")  # Debug log
                with urllib.request.urlopen(url) as response:
                    data = response.read()
                
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                print(f"Error: {e}")  # Debug log
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error: {str(e)}".encode())
        else:
            # Serve static files (HTML, CSS, JS)
            try:
                if self.path == '/':
                    self.path = '/index.html'
                
                file_path = self.path[1:]  # Remove leading slash
                with open(file_path, 'rb') as file:
                    content = file.read()
                
                # Set content type based on file extension
                if self.path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html')
                elif self.path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css')
                elif self.path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"File not found")
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    print("Starting proxy server on http://localhost:3001")
    print("API requests: http://localhost:3001/api/...")
    print("Static files: http://localhost:3001/")
    server = HTTPServer(('localhost', 3001), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()