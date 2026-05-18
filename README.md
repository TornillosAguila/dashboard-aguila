# 📊 Dashboard Ejecutivo — Grupo Águila

Dashboard ejecutivo interactivo para juntas de consejo de Grupo Águila. Lee directamente el archivo Excel `DASH.xlsx` y genera todas las gráficas automáticamente.

---

## 🚀 Cómo usar

### Opción 1 — GitHub Pages (recomendado)
1. Sube este repositorio a GitHub
2. Ve a **Settings → Pages → Branch: main → / (root)**
3. Accede a `https://tu-usuario.github.io/dashboard-aguila/`

### Opción 2 — Local (sin servidor)
Abre directamente `index.html` en Chrome o Edge.  
> ⚠️ Firefox bloquea la lectura de archivos locales. Usa Chrome/Edge o un servidor local.

### Opción 3 — Servidor local rápido
```bash
# Python 3
python -m http.server 8080
# Luego abre: http://localhost:8080
```

---

## 🔄 Actualizar datos

Solo reemplaza el archivo Excel:

```
data/DASH.xlsx  ← reemplaza este archivo con la versión nueva
```

El dashboard lo lee automáticamente al cargar la página.  
**No toques ningún otro archivo.**

---

## 📁 Estructura del proyecto

```
dashboard-aguila/
│
├── index.html          ← Dashboard principal
├── README.md           ← Este archivo
│
├── data/
│   └── DASH.xlsx       ← ⭐ Solo reemplaza este archivo para actualizar
│
└── assets/
    ├── parser.js       ← Lee y transforma el Excel
    ├── charts.js       ← Construye todas las gráficas
    ├── ui.js           ← Navegación, KPIs, tabla
    └── style.css       ← Estilos del dashboard
```

---

## 📋 Estructura esperada del Excel (hoja "ventas")

| Fila | Contenido |
|------|-----------|
| 1    | Título (VENTAS) |
| 2    | Ignorada |
| 3    | Encabezados de mes (ENERO, FEBRERO…) |
| 4    | Fechas de corte |
| 5+   | Datos por canal: col A = nombre, col B = meta, col C+ = valores por corte |

**Canales reconocidos automáticamente** (por el `*` al inicio):
- `*PUNTO DE VENTA`
- `*CALL CENTER`
- `*PLATAFORMA`
- `*ASESORES`
- `*VENTAS TOTALES`

---

## 🛠️ Tecnologías
- HTML5 + CSS3 + JavaScript vanilla
- [Chart.js 4](https://www.chartjs.org/) — gráficas
- [SheetJS (xlsx)](https://sheetjs.com/) — lectura del Excel
- Sin backend, sin dependencias de instalación
