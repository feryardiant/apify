module.exports = {
  albums: {
    data: [{
        id: 1,
        users_id: 1,
        name: 'Foo Bar'
      },
      {
        id: 2,
        users_id: 2,
        name: 'Bar Baz'
      }
    ],
    resource: 'albums',
    primary: 'id',
    attributes: {
      users_id: {
        key: 'users_id',
        label: 'Users',
        sortable: true,
        visible: true,
        type: 'number'
      },
      id: {
        key: 'id',
        label: 'ID',
        sortable: true,
        visible: true,
        type: 'number',
        primary: true
      },
      name: {
        key: 'name',
        label: 'Name',
        sortable: true,
        visible: true,
        type: 'text'
      }
    },
    relations: [{
        parent: 'users',
        related: 'users_id'
      },
      {
        child: 'images',
        related: 'albums_id'
      }
    ],
    update_timestamp: false,
    create_timestamp: false,
    softdeletes: false,
    timestamps: false
  },
  users: {
    data: [{
      name: 'John Doe',
      id: 1
    }, {
      name: 'Jane Doe',
      id: 2
    }],
    resource: 'users',
    primary: 'id',
    attributes: {
      name: {
        key: 'name',
        label: 'Name',
        sortable: true,
        visible: true,
        type: 'text'
      },
      id: {
        key: 'id',
        label: 'ID',
        sortable: true,
        visible: true,
        type: 'number',
        primary: true
      }
    },
    relations: [{
      child: 'albums',
      related: 'users_id'
    }],
    update_timestamp: false,
    create_timestamp: false,
    softdeletes: false,
    timestamps: false
  },
  images: {
    data: [{
        url: 'example.com/image.jpg',
        id: 1,
        albums_id: 1
      },
      {
        url: 'example.com/image.jpg',
        id: 2,
        albums_id: 1
      },
      {
        url: 'example.com/image.jpg',
        id: 3,
        albums_id: 2
      },
      {
        url: 'example.com/image.jpg',
        id: 4,
        albums_id: 2
      },
      {
        url: 'example.com/image.jpg',
        id: 5,
        albums_id: 2
      }
    ],
    resource: 'images',
    primary: 'id',
    attributes: {
      url: {
        key: 'url',
        label: 'Url',
        sortable: true,
        visible: true,
        type: 'text'
      },
      id: {
        key: 'id',
        label: 'ID',
        sortable: true,
        visible: true,
        type: 'number',
        primary: true
      },
      albums_id: {
        key: 'albums_id',
        label: 'Albums',
        sortable: true,
        visible: true,
        type: 'number'
      }
    },
    relations: [{
      parent: 'albums',
      related: 'albums_id'
    }],
    update_timestamp: false,
    create_timestamp: false,
    softdeletes: false,
    timestamps: false
  }
}
