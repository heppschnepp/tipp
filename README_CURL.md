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
