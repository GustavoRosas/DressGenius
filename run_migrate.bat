@echo off
C:\Users\User\.fly\bin\fly.exe ssh console --app dressgenius-api -C "php artisan migrate:fresh --force"
