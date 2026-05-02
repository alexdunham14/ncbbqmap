// NC BBQ Map Application
class NCBBQMap {
    constructor() {
        this.map = null;
        this.restaurants = [];
        this.markers = [];
        this.currentRestaurant = null;

        this.init();
    }

    async init() {
        try {
            await this.loadRestaurants();
            this.initializeMap();
            this.addMarkersToMap();
            this.setupEventListeners();
            console.log('NC BBQ Map initialized successfully');
        } catch (error) {
            console.error('Error initializing NC BBQ Map:', error);
        }
    }

    async loadRestaurants() {
        const response = await fetch('./restaurants.json', { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Failed to load restaurants.json: ${response.status}`);
        }
        this.restaurants = await response.json();
    }

    initializeMap() {
        // Center map on North Carolina
        const ncCenter = [35.7796, -78.6382];

        // Initialize Leaflet map
        this.map = L.map('map', {
            center: ncCenter,
            zoom: 7,
            maxZoom: 18,
            minZoom: 6,
            scrollWheelZoom: false // Disable by default
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Configure scroll handling for desktop and mobile
        this.configureScrollHandling();

        // Add map controls
        this.map.on('zoomend', () => {
            this.updateMarkerSizes();
        });
    }

    configureScrollHandling() {
        // Handle touch scrolling for mobile (two-finger scrolling)
        let touchCount = 0;

        this.map.getContainer().addEventListener('touchstart', (e) => {
            touchCount = e.touches.length;
            if (touchCount === 2) {
                this.map.scrollWheelZoom.enable();
                this.map.dragging.enable();
            } else if (touchCount === 1) {
                this.map.scrollWheelZoom.disable();
                this.map.dragging.disable();
            }
        });

        this.map.getContainer().addEventListener('touchend', (e) => {
            touchCount = e.touches.length;
            if (touchCount < 2) {
                this.map.scrollWheelZoom.disable();
                this.map.dragging.disable();
            }
        });

        this.map.getContainer().addEventListener('touchmove', (e) => {
            touchCount = e.touches.length;
            if (touchCount === 2) {
                this.map.scrollWheelZoom.enable();
                this.map.dragging.enable();
            } else if (touchCount === 1) {
                this.map.scrollWheelZoom.disable();
                this.map.dragging.disable();
            }
        });

        // Disable single-finger interaction on mobile devices
        if (window.innerWidth <= 768) {
            this.map.scrollWheelZoom.disable();
            this.map.dragging.disable();
        }

        // Handle desktop scrolling (Ctrl+scroll)
        let isDesktop = window.innerWidth > 768;
        if (isDesktop) {
            this.map.scrollWheelZoom.disable();

            this.map.getContainer().addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    // Allow zoom with Ctrl+scroll (or Cmd+scroll on Mac)
                    this.map.scrollWheelZoom.enable();
                } else {
                    this.map.scrollWheelZoom.disable();
                }
            });
        }

        // Update instructions and re-check on resize
        this.updateScrollInstructions();

        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.updateScrollInstructions();
                const nowDesktop = window.innerWidth > 768;
                if (nowDesktop !== isDesktop) {
                    isDesktop = nowDesktop;
                    // Reset interaction based on device type
                    this.map.scrollWheelZoom.disable();
                    if (!nowDesktop) {
                        // If switching to mobile, disable dragging
                        this.map.dragging.disable();
                    } else {
                        // If switching to desktop, enable dragging
                        this.map.dragging.enable();
                    }
                }
            }, 100);
        });
    }

    updateScrollInstructions() {
        const instructionsEl = document.querySelector('.map-instructions p');
        if (window.innerWidth <= 768) {
            instructionsEl.textContent = 'Use two fingers to scroll and zoom';
        } else {
            instructionsEl.textContent = 'Hold ctrl and scroll to zoom';
        }
    }

    addMarkersToMap() {
        // Create marker cluster group with custom options
        this.markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 30, // Distance in pixels to cluster markers
            iconCreateFunction: (cluster) => this.createClusterIcon(cluster),
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            disableClusteringAtZoom: 12 // Stop clustering when zoomed in close
        });

        this.restaurants.forEach(restaurant => {
            if (restaurant.lat && restaurant.lng) {
                const marker = this.createMarker(restaurant);
                if (marker) {
                    this.markerClusterGroup.addLayer(marker);
                }
            }
        });

        // Add the cluster group to the map
        this.map.addLayer(this.markerClusterGroup);

        // Fit map to show all markers with tighter bounds for closer zoom
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.05), {
                maxZoom: 9 // Prevent zooming in too close when there are few markers
            });
        }
    }

    createMarker(restaurant) {
        // Create simple colored marker
        let markerColor = '#F39C12'; // Eastern (orange)
        if (restaurant.style.toLowerCase() === 'piedmont') {
            markerColor = '#E74C3C'; // Piedmont (red)
        }
        if (restaurant.status === 'closed') {
            markerColor = '#666'; // Closed (gray)
        }

        // Create custom icon with inline styles
        const customIcon = L.divIcon({
            className: 'simple-marker',
            iconSize: [25, 25],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
            html: `<div style="
                width: 25px;
                height: 25px;
                background-color: ${markerColor};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                opacity: ${restaurant.status === 'closed' ? '0.6' : '1'};
                cursor: pointer;
                transition: transform 0.2s;
            "></div>`
        });

        // Create marker (don't add to map directly - will be added to cluster group)
        const marker = L.marker([restaurant.lat, restaurant.lng], { icon: customIcon });

        // Create popup content
        const popupContent = this.createPopupContent(restaurant);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        // Marker click only opens popup (no auto-scroll to details)

        // Store reference
        marker.restaurantData = restaurant;
        this.markers.push(marker);

        return marker;
    }

