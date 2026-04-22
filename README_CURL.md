## create admin

``` curl
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"username":"admin","password":"geheimer"}'
```

## get token 

``` curl
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"geheimer"}'
```

## seed

``` curl
curl -X POST http://localhost:3001/api/admin/seed -H "Authorization: Bearer <the retrieved token here>"
```

## admin: get all users (admin only)

``` curl
curl -X GET http://localhost:3001/api/admin/users -H "Authorization: Bearer <admin token>"
```

## admin: reset user password (admin only)

``` curl
curl -X POST http://localhost:3001/api/admin/reset-password -H "Authorization: Bearer <admin token>" -H "Content-Type: application/json" -d '{"userId":2,"newPassword":"newpassword123"}'
```
