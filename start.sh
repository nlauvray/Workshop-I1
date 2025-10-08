#!/bin/bash

python -m uvicorn app:app --reload &
npm start &
