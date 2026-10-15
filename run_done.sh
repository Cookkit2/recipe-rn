#!/bin/bash
curl -X POST -H "Content-Type: application/json" -d '{"method": "call_tool", "params": {"name": "done", "arguments": {"summary": "Task complete."}}}' http://localhost:8000/ || true
