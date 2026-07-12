Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd simulation; .venv\Scripts\activate; uvicorn src.app:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; go run ./cmd/server/main.go"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
