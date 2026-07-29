# Life Tracker — объединённое приложение

Объединяет Календарь трезвости и Финансовый менеджер.

## Структура

- `index.html` — стартовый экран (выбор календаря)
- `sobriety.html` — календарь трезвости (скопирован из отдельного проекта)
- `finance.html` — финансовый менеджер:
  - **Вкладка «Главная»**: баланс (редактируется кликом), приходы (модалка), список операций
  - **Вкладка «Кредиты»**: список кредитов, календарь платежей, статистика по месяцу
- `server.py` — Flask: два набора API + отдача статики
- `data-sobriety.json` — данные трезвости (в .gitignore)
- `data-finance.json` — данные финансов (в .gitignore)

## API

- `GET/POST /api/sobriety/records` — данные трезвости
- `GET/POST /api/finance/data` — данные финансов

## URLs

- `/` — стартовый экран
- `/sobriety` — календарь трезвости
- `/finance` — финансовый менеджер

## Деплой

- GitHub: `github.com/elkungurov/life-tracker`
- Render: авто-деплой из `main`
- Start command: `gunicorn server:app`
- Port: `$PORT` (5002 локально)

## Локальный запуск

```powershell
cd D:\life-tracker
python server.py
# http://localhost:5002
```
