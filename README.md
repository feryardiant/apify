# APIfy
[![Travis CI](https://img.shields.io/travis/feryardiant/apify.svg?style=flat-square)](https://travis-ci.org/feryardiant/apify)

Zero-config fake REST API server.

## Getting Started

Create `db.json` file with some data

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
    ],
    "users": [
        {
            "id": 1,
            "title": "Foo Bar"
        }
    ]
}
```

Put that file into root directory of your public project on GitHub and visit:

```
http://apify.now.sh/:username/:reponame/:table
```

Which `:table` is wither `posts`, `albums` or `users` from your `db.json` file.

That's it 🍻

## Routing

**SOON**

## Credits

- @typicode/json-server

## License

MIT - [Fery Wardiyanto](https://github.com/feryardiant)