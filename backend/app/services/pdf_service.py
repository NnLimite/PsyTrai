import asyncio
import tempfile
from jinja2 import Template

class PDFService:
    @staticmethod
    async def build_session_pdf(session_obj, therapist_name: str, patient_name: str) -> str:
        def _render():
            html_template = """
            <html>
            <head><meta charset="utf-8"><style>body { font-family: sans-serif; }</style></head>
            <body>
                <h1>Отчет о симуляционной сессии PsyTrainer</h1>
                <p><b>Консультант:</b> {{ therapist }}</p>
                <p><b>Пациент:</b> {{ patient }}</p>
                <p><b>Режим:</b> {{ mode }}</p>
                <hr/>
                <h2>Результаты автоматической оценки (ИИ):</h2>
                <p><b>Общий балл:</b> {{ report.score }} / 100</p>
                <p><b>Разбор:</b> {{ report.feedback }}</p>
                <hr/>
                <h2>Транскрипт диалога:</h2>
                {% for msg in history %}
                    <p><b>{{ "Студент" if msg.role == "user" else "Пациент" }}:</b> {{ msg.content }}</p>
                {% endfor %}
            </body>
            </html>
            """
            rendered_html = Template(html_template).render(
                therapist=therapist_name,
                patient=patient_name,
                mode=session_obj.mode,
                report=session_obj.analytics_report or {"score": "Нет оценки", "feedback": "-"},
                history=session_obj.chat_history
            )
            
            # Для MVP пишем чистый HTML, который легко подхватывается WeasyPrint / pdfkit
            with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as tmp:
                tmp.write(rendered_html)
                return tmp.name
                
        return await asyncio.to_thread(_render)

pdf_service = PDFService()