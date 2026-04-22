from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, Depends, HTTPException
from jose import JWTError
from pydantic import ValidationError
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.core.security import decode_token
from app.api.deps import get_ws_manager
from app.services.websocket.manager import ConnectionManager
from app.services.websocket.dispatcher import WebSocketDispatcher
from app.schemas.websocket import WSMessageIn
from app.services.websocket.connection import FastAPIWebSocketConnection

router = APIRouter()

async def get_ws_user(token: str) -> str | None:
    """Validate Token for Websockets"""
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id: str = payload.get("sub")
        return user_id
    except JWTError:
        return None

@router.websocket("/")
async def websocket_endpoint(
    websocket: WebSocket, 
    manager: ConnectionManager = Depends(get_ws_manager)
):
    """
    Central Entrypoint for Websocket Connections.
    Delegates message routing to WebSocketDispatcher.
    Adapts FastAPI WebSockets to IConnection.
    """
    client_ip = websocket.client.host if websocket.client else "unknown"
    try:
        await enforce_rate_limit(
            key=f"ratelimit:ws:connect:{client_ip}",
            max_requests=settings.WS_CONNECT_RATE_LIMIT_MAX_REQUESTS,
            window_seconds=settings.WS_CONNECT_RATE_LIMIT_WINDOW_SECONDS,
            detail="Too many websocket connection attempts.",
        )
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    auth_header = websocket.headers.get("authorization", "")
    # Explicitly reject query-string token transport to avoid URL leakage.
    if websocket.query_params.get("token"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    token = auth_header[7:] if auth_header.lower().startswith("bearer ") else ""
    user_id = await get_ws_user(token)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    await websocket.accept()
        
    # Inject FastAPI framework specific socket into our agnostic wrapper adapter
    connection = FastAPIWebSocketConnection(websocket)
    manager.connect(connection, user_id)
    dispatcher = WebSocketDispatcher(manager)
    
    try:
        while True:
            # Pydantic is very performant here, validating the JSON input implicitly via raw dict ingestion
            data = await websocket.receive_json()
            
            try:
                message = WSMessageIn(**data)
                await dispatcher.dispatch(connection, message)
            except ValidationError as ve:
                await manager.send_error(connection, f"Invalid message format. Required: 'action'. {ve.errors()}")
                
    except WebSocketDisconnect:
        await manager.disconnect(connection)

