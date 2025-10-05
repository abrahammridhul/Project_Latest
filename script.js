// script.js — handles alerts, weather fetch (OpenWeatherMap), and shared UI
const ALERTS_KEY = 'floodsafe_alerts_v1'

function loadAlerts(){
  try{
    const raw = localStorage.getItem(ALERTS_KEY)
    return raw?JSON.parse(raw):[]
  }catch(e){console.error('Failed to parse alerts',e);return[]}
}

function saveAlerts(list){
  localStorage.setItem(ALERTS_KEY,JSON.stringify(list))
}

function renderAlerts(containerId){
  const container = document.getElementById(containerId)
  if(!container) return
  const list = loadAlerts()
  container.innerHTML = ''
  if(list.length===0){ container.innerHTML = '<p>No alerts reported.</p>'; return }
  list.slice().reverse().forEach(a=>{
    const div = document.createElement('div')
    div.className = 'alert-item '+(a.severity||'low')
    div.innerHTML = `<strong>${escapeHtml(a.title)}</strong>
      <div class="meta">${escapeHtml(a.location||'')} • ${new Date(a.ts).toLocaleString()}</div>
      <p>${escapeHtml(a.desc)}</p>`
    container.appendChild(div)
  })
}

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]))
}

// Hook up alert form on index.html
document.addEventListener('DOMContentLoaded',()=>{
  const form = document.getElementById('alertForm')
  if(form){
    form.addEventListener('submit',e=>{
      e.preventDefault()
      const title = document.getElementById('alertTitle').value.trim()
      const desc = document.getElementById('alertDesc').value.trim()
      const location = document.getElementById('alertLocation').value.trim()
      const severity = document.getElementById('alertSeverity').value
      if(!title||!desc){ alert('Please provide title and description'); return }
      const list = loadAlerts()
      list.push({title,desc,location,severity,ts:Date.now()})
      saveAlerts(list)
      renderAlerts('alertsList')
      form.reset()
    })
  }

  const clearBtn = document.getElementById('clearAlerts')
  if(clearBtn){ clearBtn.addEventListener('click', ()=>{ if(confirm('Clear all alerts?')){ localStorage.removeItem(ALERTS_KEY); renderAlerts('alertsList'); } }) }

  // Render alerts on pages that show them
  renderAlerts('alertsList')
  renderAlerts('floodAlerts')

  // Weather page actions
  const getWeatherBtn = document.getElementById('getWeather')
  if(getWeatherBtn){
    getWeatherBtn.addEventListener('click', async ()=>{
      const key = document.getElementById('owmKey').value.trim()
      const city = document.getElementById('cityInput').value.trim() || 'London'
      const target = document.getElementById('weatherResult')
      target.innerHTML = '<p>Loading…</p>'
      if(!key){
        target.innerHTML = '<p>No API key provided. Enter an OpenWeatherMap API key to fetch live data.</p>'
        return
      }
      try{
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${encodeURIComponent(key)}`
        const res = await fetch(url)
        if(!res.ok) throw new Error('Network response not ok: '+res.status)
        const data = await res.json()
        // Format weather icon URL
        const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
        const feelsLike = Math.round(data.main.feels_like)
        const temp = Math.round(data.main.temp)
        
        target.innerHTML = `
          <div class="weather-main">
            <img src="${iconUrl}" alt="${escapeHtml(data.weather[0].description)}" class="weather-icon" />
            <h3>${escapeHtml(data.name)} — ${escapeHtml(data.weather[0].description)}</h3>
            <div class="temp-large">${temp}°C</div>
            <p class="feels-like">Feels like: ${feelsLike}°C</p>
          </div>
          <div class="weather-grid">
            <div class="weather-item">
              <strong>Humidity</strong>
              <span>${data.main.humidity}%</span>
            </div>
            <div class="weather-item">
              <strong>Wind</strong>
              <span>${data.wind.speed} m/s</span>
            </div>
            <div class="weather-item">
              <strong>Pressure</strong>
              <span>${data.main.pressure} hPa</span>
            </div>
            ${data.rain ? `
            <div class="weather-item warning">
              <strong>Rain (1h)</strong>
              <span>${data.rain['1h']} mm</span>
            </div>` : ''}
          </div>`
        
        // Show weather details section
        document.querySelector('.weather-details').style.display = 'block'
      }catch(err){
        console.error(err)
        target.innerHTML = '<p>Failed to fetch weather. Check API key, network, and city name.</p>'
      }
    })
  }

  // Location handling and risk assessment
  const riskForm = document.getElementById('riskForm')
  if(riskForm) {
    let map, marker;
    let currentLocation = null;

    // Initialize Google Maps
    function initializeMap() {
      if (!document.getElementById('map')) return;
      
      // Default center (can be changed)
      const defaultCenter = { lat: 20, lng: 0 };
      
      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 2,
        center: defaultCenter,
        styles: [
          {
            "elementType": "geometry",
            "stylers": [{"color": "#011e29"}]
          },
          {
            "elementType": "labels.text.stroke",
            "stylers": [{"color": "#001219"}]
          },
          {
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#e0f7fa"}]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{"color": "#00b4d8"}]
          },
          {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{"color": "#003549"}]
          },
          {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#98a5cf"}]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true
      });

      // Click handler for map
      map.addListener('click', (e) => {
        setLocation(e.latLng);
      });
    }

    // Handle location selection
    function setLocation(latLng) {
      if (marker) {
        marker.setMap(null);
      }

      marker = new google.maps.Marker({
        position: latLng,
        map: map,
        animation: google.maps.Animation.DROP
      });

      currentLocation = latLng;
      
      // Update hidden inputs
      document.getElementById('latitude').value = latLng.lat();
      document.getElementById('longitude').value = latLng.lng();

      // Show selected location
      const locationDisplay = document.getElementById('locationDisplay');
      const selectedLocation = document.getElementById('selectedLocation');
      
      // Reverse geocode to get address
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results[0]) {
          locationDisplay.textContent = results[0].formatted_address;
          selectedLocation.style.display = 'block';
        }
      });
    }

    // Get current location button handler
    const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
    if (getCurrentLocationBtn) {
      getCurrentLocationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
          getCurrentLocationBtn.textContent = 'Getting location...';
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const latLng = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              map.setZoom(15);
              map.setCenter(latLng);
              setLocation(latLng);
              getCurrentLocationBtn.textContent = '📍 Use My Current Location';
            },
            (error) => {
              alert('Error getting your location: ' + error.message);
              getCurrentLocationBtn.textContent = '📍 Use My Current Location';
            }
          );
        } else {
          alert('Geolocation is not supported by your browser');
        }
      });
    }

    // Form submission
    riskForm.addEventListener('submit', e => {
      e.preventDefault()
      
      // Get location data
      const street = document.getElementById('street').value.trim()
      const city = document.getElementById('city').value.trim()
      const state = document.getElementById('state').value.trim()
      const country = document.getElementById('country').value.trim()
      const lat = document.getElementById('latitude').value
      const lng = document.getElementById('longitude').value
      
      // Calculate risk score
      let riskScore = 0
      
      // Elevation impact
      if(elevation === 'low') riskScore += 3
      else if(elevation === 'medium') riskScore += 2
      
      // Water distance impact
      if(waterDistance === 'very-close') riskScore += 3
      else if(waterDistance === 'close') riskScore += 2
      
      // Drainage impact
      if(drainage === 'poor') riskScore += 3
      else if(drainage === 'average') riskScore += 1
      
      // History impact
      if(history === 'frequent') riskScore += 3
      else if(history === 'occasional') riskScore += 2
      
      // Determine risk level
      let riskLevel, riskClass, riskColor
      if(riskScore >= 8) {
        riskLevel = 'High Risk'
        riskClass = 'high-risk'
        riskColor = 'var(--danger)'
      } else if(riskScore >= 5) {
        riskLevel = 'Medium Risk'
        riskClass = 'medium-risk'
        riskColor = 'var(--warning)'
      } else {
        riskLevel = 'Low Risk'
        riskClass = 'low-risk'
        riskColor = 'var(--success)'
      }
      
      // Display result
      const resultDiv = document.getElementById('riskResult')
      resultDiv.className = `risk-result ${riskClass}`
      resultDiv.innerHTML = `
        <h3 style="color: ${riskColor}; margin-top: 0;">${riskLevel}</h3>
        <p><strong>Risk Assessment Score:</strong> ${riskScore}/12</p>
        <p><strong>Key Factors:</strong></p>
        <ul>
          ${elevation === 'low' ? '<li>Your area\'s low elevation increases flood risk</li>' : ''}
          ${waterDistance === 'very-close' ? '<li>Close proximity to water body is a significant risk factor</li>' : ''}
          ${drainage === 'poor' ? '<li>Poor drainage system increases vulnerability</li>' : ''}
          ${history === 'frequent' ? '<li>History of frequent flooding indicates high risk</li>' : ''}
        </ul>
        ${notes ? `<p><strong>Additional Notes:</strong> ${escapeHtml(notes)}</p>` : ''}
        <p class="risk-advice">
          ${riskScore >= 8 ? 
            'Immediate action recommended. Consider flood protection measures and stay alert to weather warnings.' :
            riskScore >= 5 ?
            'Monitor weather conditions closely and have an emergency plan ready.' :
            'Your area appears to be at lower risk, but staying prepared is still important.'}
        </p>
      `
      resultDiv.style.display = 'block'
    })
  }

})


// Mobile Navigation Functionality
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileCloseBtn = document.getElementById('mobileCloseBtn');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavLinks = mobileNav.querySelectorAll('a');
  
  // Open mobile menu
  mobileMenuBtn.addEventListener('click', function() {
    mobileNav.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  });
  
  // Close mobile menu
  mobileCloseBtn.addEventListener('click', function() {
    mobileNav.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  });
  
  // Close mobile menu when clicking on links
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', function() {
      mobileNav.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
      
      // Update active state
      mobileNavLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      
      // Also update desktop nav active state
      const desktopLinks = document.querySelectorAll('.desktop-nav a');
      desktopLinks.forEach(l => l.classList.remove('active'));
      const correspondingDesktopLink = document.querySelector(`.desktop-nav a[href="${this.getAttribute('href')}"]`);
      if (correspondingDesktopLink) {
        correspondingDesktopLink.classList.add('active');
      }
    });
  });
  
  // Close mobile menu when pressing Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
      mobileNav.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
    }
  });
  
  // Close mobile menu when clicking outside
  mobileNav.addEventListener('click', function(e) {
    if (e.target === mobileNav) {
      mobileNav.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
    }
  });
});