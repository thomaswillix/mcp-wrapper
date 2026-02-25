# MCP WebSocket ↔ Streamable HTTP Wrapper

Puente liviano que expone un **WebSocket** y reenvía cada mensaje JSON-RPC al servidor MCP destino usando **HTTP Streaming (SSE)**, devolviendo las respuestas al cliente WS.

```
Cliente WS  ──ws://localhost:<PORT>/mcp──►  Wrapper  ──POST (SSE)──►  MCP Server
```

---

## ¿Para qué sirve?

Algunos clientes MCP (por ejemplo tests con **Karate**) solo soportan transporte WebSocket, pero muchos servidores MCP modernos exponen un endpoint HTTP con streaming (`text/event-stream`). Este wrapper hace de traductor entre ambos protocolos sin modificar ninguno de los dos extremos.

También expone endpoints HTTP de control (`/__health`, `/__shutdown`) útiles para gestionar el ciclo de vida del proceso desde herramientas de build como **Maven**.

---

## Requisitos

- Node.js **18+** (necesario para `fetch` nativo y `ReadableStream`)
- Dependencia: [`ws`](https://www.npmjs.com/package/ws)

```bash
npm install ws
```

---

## Uso

```bash
node wrapper.js [opciones]
```

### Opciones

| Variable de entorno   | Argumento CLI          | Default                       | Descripción                         |
|-----------------------|------------------------|-------------------------------|-------------------------------------|
| `WRAPPER_WS_PORT`     | `--wsPort=<puerto>`    | `9001`                        | Puerto en el que escucha el wrapper |
| `WRAPPER_TARGET_URL`  | `--target=<url>`       | `http://localhost:8000/mcp`   | URL del servidor MCP destino        |
| `WRAPPER_LOG`         | `--log`                | desactivado                   | Activa logs detallados en consola   |

### Ejemplos

```bash
# Configuración por defecto
node wrapper.js

# Puerto personalizado y target remoto
node wrapper.js --wsPort=9090 --target=http://mi-servidor:8080/mcp

# Con variables de entorno y logs
WRAPPER_WS_PORT=9090 WRAPPER_TARGET_URL=http://mi-servidor:8080/mcp WRAPPER_LOG=true node wrapper.js
```

---

## Endpoints

### WebSocket

| URL | Descripción |
|-----|-------------|
| `ws://localhost:<PORT>/mcp` | Recibe mensajes JSON-RPC y devuelve las respuestas del servidor MCP |

### HTTP

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/__health` | Devuelve estado del wrapper (`{ ok, target, wsPort }`) |
| `POST` | `/__shutdown` | Apaga el wrapper de forma ordenada (`{ shuttingDown: true }`) |

---

## Cómo funciona

1. El cliente envía un mensaje JSON-RPC por WebSocket a `/mcp`.
2. El wrapper hace un `POST` al servidor MCP destino con `Accept: text/event-stream`.
3. Lee el stream SSE y por cada línea `data:` reenvía el payload al cliente WS.
4. Los errores se capturan y se devuelven al cliente como respuestas JSON-RPC de error.

---

## Integración con Maven

Desde Maven (o cualquier herramienta de build) puedes controlar el ciclo de vida del wrapper usando los endpoints HTTP:

```bash
# Verificar que el wrapper está listo
curl http://localhost:9001/__health

# Detener el wrapper al finalizar los tests
curl -X POST http://localhost:9001/__shutdown
```
