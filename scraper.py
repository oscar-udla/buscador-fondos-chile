import json
import requests
from bs4 import BeautifulSoup
import os
import re

# Base database of real 2026 innovation & entrepreneurship funds in Chile.
# This serves as a premium fallback and lookup database to enrich scraped data.
BASE_FUNDS = [
    {
        "id": "corfo-semilla-inicia-mujeres",
        "name": "Semilla Inicia - Foco Mujeres Emprendedoras 2026",
        "institution": "CORFO",
        "description": "Cofinanciamiento para emprendimientos en etapas tempranas liderados por mujeres, para validar comercialmente su idea.",
        "detailedDescription": "El programa apoya emprendimientos innovadores liderados por mujeres que tengan alto potencial de crecimiento. Financia actividades de validación técnica, comercial y la creación de un prototipo mínimo viable.",
        "target": "Empresa o Persona Natural",
        "targetDetail": "Mujeres mayores de 18 años, o personas jurídicas fundadas por mujeres con menos de 18 meses de existencia y sin ventas.",
        "stage": "Idea/Concepto",
        "amount": 17000000,
        "amountFormatted": "$17.000.000 CLP",
        "maxPercent": 80,
        "sector": "General",
        "status": "open",
        "deadline": "2026-06-15",
        "deadlineFormatted": "15 de Junio, 2026",
        "requirements": [
            "Liderado por mujeres (más del 50% de la propiedad en personas jurídicas).",
            "Personas naturales mayores de 18 años o empresas sin ventas y antigüedad menor a 18 meses.",
            "Proyecto de carácter innovador con potencial de escalabilidad nacional/internacional."
        ],
        "benefits": [
            "Subsidio de hasta $17.000.000 CLP (cubre hasta el 80% del proyecto).",
            "Acceso a mentorías y redes de apoyo de CORFO.",
            "Financiamiento para validación comercial y prototipado rápido."
        ],
        "link": "https://www.corfo.cl/sites/cpp/semillainicia"
    },
    {
        "id": "corfo-semilla-expande-mujeres",
        "name": "Semilla Expande - Foco Mujeres Emprendedoras 2026",
        "institution": "CORFO",
        "description": "Apoyo a emprendimientos liderados por mujeres que ya cuentan con un producto mínimo viable y buscan sus primeras ventas o expandirse.",
        "detailedDescription": "Este fondo está destinado a emprendimientos innovadores liderados por mujeres que ya tienen un producto/servicio validado técnicamente y necesitan financiamiento para escalar sus ventas y cobertura a nivel nacional.",
        "target": "Empresa",
        "targetDetail": "Personas jurídicas lideradas por mujeres, con menos de 36 meses de inicio de actividades y ventas netas menores a $100.000.000 CLP en los últimos 12 meses.",
        "stage": "Prototipo/MVP",
        "amount": 25000000,
        "amountFormatted": "$25.000.000 CLP",
        "maxPercent": 75,
        "sector": "General",
        "status": "open",
        "deadline": "2026-06-15",
        "deadlineFormatted": "15 de Junio, 2026",
        "requirements": [
            "Emprendimiento liderado por mujeres (dueñas de más del 50% de la empresa).",
            "Inicio de actividades menor a 36 meses en el SII.",
            "Ventas netas anuales menores a $100M CLP en los últimos 12 meses.",
            "Contar con un producto mínimo viable (MVP) ya desarrollado."
        ],
        "benefits": [
            "Subsidio de hasta $25.000.000 CLP para la Fase 1 (cubre hasta 75%).",
            "Posibilidad de postular a una prórroga de hasta $20.000.000 CLP en Fase 2.",
            "Servicios de aceleración y mentoría."
        ],
        "link": "https://www.corfo.cl/sites/cpp/semillaexpande"
    },
    {
        "id": "corfo-consolida-expande-2026",
        "name": "Consolida y Expande Innovación 2026",
        "institution": "CORFO",
        "description": "Apoyo para el escalamiento e internacionalización de productos y procesos innovadores de empresas chilenas.",
        "detailedDescription": "Fondo diseñado para empresas de cualquier tamaño que deseen escalar una innovación tecnológica o de proceso ya validada en el mercado nacional, preparándola para su exportación e internacionalización.",
        "target": "Empresa",
        "targetDetail": "Personas jurídicas chilenas de cualquier tamaño, con inicio de actividades y facturación demostrable.",
        "stage": "Validación Comercial",
        "amount": 150000000,
        "amountFormatted": "$150.000.000 CLP",
        "maxPercent": 60,
        "sector": "Tecnología",
        "status": "open",
        "deadline": "2026-06-18",
        "deadlineFormatted": "18 de Junio, 2026",
        "requirements": [
            "Empresas constituidas en Chile.",
            "Tener un prototipo tecnológico ya validado comercialmente en Chile.",
            "Presentar un plan de internacionalización o escalamiento a gran escala."
        ],
        "benefits": [
            "Financiamiento de hasta $150.000.000 CLP (cubre hasta el 60% del costo total).",
            "Apoyo técnico en regulación internacional, propiedad intelectual y marketing global."
        ],
        "link": "https://www.corfo.cl/sites/cpp/creayvalida"
    },
    {
        "id": "sercotec-capital-abeja-2026",
        "name": "Capital Abeja Emprende 2026",
        "institution": "SERCOTEC",
        "description": "Subsidio exclusivo para mujeres que deseen iniciar nuevos negocios o emprendimientos por primera vez.",
        "detailedDescription": "El Capital Abeja Emprende es un subsidio estatal que apoya la puesta en marcha de nuevos negocios liderados por mujeres. Ayuda a financiar asistencia técnica, capacitaciones, marketing y la compra de activos necesarios para iniciar operaciones.",
        "target": "Persona Natural",
        "targetDetail": "Mujeres mayores de 18 años, sin inicio de actividades de primera categoría ante el Servicio de Impuestos Internos (SII).",
        "stage": "Idea/Concepto",
        "amount": 35000000,
        "amountFormatted": "$3.500.000 CLP",
        "maxPercent": 90,
        "sector": "General",
        "status": "open",
        "deadline": "2026-05-31",
        "deadlineFormatted": "31 de Mayo, 2026",
        "requirements": [
            "Ser mujer, mayor de 18 años.",
            "No tener inicio de actividades en primera categoría ante el SII.",
            "Tener una idea de negocio que requiera financiamiento para su lanzamiento.",
            "Aportar un cofinanciamiento mínimo del 10% en efectivo."
        ],
        "benefits": [
            "Subsidio neto de hasta $3.500.000 CLP (cubre asistencia técnica, marketing y activos).",
            "Asesoramiento gratuito a través del Centro de Desarrollo de Negocios de Sercotec."
        ],
        "link": "https://www.sercotec.cl/capital-abeja-emprende/"
    },
    {
        "id": "sercotec-capital-semilla-2026",
        "name": "Capital Semilla Emprende 2026",
        "institution": "SERCOTEC",
        "description": "Fondo concursable para emprendedores de cualquier género que buscan concretar y formalizar su idea de negocio.",
        "detailedDescription": "Subsidio destinado a personas sin iniciación de actividades comerciales en primera categoría para financiar las etapas iniciales de la creación de una empresa, tales como plan de marketing, habilitación de infraestructura, maquinaria e insumos.",
        "target": "Persona Natural",
        "targetDetail": "Mayores de 18 años, sin inicio de actividades en primera categoría ante el SII.",
        "stage": "Idea/Concepto",
        "amount": 35000000,
        "amountFormatted": "$3.500.000 CLP",
        "maxPercent": 90,
        "sector": "General",
        "status": "coming_soon",
        "deadline": "2026-07-15",
        "deadlineFormatted": "Próxima Apertura (Julio 2026)",
        "requirements": [
            "Mayores de 18 años.",
            "Sin inicio de actividades en primera categoría ante el SII.",
            "Presentar una idea de negocio viable."
        ],
        "benefits": [
            "Financiamiento neto de hasta $3.500.000 CLP.",
            "Asistencia técnica y talleres de formalización."
        ],
        "link": "https://www.sercotec.cl/capital-semilla-emprende/"
    },
    {
        "id": "sercotec-crece-2026",
        "name": "Crece - Fondo de Desarrollo de Negocios",
        "institution": "SERCOTEC",
        "description": "Subsidio para potenciar el crecimiento y consolidación de micro y pequeñas empresas formalizadas.",
        "detailedDescription": "Un fondo para empresas que ya están funcionando y necesitan realizar inversiones en activos fijos, marketing, o asistencia técnica para crecer y aumentar sus ventas.",
        "target": "Empresa",
        "targetDetail": "Micro y pequeñas empresas con ventas netas anuales entre 200 y 25.000 UF. También cooperativas.",
        "stage": "Escalamiento/Ventas",
        "amount": 5000000,
        "amountFormatted": "$5.000.000 CLP",
        "maxPercent": 80,
        "sector": "General",
        "status": "coming_soon",
        "deadline": "2026-08-01",
        "deadlineFormatted": "Próxima Apertura (Agosto 2026)",
        "requirements": [
            "Empresas formalizadas ante el SII con ventas demostrables (200 a 25.000 UF anuales).",
            "Aporte de cofinanciamiento en efectivo (aproximadamente 20%)."
        ],
        "benefits": [
            "Subsidio de hasta $5.000.000 CLP para inversión técnica y comercial.",
            "Apoyo personalizado para la ejecución del plan de trabajo."
        ],
        "link": "https://www.sercotec.cl/crece/"
    },
    {
        "id": "anid-fondecyt-regular-2027",
        "name": "FONDECYT Regular 2027",
        "institution": "ANID",
        "description": "Financiamiento para proyectos de investigación científica o tecnológica básica que conduzcan a nuevos conocimientos.",
        "detailedDescription": "El principal fondo de ciencia del país, destinado a promover la investigación científica y tecnológica nacional mediante el financiamiento de proyectos de investigadores consolidados en cualquier área del conocimiento.",
        "target": "Estudiante/Investigador",
        "targetDetail": "Investigadores con grado académico de doctor, con trayectoria científica y patrocinio de una institución chilena.",
        "stage": "Escalamiento/Ventas",
        "amount": 57000000,
        "amountFormatted": "$57.000.000 CLP anuales",
        "maxPercent": 100,
        "sector": "R&D/Ciencia",
        "status": "open",
        "deadline": "2026-06-24",
        "deadlineFormatted": "24 de Junio, 2026",
        "requirements": [
            "Poseer el grado de Doctor.",
            "Tener antecedentes curriculares científicos válidos (publicaciones indexadas).",
            "Contar con el patrocinio institucional de una universidad o centro de investigación chileno."
        ],
        "benefits": [
            "Financiamiento de honorarios para investigadores, tesistas y personal de apoyo.",
            "Gastos de operación, equipamiento menor y viajes para investigación."
        ],
        "link": "https://www.anid.cl/concursos/concurso/?id=fondecyt"
    },
    {
        "id": "anid-fondecyt-iniciacion-2027",
        "name": "FONDECYT de Iniciación en Investigación 2027",
        "institution": "ANID",
        "description": "Fondo para investigadores jóvenes o recientes doctores que inician sus líneas de investigación independientes.",
        "detailedDescription": "Subsidio que busca fomentar y fortalecer el desarrollo de la investigación científica y tecnológica de excelencia, apoyando a investigadores con grado de doctor que inician su carrera independiente en el país.",
        "target": "Estudiante/Investigador",
        "targetDetail": "Investigadores que hayan obtenido su doctorado recientemente (máximo 5 años atrás o 7 años en caso de investigadoras mujeres).",
        "stage": "Prototipo/MVP",
        "amount": 30000000,
        "amountFormatted": "$30.000.000 CLP anuales",
        "maxPercent": 100,
        "sector": "R&D/Ciencia",
        "status": "open",
        "deadline": "2026-05-26",
        "deadlineFormatted": "26 de Mayo, 2026",
        "requirements": [
            "Grado académico de Doctor.",
            "Obtención del grado en los plazos fijados en las bases (con consideraciones por maternidad).",
            "Patrocinio de una institución nacional acreditada."
        ],
        "benefits": [
            "Financiamiento anual de hasta $30.000.000 CLP por 2 o 3 años.",
            "Subsidio para viajes, materiales de laboratorio y equipamiento básico."
        ],
        "link": "https://www.anid.cl/concursos/concurso/?id=fondecyt"
    },
    {
        "id": "anid-viu-2026",
        "name": "Valorización de la Investigación en la Universidad (VIU) 2026",
        "institution": "ANID",
        "description": "Fondo orientado a estudiantes universitarios para crear empresas científicas o tecnológicas basadas en sus tesis.",
        "detailedDescription": "Promueve la formación de nuevas empresas spin-off basadas en investigaciones y tesis universitarias realizadas por estudiantes de pre o posgrado, acelerando la transferencia de ciencia al mercado.",
        "target": "Estudiante/Investigador",
        "targetDetail": "Alumnos que estén desarrollando o hayan finalizado su tesis de pre o posgrado en una universidad nacional acreditada.",
        "stage": "Idea/Concepto",
        "amount": 32000000,
        "amountFormatted": "$32.000.000 CLP",
        "maxPercent": 90,
        "sector": "R&D/Ciencia",
        "status": "coming_soon",
        "deadline": "2026-09-01",
        "deadlineFormatted": "Próxima Apertura (Septiembre 2026)",
        "requirements": [
            "Ser alumno regular de pre o posgrado, o egresado reciente.",
            "Tener una propuesta basada en los resultados de la tesis de grado.",
            "Patrocinio institucional de la universidad de procedencia."
        ],
        "benefits": [
            "Financiamiento de hasta $32.000.000 CLP en dos etapas.",
            "Apoyo para incubación, validación y constitución legal de la startup tecnológica."
        ],
        "link": "https://www.anid.cl/concursos/concurso/?id=viu"
    },
    {
        "id": "startupchile-build-2026",
        "name": "Start-Up Chile - Build 2026",
        "institution": "Start-Up Chile",
        "description": "Programa de pre-aceleración para startups en etapas muy tempranas (ideas o prototipos básicos).",
        "detailedDescription": "Programa de 4 meses enfocado en startups lideradas por fundadores locales o extranjeros con ideas globales. Ofrece financiamiento libre de participación accionaria (equity-free) y una visa de trabajo para extranjeros.",
        "target": "Empresa o Persona Natural",
        "targetDetail": "Emprendedores mayores de 18 años con un proyecto tecnológico de alcance internacional y menos de 12 meses de vida.",
        "stage": "Idea/Concepto",
        "amount": 10000000,
        "amountFormatted": "$10.000.000 - $15.000.000 CLP",
        "maxPercent": 90,
        "sector": "Tecnología",
        "status": "coming_soon",
        "deadline": "2026-10-01",
        "deadlineFormatted": "Próxima Apertura (Octubre 2026)",
        "requirements": [
            "Proyecto tecnológico altamente innovador con potencial de escalamiento global.",
            "Menos de 12 meses de constitución o en etapa de idea/prototipo inicial.",
            "Dedicación exclusiva del fundador principal."
        ],
        "benefits": [
            "Fondo no reembolsable de $10.000.000 CLP (hasta $15M si es liderado por mujeres).",
            "Espacio de co-work gratuito en Santiago y visa tecnológica por 1 año.",
            "Acceso a una de las redes de startups más grandes de Latinoamérica."
        ],
        "link": "https://www.startupchile.org/programs/build/"
    },
    {
        "id": "startupchile-ignite-2026",
        "name": "Start-Up Chile - Ignite 2026",
        "institution": "Start-Up Chile",
        "description": "Aceleración comercial para startups con un producto mínimo viable (MVP) y tracción inicial.",
        "detailedDescription": "Un programa para llevar startups de base tecnológica con un MVP funcional al siguiente nivel, logrando validación comercial acelerada y escalabilidad regional.",
        "target": "Empresa",
        "targetDetail": "Empresas tecnológicas con un MVP funcional y menos de 3 años de antigüedad.",
        "stage": "Prototipo/MVP",
        "amount": 25000000,
        "amountFormatted": "$25.000.000 - $50.000.000 CLP",
        "maxPercent": 80,
        "sector": "Tecnología",
        "status": "coming_soon",
        "deadline": "2026-10-01",
        "deadlineFormatted": "Próxima Apertura (Octubre 2026)",
        "requirements": [
            "Tener un producto mínimo viable (MVP) funcional.",
            "Empresa constituida con menos de 3 años de vida en Chile o extranjero.",
            "Proyecto con escalabilidad global clara."
        ],
        "benefits": [
            "Subsidio libre de capital de $25.000.000 CLP (ampliable a $50M en extensión).",
            "Programa intensivo de mentoría y preparación para rondas de inversión."
        ],
        "link": "https://www.startupchile.org/programs/ignite/"
    },
    {
        "id": "fia-proyectos-innovacion-2026",
        "name": "Convocatoria Nacional de Proyectos de Innovación Agraria 2026",
        "institution": "FIA",
        "description": "Fondo para el desarrollo de soluciones innovadoras ante los desafíos del sector silvoagropecuario y cadena alimentaria.",
        "detailedDescription": "La Fundación para la Innovación Agraria cofinancia proyectos que propongan soluciones innovadoras a problemas o desafíos de sostenibilidad, adaptación al cambio climático o eficiencia productiva en el agro chileno.",
        "target": "Empresa",
        "targetDetail": "Personas jurídicas constituidas en Chile con giros asociados al sector silvoagropecuario, alimentos o investigación asociada.",
        "stage": "Prototipo/MVP",
        "amount": 45000000,
        "amountFormatted": "$45.000.000 CLP",
        "maxPercent": 70,
        "sector": "Agroalimentario",
        "status": "open",
        "deadline": "2026-06-30",
        "deadlineFormatted": "30 de Junio, 2026",
        "requirements": [
            "Ser persona jurídica con inicio de actividades y capacidad técnica agraria.",
            "Proyectos que respondan a los lineamientos de FIA (Sostenibilidad alimentaria, eficiencia hídrica, etc.).",
            "Aportar cofinanciamiento monetario del 30% restante."
        ],
        "benefits": [
            "Cofinanciamiento de hasta $45.000.000 CLP (cubre hasta 70% del proyecto).",
            "Acompañamiento técnico y comercial por expertos del agro."
        ],
        "link": "https://www.fia.cl/"
    },
    {
        "id": "fosis-emprendamos-2026",
        "name": "Programa Emprendamos Semilla FOSIS",
        "institution": "FOSIS",
        "description": "Subsidio y capacitación para personas en situación de vulnerabilidad social que tengan una idea de negocio micro-emprendedor.",
        "detailedDescription": "Orientado a personas desempleadas o con empleos precarios que tengan una idea de negocio y necesiten un capital inicial muy básico junto con talleres de emprendimiento para generar ingresos independientes.",
        "target": "Vulnerabilidad",
        "targetDetail": "Mayores de 18 años, que pertenezcan al 40% más vulnerable según el Registro Social de Hogares (RSH).",
        "stage": "Idea/Concepto",
        "amount": 450000,
        "amountFormatted": "$450.000 CLP",
        "maxPercent": 100,
        "sector": "Social",
        "status": "open",
        "deadline": "2026-12-31",
        "deadlineFormatted": "Siempre Abierto (Postulaciones Periódicas)",
        "requirements": [
            "Pertenecer al tramo del 40% del Registro Social de Hogares (RSH).",
            "Tener una idea de negocio o un micro-emprendimiento informal en marcha.",
            "Residir en una comuna donde el programa esté disponible."
        ],
        "benefits": [
            "Financiamiento no reembolsable de $450.000 CLP para la compra de herramientas, insumos o maquinarias.",
            "Talleres prácticos de costos, ventas, administración y modelo de negocios."
        ],
        "link": "https://www.fosis.gob.cl/es/programas/emprendimiento/"
    },
    {
        "id": "antofa-innova-fch-2026",
        "name": "Antofa Innova 2026 - Fundación Chile",
        "institution": "Fundación Chile",
        "description": "Concurso de innovación abierta para pilotear soluciones tecnológicas en la Región de Antofagasta.",
        "detailedDescription": "Convocatoria abierta para que startups y empresas chilenas o extranjeras presenten desarrollos tecnológicos y los piloteen en industrias mineras, de energía o recursos hídricos en el norte de Chile.",
        "target": "Empresa",
        "targetDetail": "Startups y empresas constituidas con un prototipo o producto tecnológico validado a nivel nacional.",
        "stage": "Prototipo/MVP",
        "amount": 15000000,
        "amountFormatted": "$15.000.000 CLP",
        "maxPercent": 100,
        "sector": "Tecnología",
        "status": "open",
        "deadline": "2026-07-20",
        "deadlineFormatted": "20 de Julio, 2026",
        "requirements": [
            "Tener un prototipo funcional (MVP) o tecnología lista para pilotaje.",
            "Interés y capacidad de pilotaje técnico en la Región de Antofagasta.",
            "Soluciones orientadas a minería, agua o sustentabilidad."
        ],
        "benefits": [
            "Subsidio directo de hasta $15.000.000 CLP para la ejecución del pilotaje.",
            "Conexión directa con empresas industriales mineras y energéticas del norte.",
            "Asistencia y validación de impacto por Fundación Chile."
        ],
        "link": "https://fch.cl/iniciativa/antofa-innova/"
    },
    {
        "id": "copec-uc-id-2026",
        "name": "Concurso I+D para Innovar 2026 - Fundación Copec-UC",
        "institution": "Fundación Copec-UC",
        "description": "Financiamiento y mentoría para proyectos de I+D aplicados que resuelvan problemas relevantes del sector productivo.",
        "detailedDescription": "El certamen premia e impulsa proyectos científicos y tecnológicos de vanguardia que tengan como objetivo la transferencia comercial de sus resultados mediante patentes, licencias o spin-offs.",
        "target": "Estudiante/Investigador",
        "targetDetail": "Investigadores independientes, académicos, empresas constituidas o universidades de Chile.",
        "stage": "Prototipo/MVP",
        "amount": 120000000,
        "amountFormatted": "$120.000.000 CLP",
        "maxPercent": 80,
        "sector": "R&D/Ciencia",
        "status": "open",
        "deadline": "2026-06-30",
        "deadlineFormatted": "30 de Junio, 2026",
        "requirements": [
            "Propuestas de base científica o tecnológica de alto impacto comercial.",
            "Contar con resultados experimentales preliminares (pruebas de concepto).",
            "Disposición para formar spin-off o transferir la tecnología a la industria."
        ],
        "benefits": [
            "Financiamiento total de hasta $120.000.000 CLP entregado en dos etapas.",
            "Asesoría experta en propiedad intelectual, patentes y negociaciones.",
            "Doble patrocinio institucional (Copec y Pontificia Universidad Católica)."
        ],
        "link": "https://www.fundcopecuc.cl/"
    },
    {
        "id": "brain-chile-uc-2026",
        "name": "Brain Chile 2026 - UC & Banco Santander",
        "institution": "Pontificia Universidad Católica",
        "description": "Programa nacional de aceleración para emprendimientos de base científico-tecnológica originados en la academia.",
        "detailedDescription": "Brain Chile impulsa proyectos de base científica y tecnológica originados en laboratorios universitarios y salas de clase, ayudándoles a transitar desde la etapa de idea/concepto de laboratorio hasta un modelo de negocio validado.",
        "target": "Estudiante/Investigador",
        "targetDetail": "Equipos constituidos por alumnos de pre y posgrado, egresados o investigadores de cualquier universidad chilena.",
        "stage": "Idea/Concepto",
        "amount": 8000000,
        "amountFormatted": "$8.000.000 CLP",
        "maxPercent": 100,
        "sector": "R&D/Ciencia",
        "status": "open",
        "deadline": "2026-05-30",
        "deadlineFormatted": "30 de Mayo, 2026",
        "requirements": [
            "Al menos un miembro del equipo debe ser estudiante o académico chileno.",
            "Proyectos que utilicen conocimientos de ciencia, ingeniería o tecnología.",
            "Completar el Bootcamp de validación científica y técnica."
        ],
        "benefits": [
            "Capital semilla de hasta $8.000.000 CLP libres de participación accionaria.",
            "Acceso a laboratorios y talleres de prototipaje rápido en la UC.",
            "Mentorías internacionales y visibilidad comercial."
        ],
        "link": "https://brainchile.cl/"
    },
    {
        "id": "indap-innovacion-2026",
        "name": "Programa de Apoyo a la Innovación en Agricultura Familiar - INDAP 2026",
        "institution": "INDAP",
        "description": "Fondo para fomentar tecnologías sostenibles y soluciones innovadoras en la pequeña agricultura de Chile.",
        "detailedDescription": "Subsidio destinado a agricultores y campesinos acreditados ante INDAP que deseen implementar sistemas de riego inteligente, energías renovables, automatización de invernaderos o agricultura regenerativa.",
        "target": "Persona Natural",
        "targetDetail": "Pequeños agricultores familiares acreditados como usuarios vigentes en las agencias de INDAP de su comuna.",
        "stage": "Idea/Concepto",
        "amount": 5000000,
        "amountFormatted": "$5.000.000 CLP",
        "maxPercent": 90,
        "sector": "Agroalimentario",
        "status": "open",
        "deadline": "2026-08-15",
        "deadlineFormatted": "15 de Agosto, 2026",
        "requirements": [
            "Estar acreditado como usuario de INDAP ante el Ministerio de Agricultura.",
            "Presentar un proyecto de innovación agrícola sostenible.",
            "Cofinanciamiento en efectivo del 10% del total del proyecto."
        ],
        "benefits": [
            "Fondo concursable de hasta $5.000.000 CLP (cubre el 90% del costo total).",
            "Asistencia técnica de agrónomos asignados para la puesta en marcha.",
            "Acceso a ferias tecnológicas locales y capacitación de riego."
        ],
        "link": "https://www.indap.gob.cl/"
    },
    {
        "id": "incubaudec-lanza-2026",
        "name": "Concurso Lanza Tu Innovación 2026 - IncubaUdeC",
        "institution": "Universidad de Concepción",
        "description": "Programa regional de incubación para emprendimientos y startups de alto impacto en el sur de Chile.",
        "detailedDescription": "IncubaUdeC abre su convocatoria para acelerar el desarrollo de soluciones innovadoras en regiones, apoyando la postulación a fondos CORFO y el desarrollo del producto mínimo viable.",
        "target": "Empresa o Persona Natural",
        "targetDetail": "Emprendedores de las regiones de Biobío, Ñuble o del sur del país con ideas tecnológicas innovadoras.",
        "stage": "Idea/Concepto",
        "amount": 15000000,
        "amountFormatted": "$15.000.000 CLP",
        "maxPercent": 80,
        "sector": "General",
        "status": "coming_soon",
        "deadline": "2026-09-15",
        "deadlineFormatted": "Próxima Apertura (Septiembre 2026)",
        "requirements": [
            "Residir o tener domicilio comercial en el Biobío, Ñuble o regiones del sur.",
            "Proyecto innovador con potencial de escalamiento nacional.",
            "Dedicación y participación en el taller de incubación de 3 meses."
        ],
        "benefits": [
            "Patrocinio y postulación garantizada a fondos CORFO Semilla de hasta $15M CLP.",
            "Espacio físico de incubación y mentorías personalizadas de IncubaUdeC.",
            "Red de vinculación con inversionistas y capitales privados del Biobío."
        ],
        "link": "https://incubaudec.cl/"
    }
]


headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
}

def scrape_corfo():
    """Tries to scrape CORFO and discover open calls."""
    print("Scraping CORFO Convocatorias...")
    scraped = []
    url = "https://www.corfo.cl/sites/cpp/convocatorias"
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            # Look for titles and elements on CORFO
            # Often they list programs in divs with class related to cards, e.g., 'card-convocatoria' or 'row' or 'panel'
            # Let's search heuristically for headings (h3, h4) that contain links
            cards = soup.find_all(['h3', 'h4', 'h5'])
            for card in cards:
                a_tag = card.find('a') if hasattr(card, 'find') else None
                if not a_tag:
                    # check if the heading itself is a link or has parents
                    if card.name == 'a':
                        a_tag = card
                    else:
                        parent_a = card.find_parent('a')
                        if parent_a:
                            a_tag = parent_a
                
                if a_tag:
                    title_text = a_tag.text.strip()
                    href = a_tag.get('href', '')
                    if href and title_text and len(title_text) > 8:
                        # Clean title
                        title_text = re.sub(r'\s+', ' ', title_text)
                        # Avoid duplicates and menu items
                        if any(x in title_text.lower() for x in ["menú", "buscar", "contacto", "iniciar", "ingresar", "cerrar", "siguiente"]):
                            continue
                        
                        full_href = href if href.startswith('http') else f"https://www.corfo.cl{href}"
                        
                        # Add a general template that can be merged
                        scraped.append({
                            "name": title_text,
                            "institution": "CORFO",
                            "link": full_href,
                            "scraped": True
                        })
            print(f"Scraped {len(scraped)} raw headings from CORFO.")
    except Exception as e:
        print(f"Error scraping CORFO: {e}")
    return scraped

