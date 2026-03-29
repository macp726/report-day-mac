#!/usr/bin/env python3
"""
Daily Status Report Generator with AI
Generates interactive HTML reports for daily status updates
"""

import os
import sys
from datetime import datetime
from pathlib import Path
import json
import click
from jinja2 import Environment, FileSystemLoader
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DailyReportGenerator:
    def __init__(self, config_path=None):
        self.config_path = config_path or Path(__file__).parent / "config.json"
        self.templates_dir = Path(__file__).parent / "templates"
        self.output_dir = Path(__file__).parent / "reports"
        self.config = self.load_config()
        
        # Ensure directories exist
        self.templates_dir.mkdir(exist_ok=True)
        self.output_dir.mkdir(exist_ok=True)
        
        # Setup Jinja2 environment
        self.jinja_env = Environment(loader=FileSystemLoader(self.templates_dir))
    
    def load_config(self):
        """Load configuration from JSON file"""
        default_config = {
            "user_name": "Usuario",
            "company": "Mi Empresa",
            "ai_enabled": True,
            "template": "default",
            "output_format": "html"
        }
        
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    return {**default_config, **config}
            except Exception as e:
                print(f"Error loading config: {e}")
                
        return default_config
    
    def generate_ai_content(self, prompt_type="daily_status"):
        """Generate AI content for the report"""
        if not self.config.get("ai_enabled", False):
            return self.get_default_content(prompt_type)
        
        # For now, return sample AI-generated content
        # In a real implementation, this would call an AI API
        ai_content = {
            "daily_status": {
                "achievements": [
                    "✅ Completada la revisión de código del proyecto principal",
                    "✅ Implementadas mejoras de rendimiento en el módulo de reportes",
                    "✅ Participación en reunión de planificación semanal"
                ],
                "challenges": [
                    "⚠️ Pendiente resolución de conflicto en base de datos",
                    "⚠️ Necesidad de optimizar consultas SQL complejas"
                ],
                "next_steps": [
                    "🎯 Implementar nuevas funcionalidades de dashboard",
                    "🎯 Revisar y actualizar documentación técnica",
                    "🎯 Preparar presentación para cliente"
                ],
                "mood": "productivo",
                "productivity_score": 85
            }
        }
        
        return ai_content.get(prompt_type, {})
    
    def get_default_content(self, prompt_type):
        """Get default content when AI is disabled"""
        return {
            "achievements": ["Tareas completadas del día"],
            "challenges": ["Desafíos identificados"],
            "next_steps": ["Próximos pasos planificados"],
            "mood": "neutral",
            "productivity_score": 70
        }
    
    def generate_report(self, date=None):
        """Generate the daily report"""
        if date is None:
            date = datetime.now()
        
        # Generate AI content
        content = self.generate_ai_content()
        
        # Prepare template data
        template_data = {
            "date": date.strftime("%Y-%m-%d"),
            "formatted_date": date.strftime("%d de %B, %Y"),
            "user_name": self.config["user_name"],
            "company": self.config["company"],
            "content": content,
            "generated_at": datetime.now().strftime("%H:%M:%S")
        }
        
        # Load template
        template_name = f"{self.config['template']}.html"
        try:
            template = self.jinja_env.get_template(template_name)
        except:
            # Fallback to default template
            template = self.jinja_env.get_template("default.html")
        
        # Render report
        report_html = template.render(**template_data)
        
        # Save report
        output_filename = f"reporte_{date.strftime('%Y%m%d')}.html"
        output_path = self.output_dir / output_filename
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_html)
        
        return output_path

@click.command()
@click.option('--config', '-c', help='Path to config file')
@click.option('--date', '-d', help='Date for report (YYYY-MM-DD)')
@click.option('--output', '-o', help='Output directory')
def main(config, date, output):
    """Generate daily status report with AI"""
    
    generator = DailyReportGenerator(config)
    
    # Parse date if provided
    report_date = None
    if date:
        try:
            report_date = datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            click.echo(f"Invalid date format: {date}. Use YYYY-MM-DD")
            sys.exit(1)
    
    # Override output directory if provided
    if output:
        generator.output_dir = Path(output)
        generator.output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        output_path = generator.generate_report(report_date)
        click.echo(f"✅ Reporte generado exitosamente: {output_path}")
        click.echo(f"📂 Abrir en navegador: file://{output_path.absolute()}")
    except Exception as e:
        click.echo(f"❌ Error generando reporte: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()