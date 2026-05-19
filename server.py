#!/usr/bin/env python3
import http.server
import socketserver
import json
import base64
import io
import urllib.request
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import pypdf
import os

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        parsed_url = urlparse(self.path)
        
        if parsed_url.path == '/api/extract-url':
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error_response(400, "Empty request body")
                return
                
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(post_data)
                url = data.get('url')
                if not url:
                    self.send_error_response(400, "El campo 'url' es requerido")
                    return
                
                print(f"[Backend] Extrayendo texto desde URL: {url}")
                
                # Fetch URL
                req = urllib.request.Request(
                    url, 
                    headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
                )
                with urllib.request.urlopen(req, timeout=15) as response:
                    html = response.read()
                
                # Parse with BeautifulSoup
                soup = BeautifulSoup(html, 'html.parser')
                
                # Decompose non-content elements
                for element in soup(["script", "style", "nav", "header", "footer", "iframe", "noscript", "aside"]):
                    element.decompose()
                
                # Extract text content
                text = soup.get_text(separator=' ')
                
                # Clean up whitespace
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                clean_text = '\n'.join(chunk for chunk in chunks if chunk)
                
                # Limit size to prevent memory/context overflows
                if len(clean_text) > 80000:
                    clean_text = clean_text[:80000] + "\n\n[...Texto truncado por longitud...]"
                
                print(f"[Backend] Extracción exitosa. Caracteres: {len(clean_text)}")
                self.send_json_response(200, {"text": clean_text})
                
            except Exception as e:
                print(f"[Backend] Error en extract-url: {str(e)}")
                self.send_error_response(500, f"Error al extraer URL: {str(e)}")
                
        elif parsed_url.path == '/api/parse-pdf':
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error_response(400, "Empty request body")
                return
                
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(post_data)
                pdf_base64 = data.get('pdf_base64')
                if not pdf_base64:
                    self.send_error_response(400, "El campo 'pdf_base64' es requerido")
                    return
                
                print("[Backend] Procesando PDF subido...")
                
                # Strip prefix if present (e.g. data:application/pdf;base64,)
                if ',' in pdf_base64:
                    pdf_base64 = pdf_base64.split(',')[1]
                
                pdf_bytes = base64.b64decode(pdf_base64)
                pdf_file = io.BytesIO(pdf_bytes)
                
                reader = pypdf.PdfReader(pdf_file)
                text_list = []
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_list.append(f"--- PÁGINA {idx+1} ---\n{page_text}")
                
                full_text = "\n\n".join(text_list)
                
                if len(full_text) > 80000:
                    full_text = full_text[:80000] + "\n\n[...Texto truncado por longitud...]"
                
                print(f"[Backend] PDF procesado. Páginas: {len(reader.pages)}, Caracteres: {len(full_text)}")
                self.send_json_response(200, {"text": full_text})
                
            except Exception as e:
                print(f"[Backend] Error en parse-pdf: {str(e)}")
                self.send_error_response(500, f"Error al decodificar PDF: {str(e)}")
        else:
            self.send_error_response(404, f"Ruta POST no encontrada: {parsed_url.path}")
            
    def send_json_response(self, status, data):
        response_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_error_response(self, status, message):
        self.send_json_response(status, {"error": message})
        
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    # Override log_message to output to console nicely
    def log_message(self, format, *args):
        print(f"[Server] {format % args}")

if __name__ == "__main__":
    # Ensure working directory is the folder of server.py
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Allow address reuse to avoid port blockages on restart
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"\n=============================================")
        print(f" Servidor Activo en http://localhost:{PORT}")
        print(f" Sirviendo archivos de: {os.getcwd()}")
        print(f" Presiona Ctrl+C para detener")
        print(f"=============================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDeteniendo servidor...")
