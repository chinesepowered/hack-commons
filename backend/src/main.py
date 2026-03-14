from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router
from src.api.x402_routes import router as x402_router
from src.core.events import event_bus

app = FastAPI(title="AgentCommerce", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(x402_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok"}
