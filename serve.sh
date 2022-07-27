#!/bin/sh
cd frontend
npm run serve &
cd ../server
npm run serve &
wait