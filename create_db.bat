@echo off
C:\Users\User\.fly\bin\fly.exe ssh console --app dressgenius-db-v2 -C "psql -p 5433 -U postgres -c 'CREATE DATABASE dressgenius_api'"
