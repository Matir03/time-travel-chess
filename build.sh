#!/bin/sh
cd frontend
npm install
npm run dev
cd ../server
npm install
npm run build