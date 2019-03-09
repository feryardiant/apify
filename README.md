# Zero-config fake REST API server. [![Travis CI](https://img.shields.io/travis/feryardiant/apify.svg?style=flat-square)](https://travis-ci.org/feryardiant/apify)

Yet another fake REST API server based on my own needs. No config, no option, less foot-print, less dependencies and of course less functionalities, LOL. If you desire mor robust fake REST API server, pleace check typicode@json-server they've done greate job on that project tho.

Why don't I use that json-server project instead of create my own, if you ask? Because, why not. Obviously. :grin:

This project is aims to provide similar [response](https://laravel.com/docs/eloquent-resources) and [end-points structures](https://laravel.com/docs/controllers#resource-controllers) provided by laravel

## Limitations

- Since this project hosted on [zeit now](https://zeit.co/pricing) all the limitations of free plan are applied, including 1k invocation / day. So, if you find the project is down, that's might be exceed max invocation.

## Getting Started

Create `db.json` file with some data

```json
{
  "posts": [
      {
        "id": 1,
        "users": {
          "username": "john.doe",
          "email": "john.doe@example.com",
        },
        "title": "Foo Bar",
        "contents": "Lorem Ipsum ..."
      }
  ],
  "albums": [
    {
      "id": 1,
      "title": "Some Pictures",
      "images": [
        {
          "name": "http://lorempixel.com/640/480"
        },
        {
          "name": "http://lorempixel.com/640/480"
        }
      ]
    }
  ]
}
```

Put that file into root directory of your public project on GitHub and visit:

```
http://apify.now.sh/:username/:reponame/:table
```

The `:table` is either `posts`, `albums` or `users` from your `db.json` file.

That's it 🍻

## Response

As I've already mentioned above this project will have similar response object like Laravel does, which is it will wrapped as `data` and `meta`. No `links` for now. So, if you have example data above and you access `/:username/:reponame/albums` for instance, it will returns like this:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Some Pictures"
    },
    {
      "id": 2,
      "title": "Another Pictures"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 15,
    "total": 2,
    "primary": "id",
    "softDelete": true,
    "timestamps": true,
    "field": {
      "id": {
        "type": "number",
        "primary": true
      },
      "title": {
        "type": "text"
      }
    }
  },
}
```

The extra properties on `meta` object are simply because my recent front-end projects are using either [bootstrap-vue](https://bootstrap-vue.js.org/docs/components/table/#fields-column-definitions) or [buefy](https://buefy.org/documentation/table) so I think it would be useful if it has clear meta definition from response, so I don't have to re-parse them in client side.

**NOTE** Might be changed on future releases

## Routing

Example above will generate 4 end-points

- `/:username/:reponame/posts`
- `/:username/:reponame/albums` _based on `albums.images` array_
- `/:username/:reponame/users` _based on `posts.users` object_
- `/:username/:reponame/images`

Yes, we'll got extra end-points from  any `Array` or `Object` values, that means our example above will become something like this.

```json
{
  "posts": [
    {
      "id": 1,
      "users_id": 1,
      "title": "Foo Bar",
      "contents": "Lorem Ipsum ..."
    }
  ],
  "users": [
    {
      "id": 1,
      "username": "john.doe",
      "email": "john.doe@example.com",
    }
  ],
  "images": [
    {
      "id": 1,
      "albums_id": 1,
      "name": "http://lorempixel.com/640/480"
    },
    {
      "id": 2,
      "albums_id": 1,
      "name": "http://lorempixel.com/640/480"
    }
  ],
  "albums": [
    {
      "id": 1,
      "title": "Some Pictures"
    }
  ]
}
```

**NOTE:** Unfortunately the relationship functionality is not fully implemented (yet). :sweat_smile:

All end-points suppors `GET`, `POST`, `PUT` and `DELETE`, which is have (almost) the same structure as [laravel resouce controller](https://laravel.com/docs/controllers#resource-controllers). Excepts for `create` and `edit` actions, also no `PATCH`, `HEAD` or `OPTIONS` support yet. Because I don't personally need it, if you ask. :grin:

Also, you might noticed that we convert relation name as is, no plural and singular conversion (yet). So if you have data like this:

```json
{
  "people": {
    "id": 1,
    "name": "John Doe",
    "company": {
      "name": "Acme Inc."
    }
  }
}
```

Will become something like this:

```json
{
  "people": {
    "id": 1,
    "name": "John Doe",
    "company_id": 1
  },
  "company": {
    "id": 1,
    "name": "Acme Inc."
  }
}
```

I'll implement this later on, _if needed_

### Pagination

By default all returned data are paginated 15 data per page and we use `page` and `perPage` query string to do so. Example:

```
/albums?page=2
/albums?page=2&perPage=15
```

**NOTE** Might be changed on future releases

### Ordering

By default ordering is from on `id` field descending. You're free to change data ordering whatever you like using `orderBy` and `orderDirection` query string. Like this:

```
/albums?orderBy=updated_at
/albums?orderBy=updated_at&orderDirection=asc
```

**NOTE** Might be changed on future releases

### Filtering

**NOT IMPLEMENTED YET**

## Credits

- typicode@json-server

## License

MIT - [Fery Wardiyanto](https://github.com/feryardiant)