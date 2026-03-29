# 📊 Report Day Mac

**Status diario generado con AI interactivo** - Un generador de reportes diarios inteligente con interfaz HTML interactiva.

## ✨ Características

- 🤖 **Generación con AI**: Contenido generado automáticamente con inteligencia artificial
- 🎨 **HTML Interactivo**: Reportes con interfaz moderna y responsive
- 📱 **Compatible con Mac**: Optimizado para el ecosistema macOS
- 🔧 **Personalizable**: Configuración flexible mediante JSON
- 📈 **Métricas Visuales**: Indicadores de productividad y estado de ánimo
- 🎯 **Secciones Organizadas**: Logros, desafíos y próximos pasos
- 📂 **Múltiples Formatos**: Exportación en HTML interactivo

## 🚀 Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/macp726/report-day-mac.git
   cd report-day-mac
   ```

2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar** (opcional):
   ```bash
   # Editar config.json para personalizar
   nano config.json
   ```

## 🎯 Uso

### Generación Básica

```bash
# Generar reporte para el día actual
python3 daily_report.py

# Generar reporte para una fecha específica
python3 daily_report.py --date 2023-12-25

# Especificar directorio de salida
python3 daily_report.py --output /ruta/personalizada
```

### Opciones de Línea de Comandos

```bash
python3 daily_report.py --help
```

- `-c, --config`: Ruta al archivo de configuración personalizado
- `-d, --date`: Fecha para el reporte (formato YYYY-MM-DD)
- `-o, --output`: Directorio de salida personalizado

### Configuración

El archivo `config.json` permite personalizar:

```json
{
  "user_name": "Tu Nombre",
  "company": "Tu Empresa",
  "ai_enabled": true,
  "template": "default",
  "output_format": "html",
  "language": "es",
  "theme": "modern"
}
```

## 📋 Estructura del Reporte

Cada reporte incluye las siguientes secciones:

### 🎉 Logros del Día
- Tareas completadas
- Objetivos alcanzados
- Mejoras implementadas

### ⚡ Desafíos y Obstáculos
- Problemas identificados
- Bloqueadores técnicos
- Áreas de mejora

### 🚀 Próximos Pasos
- Tareas planificadas
- Objetivos para mañana
- Acciones de seguimiento

### 💭 Resumen del Día
- Estado de ánimo
- Métricas de productividad
- Evaluación general

## 🎨 Características Interactivas

- **Secciones Colapsables**: Expande/contrae secciones individualmente
- **Botones de Control**: Colapsar/expandir todo de una vez
- **Hover Effects**: Interacciones visuales con los elementos
- **Responsive Design**: Adaptable a diferentes tamaños de pantalla
- **Animaciones**: Transiciones suaves y elegantes

## 📁 Estructura del Proyecto

```
report-day-mac/
├── daily_report.py      # Script principal
├── config.json          # Configuración del usuario
├── requirements.txt     # Dependencias Python
├── templates/
│   └── default.html     # Plantilla HTML principal
├── reports/             # Reportes generados
│   └── reporte_YYYYMMDD.html
└── README.md           # Esta documentación
```

## 🤖 Integración con AI

Actualmente incluye contenido de ejemplo. Para integrar con servicios de AI reales:

1. **OpenAI**: Configura tu API key en `.env`
2. **Local AI**: Integra con modelos locales
3. **Custom API**: Modifica la función `generate_ai_content()`

## 🖥️ Compatibilidad

- **Python**: 3.7+
- **Navegadores**: Chrome, Firefox, Safari, Edge
- **Sistemas**: macOS, Linux, Windows

## 📝 Ejemplos

```bash
# Generar reporte con configuración personalizada
python3 daily_report.py -c mi_config.json

# Reporte para ayer
python3 daily_report.py --date 2023-12-24

# Múltiples reportes
for date in 2023-12-{20..25}; do
    python3 daily_report.py --date $date
done
```

## 🔧 Desarrollo

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Realiza tus cambios
4. Envía un pull request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Abre un issue para discutir cambios importantes
2. Mantén el código consistente con el estilo existente
3. Añade tests para nuevas funcionalidades
4. Actualiza la documentación según sea necesario

---

**¡Feliz generación de reportes!** 🎉