    createClusterIcon(cluster) {
        const markers = cluster.getAllChildMarkers();
        const count = markers.length;

        // Count Eastern vs Piedmont restaurants in cluster
        let easternCount = 0;
        let piedmontCount = 0;

        markers.forEach(marker => {
            const restaurant = marker.restaurantData;
            if (restaurant && restaurant.style) {
                if (restaurant.style.toLowerCase() === 'eastern') {
                    easternCount++;
                } else {
                    piedmontCount++;
                }
            }
        });

        // Determine cluster color based on majority
        let clusterColor = '#2d2d2d'; // Default neutral
        if (easternCount > piedmontCount) {
            clusterColor = '#F39C12'; // Eastern orange
        } else if (piedmontCount > easternCount) {
            clusterColor = '#E74C3C'; // Piedmont red
        }

        // Size cluster based on count
        let size = 40;
        if (count >= 10) size = 60;
        else if (count >= 5) size = 50;

        return L.divIcon({
            className: 'custom-cluster-icon',
            html: `<div style="
                background-color: ${clusterColor};
                border: 3px solid white;
                border-radius: 50%;
                width: ${size}px;
                height: ${size}px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: ${size > 50 ? '16px' : '14px'};
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                cursor: pointer;
                transition: transform 0.2s;
            ">${count}</div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });
    }

    createPopupContent(restaurant) {
        const statusText = restaurant.status === 'closed' ? ' (CLOSED)' : '';
        const styleText = restaurant.style === 'Eastern' ? 'Eastern Style' : 'Piedmont Style';

        return `
            <div class="popup-content">
                <h3>${restaurant.name}${statusText}</h3>
                <p><strong>${restaurant.city}</strong></p>
                <p>${styleText}</p>
                <p>${restaurant.address}</p>
                <button class="view-photos-btn" onclick="ncbbqMap.showRestaurantDetails(${restaurant.id}, true)">
                    View Details & Photos
                </button>
            </div>
        `;
    }

    showRestaurantDetails(restaurantId, shouldScroll = true) {
        const restaurant = typeof restaurantId === 'object' ? restaurantId :
                          this.restaurants.find(r => r.id === restaurantId);

        if (!restaurant) return;

        this.currentRestaurant = restaurant;

        // Update details section
        document.getElementById('restaurant-name').textContent = restaurant.name;
        document.getElementById('restaurant-address').innerHTML = `<strong>Address:</strong> ${restaurant.address}`;
        document.getElementById('restaurant-phone').innerHTML = '';
        document.getElementById('restaurant-hours').innerHTML = '';
        document.getElementById('restaurant-style').innerHTML =
            `<strong>Style:</strong> ${restaurant.style}`;

        // Update description
        const descriptionEl = document.getElementById('restaurant-description');
        if (restaurant.description && restaurant.description.trim()) {
            descriptionEl.innerHTML = `<p>${restaurant.description}</p>`;
            descriptionEl.style.display = 'block';
        } else {
            descriptionEl.style.display = 'none';
        }

        // Update photo gallery
        this.updatePhotoGallery(restaurant);

        // Show details section
        document.getElementById('restaurant-details').classList.remove('hidden');

        // Only scroll to details section if requested (from button click)
        if (shouldScroll) {
            document.getElementById('restaurant-details').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    updatePhotoGallery(restaurant) {
        const gallery = document.getElementById('photo-gallery');

        if (restaurant.photos && restaurant.photos.length > 0) {
            gallery.innerHTML = restaurant.photos.map((photo, index) => {
                const sourceHtml = photo.source && photo.source.url && photo.source.name
                    ? `<div class="photo-source">Source: <a href="${photo.source.url}" target="_blank" rel="noopener">${photo.source.name}</a></div>`
                    : '';

                return `
                    <div class="photo-container">
                        <div class="photo-item">
                            <img
                                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3ELoading...%3C/text%3E%3C/svg%3E"
                                data-src="${photo.url}"
                                alt="${photo.alt || photo.caption || restaurant.name}"
                                class="lazy-load"
                                loading="lazy"
                                onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'150\\'%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' fill=\\'%23f5f5f5\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\' font-size=\\'12\\'%3EPhoto unavailable%3C/text%3E%3C/svg%3E';"
                            >
                            ${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
                        </div>
                        ${sourceHtml}
                    </div>
                `;
            }).join('');

            // Initialize lazy loading for new images
            this.initializeLazyLoading();
        } else {
            gallery.innerHTML = `
                <div class="no-photos">
                    <p>Photos coming as soon as we get over there again!</p>
                </div>
            `;
        }
    }

    openPhotoModal(imageUrl, caption) {
        const modal = document.getElementById('photo-modal');
        const modalImg = document.getElementById('modal-image');
        const modalCaption = document.getElementById('modal-caption');

        modalImg.src = imageUrl;
        modalCaption.textContent = caption;
        modal.classList.remove('hidden');

        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }

    closePhotoModal() {
        const modal = document.getElementById('photo-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    closeRestaurantDetails() {
        document.getElementById('restaurant-details').classList.add('hidden');
        this.currentRestaurant = null;
    }

    updateMarkerSizes() {
        const zoom = this.map.getZoom();
        const size = Math.max(20, Math.min(40, zoom * 3));

        this.markers.forEach(marker => {
            const icon = marker.options.icon;
            icon.options.iconSize = [size, size];
            icon.options.iconAnchor = [size/2, size/2];
            marker.setIcon(icon);
        });
    }

    setupEventListeners() {
        // Modal close button
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closePhotoModal();
        });

        // Close modal when clicking outside image
        document.getElementById('photo-modal').addEventListener('click', (e) => {
            if (e.target.id === 'photo-modal') {
                this.closePhotoModal();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!document.getElementById('photo-modal').classList.contains('hidden')) {
                    this.closePhotoModal();
                }
            }
        });

        // Responsive map resize
        window.addEventListener('resize', () => {
            if (this.map) {
                this.map.invalidateSize();
                this.updateScrollInstructions();
            }
        });
    }

    // Initialize lazy loading for images
    initializeLazyLoading() {
        const lazyImages = document.querySelectorAll('.lazy-load');

        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');

                        if (src) {
                            img.src = src;
                            img.classList.remove('lazy-load');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            lazyImages.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.classList.remove('lazy-load');
                }
            });
        }
    }

    // Zoom to a specific restaurant from footer links
    zoomToRestaurant(id) {
        const restaurant = this.restaurants.find(r => r.id === id);
        if (!restaurant) return;

        // Scroll to map first
        document.getElementById('map').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Wait for scroll to complete, then zoom
        setTimeout(() => {
            // Zoom to restaurant location
            this.map.setView([restaurant.lat, restaurant.lng], 14, {
                animate: true,
                duration: 1
            });

            // Find and open the marker popup
            this.markers.forEach(marker => {
                if (marker.restaurantData && marker.restaurantData.id === id) {
                    // Small delay to ensure zoom completes first
                    setTimeout(() => {
                        marker.openPopup();
                    }, 500);
                }
            });
        }, 100);
    }

    // Utility method for external calls
    getRestaurantById(id) {
        return this.restaurants.find(r => r.id === id);
    }

    // Method to search restaurants
    searchRestaurants(query) {
        const searchTerm = query.toLowerCase();
        return this.restaurants.filter(restaurant =>
            restaurant.name.toLowerCase().includes(searchTerm) ||
            restaurant.city.toLowerCase().includes(searchTerm) ||
            restaurant.style.toLowerCase().includes(searchTerm)
        );
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.ncbbqMap = new NCBBQMap();
});

// Add some additional CSS for the popup buttons via JavaScript
const style = document.createElement('style');
style.textContent = `
    .popup-content {
        text-align: center;
        padding: 0.5rem;
    }

    .popup-content h3 {
        margin: 0 0 0.5rem 0;
        color: #1a1a1a;
        font-size: 1.1rem;
    }

    .popup-content p {
        margin: 0.25rem 0;
        font-size: 0.9rem;
    }

    .view-photos-btn {
        background: #2d2d2d;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        margin-top: 0.5rem;
        transition: background-color 0.3s;
    }

    .view-photos-btn:hover {
        background: #E74C3C;
    }

    .leaflet-popup-content-wrapper {
        border-radius: 8px;
    }

    .leaflet-popup-tip {
        background: white;
    }
`;
document.head.appendChild(style);