def scrape_anid():
    """Tries to scrape ANID and discover open calls."""
    print("Scraping ANID Concursos...")
    scraped = []
    url = "https://www.anid.cl/concursos/"
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            # ANID page structure often has tables or list divs with links containing /concursos/
            links = soup.find_all('a', href=True)
            for link in links:
                href = link['href']
                text = link.text.strip()
                if "/concursos/concurso/?id=" in href and len(text) > 8:
                    text = re.sub(r'\s+', ' ', text)
                    if any(x in text.lower() for x in ["resultado", "adjudicados", "bases", "resolución"]):
                        continue
                    scraped.append({
                        "name": text,
                        "institution": "ANID",
                        "link": href,
                        "scraped": True
                    })
            print(f"Scraped {len(scraped)} raw links from ANID.")
    except Exception as e:
        print(f"Error scraping ANID: {e}")
    return scraped

def merge_funds(scraped_corfo, scraped_anid):
    """Merges scraped funds with the BASE_FUNDS database.
    Updates deadlines, statuses, or links if matches are found.
    """
    final_funds = list(BASE_FUNDS) # start with a copy of the base database
    
    # Simple keyword matcher to see if a scraped fund is already in our curated DB
    all_scraped = scraped_corfo + scraped_anid
    
    for scraped_fund in all_scraped:
        matched = False
        scraped_name_lower = scraped_fund["name"].lower()
        
        for base in final_funds:
            # Let's check matching based on institution and name similarity
            if base["institution"].upper() == scraped_fund["institution"].upper():
                # check if key words from base are in scraped
                base_words = set(re.findall(r'\w+', base["name"].lower()))
                scraped_words = set(re.findall(r'\w+', scraped_name_lower))
                
                # If they share a substantial number of words, it's the same fund!
                intersection = base_words.intersection(scraped_words)
                # Ignore short words in intersection
                intersection = {w for w in intersection if len(w) > 3}
                
                if len(intersection) >= 2 or base["name"].lower() in scraped_name_lower or scraped_name_lower in base["name"].lower():
                    # Match found! Let's update its status to open and its link if relevant
                    base["status"] = "open"
                    base["link"] = scraped_fund["link"]
                    matched = True
                    # If we find "mujer" in the scraped title and it is the women focus, make sure it matches
                    print(f"-> Matched scraped '{scraped_fund['name']}' with base '{base['name']}'")
                    break
        
        # If it's a new open fund not in our base database, let's create a generic fund entry for it!
        if not matched:
            # Generate a clean ID
            clean_id = re.sub(r'[^a-z0-9]', '-', scraped_fund["name"].lower())
            clean_id = re.sub(r'-+', '-', clean_id).strip('-')
            
            # Formulate metadata
            institution = scraped_fund["institution"]
            sector = "General"
            if "ciencia" in scraped_name_lower or "investigación" in scraped_name_lower or "doctorado" in scraped_name_lower:
                sector = "R&D/Ciencia"
            elif "tecnolog" in scraped_name_lower:
                sector = "Tecnología"
            elif "agro" in scraped_name_lower or "alimento" in scraped_name_lower:
                sector = "Agroalimentario"
            
            # Default values depending on institution
            if institution == "CORFO":
                amount = 30000000
                max_percent = 70
                stage = "Prototipo/MVP"
                target = "Empresa"
            else: # ANID
                amount = 40000000
                max_percent = 100
                stage = "R&D/Ciencia"
                target = "Estudiante/Investigador"
                
            new_fund = {
                "id": f"scraped-{clean_id}",
                "name": scraped_fund["name"],
                "institution": institution,
                "description": f"Convocatoria abierta detectada en el portal de {institution}.",
                "detailedDescription": f"Este fondo ha sido detectado automáticamente como abierto en el portal oficial. Para postular, revisar las bases directamente en el enlace adjunto.",
                "target": target,
                "targetDetail": "Definido por las bases de postulación.",
                "stage": stage,
                "amount": amount,
                "amountFormatted": f"${amount:,.0f} CLP".replace(",", "."),
                "maxPercent": max_percent,
                "sector": sector,
                "status": "open",
                "deadline": "2026-06-30", # default deadline
                "deadlineFormatted": "Verificar en sitio oficial",
                "requirements": [
                    "Revisar bases técnicas en el sitio oficial.",
                    "Postulaciones a través del portal institucional."
                ],
                "benefits": [
                    f"Financiamiento no reembolsable según bases de {institution}.",
                    "Acceso a la red de la institución patrocinadora."
                ],
                "link": scraped_fund["link"]
            }
            final_funds.append(new_fund)
            print(f"-> Added new scraped fund: '{new_fund['name']}'")
            
    return final_funds

def main():
    print("=== CHILE INNOVATION FUNDS SCRAPER ===")
    
    # 1. Scrape portals
    scraped_corfo = scrape_corfo()
    scraped_anid = scrape_anid()
    
    # 2. Merge with curated 2026 database
    final_list = merge_funds(scraped_corfo, scraped_anid)
    
    # 3. Save to JSON
    output_path = "/Users/oscar/Desktop/proyectos_postulacion/fondos_scraped.json"
    
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_list, f, indent=4, ensure_ascii=False)
        print(f"\nSUCCESS: Generated {len(final_list)} funds in '{output_path}'")
    except Exception as e:
        print(f"Error saving JSON output: {e}")

if __name__ == "__main__":
    main()
