@echo off
echo Testing API connection...
curl http://localhost:8000/

echo.
echo Testing hybrid search...
curl -X POST "http://localhost:8000/api/knowledge/search" -H "Content-Type: application/json" -H "X-API-Key: 90b7b93d-d636-444b-bf9-c095328be0fb" -d "{\"query\":\"customer support\"}"

echo.
echo Testing chatbot with enhanced knowledge...
curl -X POST "http://localhost:8000/api/chatbot/message" -H "Content-Type: application/json" -H "X-API-Key: 90b7b93d-d636-444b-bf9-c095328be0fb" -d "{\"message\":\"How do I contact support?\"}"