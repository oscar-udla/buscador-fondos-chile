# Buscador de Fondos de Innovación Chile 2026 🇨🇱💡

Buscador inteligente, interactivo y en tiempo real de fondos concursables y proyectos de innovación, emprendimiento e investigación en Chile para el año 2026. 

Este proyecto se ha diseñado como una **Single Page Application (SPA)** de alto rendimiento visual (Glassmorphism, transiciones fluidas, soporte de temas claro/oscuro) que opera consumiendo una base de datos de fondos dinámicamente actualizada mediante scraping.

## 🚀 Características Principales

1. **Catálogo Unificado**: Acceso consolidado a convocatorias de **CORFO, ANID, SERCOTEC, Start-Up Chile, FIA y FOSIS**.
2. **Motor de Búsqueda y Filtros Combinados**: Filtra por institución, sector (Biotecnología, Software, Social, Silvoagropecuario, etc.), perfil del postulante (Persona Natural, Empresa/Pyme, Investigador), etapa del proyecto e intervalo de financiamiento.
3. **Asistente Inteligente (Match Quiz)**: Un cuestionario interactivo de 4 pasos que calcula el porcentaje de compatibilidad de cada fondo con tu proyecto en base a tu perfil, madurez y presupuesto, recomendándote las mejores 3 opciones.
4. **Simulador Financiero de Cofinanciamiento**: Ajusta el presupuesto de tu proyecto y calcula en tiempo real cuánto cubre el subsidio del Estado (según topes del fondo y porcentajes de cofinanciamiento) y cuánto debe ser tu aporte propio.
5. **Redactor IA (BETA)**: Herramienta que permite subir o extraer las bases técnicas de una convocatoria (vía PDF, URL o pegado manual), evalúa la alineación de tu idea de proyecto y genera borradores automáticos para el formulario de postulación utilizando **Gemini 1.5 Flash** (mediante tu propia API Key guardada de forma segura en `localStorage`).
6. **Sistema de Favoritos**: Guarda tus fondos seleccionados para revisarlos y simular sus presupuestos en cualquier momento (persiste localmente en tu navegador usando `localStorage`).
7. **Gráficos Estadísticos Dinámicos**: Dashboard con gráficos SVG interactivos autogenerados para analizar la distribución de fondos por institución, etapa y montos máximos.
8. **Scraper Híbrido Automatizado**: Script en Python que recopila convocatorias oficiales activas y las fusiona con una base de datos curada de convocatorias proyectadas para el 2026.

---

## 🛠️ Requisitos e Instalación

El proyecto se ejecuta localmente sin necesidad de complejas compilaciones o dependencias pesadas (Vanilla HTML5, CSS3, Javascript, Python 3).

### 1. Activar el Entorno Virtual (venv)
Asegúrate de estar en el directorio raíz del proyecto y activa el entorno virtual de Python para el scraper:

```bash
# En macOS/Linux:
source venv/bin/activate

# En Windows (PowerShell):
.\venv\Scripts\Activate.ps1
```

### 2. Instalación de Dependencias
Si necesitas reinstalar o actualizar las dependencias del scraper y el backend:

```bash
pip install -r requirements.txt
# O manualmente:
pip install requests beautifulsoup4 pypdf
```

---

## ⚙️ Uso y Ejecución

### Paso 1: Actualizar la Base de Datos (Opcional)
Ejecuta el scraper para buscar convocatorias actuales y generar el archivo estructurado de datos `fondos_scraped.json`:

```bash
python3 scraper.py
```

*Nota: Si el scraping falla debido a caídas o cambios estructurales en los portales del gobierno chileno, el script automáticamente cargará y combinará una base de datos local curada de 2026 para garantizar el correcto funcionamiento del buscador.*

### Paso 2: Levantar el Servidor Web Local y Endpoints API
Para servir la Single Page Application (SPA) y habilitar los servicios de extracción de bases (URL/PDF), inicia el servidor interactivo Python:

```bash
python3 server.py
```

### Paso 3: Abrir en el Navegador
Abre tu navegador de preferencia e ingresa a la siguiente dirección:

```text
http://localhost:8000
```

---

## 📂 Estructura del Proyecto

* **`index.html`**: Estructura semántica de la SPA, contenedores de tarjetas, modales y layouts optimizados para SEO.
* **`style.css`**: Hoja de estilos con variables de color HSL personalizadas, variables del tema claro y oscuro, efectos de glassmorphism y diseño responsivo adaptado a móviles.
* **`app.js`**: Controlador de lógica frontend. Gestiona las pestañas, filtros reactivos, asistente inteligente (Quiz), simulador de cofinanciamiento y generación de SVG gráficos.
* **`scraper.py`**: Script de web scraping en Python. Extrae convocatorias, valida formatos, unifica datos en CLP y genera el archivo JSON.
* **`fondos_scraped.json`**: Base de datos de fondos estructurada en formato JSON utilizada directamente por la SPA.
* **`venv/`**: Entorno virtual de Python aislado.

---

Desarrollado con ❤️ para potenciar la innovación y el emprendimiento en Chile.
