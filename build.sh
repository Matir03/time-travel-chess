#!/bin/sh
cd frontend
npm install
npm run prod
cd ../server
npm install
npm run build