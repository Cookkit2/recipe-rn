#!/bin/bash
curl -X POST -H "Content-Type: application/json" -d '{"method": "done", "params": {"summary": "Task complete."}}' http://localhost:8000/done || true
