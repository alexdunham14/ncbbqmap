# Restaurant Photos

This directory contains photos for each BBQ restaurant on the map.

## Organization

Each restaurant should have its photos in a subdirectory named after the restaurant:

```
photos/
├── bums-restaurant/
│   ├── exterior.jpg
│   ├── interior.jpg
│   └── food.jpg
├── skylight-inn/
│   ├── building.jpg
│   ├── pit.jpg
│   └── barbecue.jpg
└── ...
```

## Photo Guidelines

- **Format**: JPEG preferred for photos
- **Size**: Resize to max 1200px wide for web optimization
- **File size**: Aim for 200-400KB per photo
- **Naming**: Use descriptive names like `exterior.jpg`, `interior.jpg`, `food.jpg`, `pit.jpg`

## Adding Photos to the Map

1. Upload photos to the appropriate restaurant subdirectory
2. Update the restaurant data in `app.js` to include photo references
3. Photos will automatically display in the gallery with lazy loading

## Example Photo Data Structure

```javascript
"photos": [
  {
    "url": "./photos/bums-restaurant/exterior.jpg",
    "caption": "Bum's Restaurant exterior",
    "alt": "Front view of Bum's Restaurant building"
  },
  {
    "url": "./photos/bums-restaurant/interior.jpg",
    "caption": "Interior dining area",
    "alt": "Inside Bum's Restaurant dining room"
  }
]
```