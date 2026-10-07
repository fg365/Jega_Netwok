JEGA PRINTING - PHP + MYSQL BACKEND

1. Copy this folder to:
   C:\wamp64\www\jega_printing\
   (or your WAMP www directory)

2. Start WAMP:
   Apache = green
   MySQL  = green

3. Open phpMyAdmin:
   http://localhost/phpmyadmin/

4. Import:
   database.sql

5. Open:
   http://localhost/jega_printing/

6. Default database connection in api/db.php:
   host = localhost
   user = root
   password = blank
   database = jega_printing

If your MySQL root password is not blank, edit api/db.php.

BACKEND API
GET    api/invoices.php
GET    api/invoices.php?invoice_no=INV-0001
GET    api/invoices.php?search=INV-0001
POST   api/invoices.php
DELETE api/invoices.php?invoice_no=INV-0001
GET    api/next_invoice.php

The invoice data is stored in MySQL tables:
- invoices
- invoice_items

IMPORTANT SECURITY NOTE
The existing admin login in the original frontend uses JavaScript credentials. That is NOT secure for a real public website because users can inspect the source. Before deploying publicly, move admin authentication to PHP sessions with hashed passwords.
